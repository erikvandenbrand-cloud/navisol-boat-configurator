/**
 * Customer Offer Service - v325 (Sales Track)
 *
 * Generates and manages Customer Offer deliverables from Quotes.
 * Uses existing Quote system and Boat Model sales content.
 *
 * GOVERNANCE:
 * - Generation is explicit user action only
 * - No auto-regeneration when quote/model changes
 * - Regenerate action overwrites current draft (Option A - simplest)
 * - No background sync, no CRM workflows
 * - Production role cannot access this service
 */

import type {
  CustomerOffer,
  CustomerOfferBlock,
  CustomerOfferStatus,
  GenerateCustomerOfferInput,
  UpdateCustomerOfferBlockInput,
  EquipmentGroup,
  PricingSnapshot,
  CustomerOfferImage,
} from '@/domain/models/customer-offer';
import type { Project, ProjectQuote, QuoteLine } from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { BoatModelService, type BoatModel } from './BoatModelService';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { getAdapter } from '@/data/persistence';

// ============================================
// REPOSITORY
// ============================================

const OFFER_NAMESPACE = 'customer_offers';

const CustomerOfferRepository = {
  async getAll(): Promise<CustomerOffer[]> {
    const adapter = getAdapter();
    return adapter.getAll<CustomerOffer>(OFFER_NAMESPACE);
  },

  async getById(id: string): Promise<CustomerOffer | null> {
    const adapter = getAdapter();
    return adapter.getById<CustomerOffer>(OFFER_NAMESPACE, id);
  },

  async getByQuoteId(quoteId: string): Promise<CustomerOffer[]> {
    const all = await this.getAll();
    return all.filter(o => o.quoteId === quoteId);
  },

  async getByProjectId(projectId: string): Promise<CustomerOffer[]> {
    const all = await this.getAll();
    return all.filter(o => o.projectId === projectId);
  },

  async save(offer: CustomerOffer): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(OFFER_NAMESPACE, offer);
  },

  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(OFFER_NAMESPACE, id);
  },
};

// ============================================
// SERVICE
// ============================================

export const CustomerOfferService = {
  /**
   * Get all Customer Offers for a project
   */
  async getByProjectId(projectId: string): Promise<CustomerOffer[]> {
    return CustomerOfferRepository.getByProjectId(projectId);
  },

  /**
   * Get all Customer Offers for a quote
   */
  async getByQuoteId(quoteId: string): Promise<CustomerOffer[]> {
    return CustomerOfferRepository.getByQuoteId(quoteId);
  },

  /**
   * Get a Customer Offer by ID
   */
  async getById(id: string): Promise<CustomerOffer | null> {
    return CustomerOfferRepository.getById(id);
  },

  /**
   * Generate a new Customer Offer from a Quote.
   * This is an EXPLICIT user action - no auto-generation.
   *
   * The offer is composed of blocks:
   * 1. Cover (auto-generated from quote data)
   * 2. Model Intro (from selected Boat Model sales sections)
   * 3. Image Gallery (from selected Boat Model sales images)
   * 4. Equipment List (from quote lines, grouped by category)
   * 5. Pricing Summary (from quote totals - no recomputation)
   * 6. Terms (empty, user fills in)
   */
  async generate(
    input: GenerateCustomerOfferInput,
    context: AuditContext
  ): Promise<Result<CustomerOffer, string>> {
    // Load project and quote
    const project = await ProjectRepository.getById(input.projectId);
    if (!project) {
      return Err('Project not found');
    }

    const quote = project.quotes.find(q => q.id === input.quoteId);
    if (!quote) {
      return Err('Quote not found');
    }

    // Load client name
    const clients = await import('@/data/repositories').then(m => m.ClientRepository.getAll());
    const client = clients.find(c => c.id === project.clientId);
    const clientName = client?.name || 'Unknown Client';

    // Load Boat Model if referenced
    let boatModel: BoatModel | null = null;
    if (project.configuration.boatModelVersionId) {
      boatModel = await BoatModelService.getById(project.configuration.boatModelVersionId);
    }

    // Build blocks
    const blocks: CustomerOfferBlock[] = [];
    let sortOrder = 0;

    // 1. COVER block
    blocks.push({
      id: generateUUID(),
      type: 'COVER',
      heading: 'Customer Offer',
      content: `
**${boatModel?.name || 'Custom Configuration'}**

Prepared for: **${clientName}**

Quote Reference: ${quote.quoteNumber}
Date: ${new Date().toLocaleDateString('en-GB')}
Valid Until: ${new Date(quote.validUntil).toLocaleDateString('en-GB')}
      `.trim(),
      included: true,
      sortOrder: sortOrder++,
    });

    // 2. MODEL_INTRO block (from selected sales sections)
    if (boatModel?.salesSections && boatModel.salesSections.length > 0) {
      const selectedSections = input.includeSalesSectionIds
        ? boatModel.salesSections.filter(s => input.includeSalesSectionIds!.includes(s.id) && !s.archived)
        : boatModel.salesSections.filter(s => !s.archived);

      if (selectedSections.length > 0) {
        const introContent = selectedSections
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(s => `### ${s.heading}\n\n${s.bodyText}`)
          .join('\n\n');

        blocks.push({
          id: generateUUID(),
          type: 'MODEL_INTRO',
          heading: 'About the ' + (boatModel.name || 'Vessel'),
          content: introContent,
          included: true,
          sortOrder: sortOrder++,
        });
      }
    }

    // 3. IMAGE_GALLERY block (from selected sales images)
    if (boatModel?.salesImages && boatModel.salesImages.length > 0) {
      const selectedImages = input.includeSalesImageIds
        ? boatModel.salesImages.filter(img => input.includeSalesImageIds!.includes(img.id))
        : boatModel.salesImages;

      if (selectedImages.length > 0) {
        const images: CustomerOfferImage[] = selectedImages
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .filter(img => img.sourceUrl || img.fileRef)
          .map(img => ({
            id: img.id,
            url: img.sourceUrl || img.fileRef || '',
            caption: img.caption,
          }));

        blocks.push({
          id: generateUUID(),
          type: 'IMAGE_GALLERY',
          heading: 'Gallery',
          content: '', // Images are in the images array
          included: images.length > 0,
          sortOrder: sortOrder++,
          images,
        });
      }
    }

    // 4. EQUIPMENT_LIST block (from quote lines, grouped by category)
    if (input.includeEquipmentList !== false) {
      const equipmentGroups = this.groupQuoteLinesByCategory(quote.lines);
      blocks.push({
        id: generateUUID(),
        type: 'EQUIPMENT_LIST',
        heading: 'Standard Equipment & Options',
        content: '', // Equipment is in the equipmentGroups array
        included: true,
        sortOrder: sortOrder++,
        equipmentGroups,
      });
    }

    // 5. PRICING_SUMMARY block (from quote totals - NO recomputation)
    if (input.includePricingSummary !== false) {
      const pricingSnapshot: PricingSnapshot = {
        basePrice: boatModel?.basePrice || 0,
        optionsTotal: quote.subtotalExclVat - (boatModel?.basePrice || 0),
        subtotalExclVat: quote.subtotalExclVat,
        discountPercent: quote.discountPercent,
        discountAmount: quote.discountAmount,
        totalExclVat: quote.totalExclVat,
        vatRate: quote.vatRate,
        vatAmount: quote.vatAmount,
        totalInclVat: quote.totalInclVat,
      };

      blocks.push({
        id: generateUUID(),
        type: 'PRICING_SUMMARY',
        heading: 'Pricing Summary',
        content: this.formatPricingSummary(pricingSnapshot),
        included: true,
        sortOrder: sortOrder++,
        pricingSnapshot,
      });
    }

    // 6. TERMS block (empty by default, user fills in)
    blocks.push({
      id: generateUUID(),
      type: 'TERMS',
      heading: 'Terms & Conditions',
      content: input.termsText || '',
      included: true,
      sortOrder: sortOrder++,
    });

    // Create the offer
    const offer: CustomerOffer = {
      id: generateUUID(),
      quoteId: input.quoteId,
      projectId: input.projectId,
      status: 'DRAFT',
      boatModelId: boatModel?.id,
      boatModelName: boatModel?.name,
      clientName,
      quoteNumber: quote.quoteNumber,
      quoteVersion: quote.version,
      blocks,
      generatedAt: now(),
      generatedBy: context.userId,
      createdAt: now(),
    };

    await CustomerOfferRepository.save(offer);

    await AuditService.log(
      context,
      'CREATE',
      'CustomerOffer',
      offer.id,
      `Generated Customer Offer for quote ${quote.quoteNumber}`,
      { after: { quoteNumber: quote.quoteNumber, blockCount: blocks.length } }
    );

    return Ok(offer);
  },

  /**
   * Regenerate a Customer Offer (Option A: overwrite current draft).
   * Requires the offer to be in DRAFT status.
   */
  async regenerate(
    offerId: string,
    input: GenerateCustomerOfferInput,
    context: AuditContext
  ): Promise<Result<CustomerOffer, string>> {
    const existing = await CustomerOfferRepository.getById(offerId);
    if (!existing) {
      return Err('Customer Offer not found');
    }
    if (existing.status !== 'DRAFT') {
      return Err('Only DRAFT offers can be regenerated');
    }

    // Delete existing and regenerate
    await CustomerOfferRepository.delete(offerId);

    await AuditService.log(
      context,
      'DELETE',
      'CustomerOffer',
      offerId,
      'Deleted Customer Offer for regeneration'
    );

    // Generate new offer
    return this.generate(input, context);
  },

  /**
   * Update a block in the Customer Offer.
   * Only DRAFT offers can be updated.
   */
  async updateBlock(
    offerId: string,
    update: UpdateCustomerOfferBlockInput,
    context: AuditContext
  ): Promise<Result<CustomerOffer, string>> {
    const offer = await CustomerOfferRepository.getById(offerId);
    if (!offer) {
      return Err('Customer Offer not found');
    }
    if (offer.status !== 'DRAFT') {
      return Err('Only DRAFT offers can be edited');
    }

    const blockIndex = offer.blocks.findIndex(b => b.id === update.blockId);
    if (blockIndex === -1) {
      return Err('Block not found');
    }

    const updatedBlock = { ...offer.blocks[blockIndex] };
    if (update.heading !== undefined) updatedBlock.heading = update.heading;
    if (update.content !== undefined) updatedBlock.content = update.content;
    if (update.included !== undefined) updatedBlock.included = update.included;

    const updatedBlocks = [...offer.blocks];
    updatedBlocks[blockIndex] = updatedBlock;

    const updated: CustomerOffer = {
      ...offer,
      blocks: updatedBlocks,
      updatedAt: now(),
      updatedBy: context.userId,
    };

    await CustomerOfferRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'CustomerOffer',
      offerId,
      `Updated block in Customer Offer`,
      { after: { blockId: update.blockId, blockType: updatedBlock.type } }
    );

    return Ok(updated);
  },

  /**
   * Finalize a Customer Offer (mark as FINALIZED - immutable).
   */
  async finalize(
    offerId: string,
    context: AuditContext
  ): Promise<Result<CustomerOffer, string>> {
    const offer = await CustomerOfferRepository.getById(offerId);
    if (!offer) {
      return Err('Customer Offer not found');
    }
    if (offer.status !== 'DRAFT') {
      return Err('Only DRAFT offers can be finalized');
    }

    const finalized: CustomerOffer = {
      ...offer,
      status: 'FINALIZED',
      finalizedAt: now(),
      finalizedBy: context.userId,
    };

    await CustomerOfferRepository.save(finalized);

    await AuditService.log(
      context,
      'UPDATE',
      'CustomerOffer',
      offerId,
      'Finalized Customer Offer'
    );

    return Ok(finalized);
  },

  /**
   * Delete a Customer Offer.
   * Only DRAFT offers can be deleted.
   */
  async delete(
    offerId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const offer = await CustomerOfferRepository.getById(offerId);
    if (!offer) {
      return Err('Customer Offer not found');
    }
    if (offer.status !== 'DRAFT') {
      return Err('Only DRAFT offers can be deleted');
    }

    await CustomerOfferRepository.delete(offerId);

    await AuditService.log(
      context,
      'DELETE',
      'CustomerOffer',
      offerId,
      `Deleted Customer Offer for quote ${offer.quoteNumber}`
    );

    return Ok(undefined);
  },

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Group quote lines by category for equipment list
   */
  groupQuoteLinesByCategory(lines: QuoteLine[]): EquipmentGroup[] {
    const groups: Record<string, EquipmentGroup> = {};

    for (const line of lines) {
      const category = line.category || 'Other';
      if (!groups[category]) {
        groups[category] = { category, items: [] };
      }
      groups[category].items.push({
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
      });
    }

    return Object.values(groups).sort((a, b) => a.category.localeCompare(b.category));
  },

  /**
   * Format pricing summary as markdown text
   */
  formatPricingSummary(pricing: PricingSnapshot): string {
    const lines: string[] = [];

    if (pricing.basePrice > 0) {
      lines.push(`Base Price: €${pricing.basePrice.toLocaleString()}`);
    }
    if (pricing.optionsTotal > 0) {
      lines.push(`Options & Equipment: €${pricing.optionsTotal.toLocaleString()}`);
    }
    lines.push(`**Subtotal (excl. VAT):** €${pricing.subtotalExclVat.toLocaleString()}`);

    if (pricing.discountPercent && pricing.discountAmount) {
      lines.push(`Discount (${pricing.discountPercent}%): -€${pricing.discountAmount.toLocaleString()}`);
    }

    lines.push(`**Total (excl. VAT):** €${pricing.totalExclVat.toLocaleString()}`);
    lines.push(`VAT (${pricing.vatRate}%): €${pricing.vatAmount.toLocaleString()}`);
    lines.push(`**Total (incl. VAT):** €${pricing.totalInclVat.toLocaleString()}`);

    return lines.join('\n');
  },

  /**
   * Generate HTML preview of the Customer Offer
   */
  generateHtmlPreview(offer: CustomerOffer): string {
    const includedBlocks = offer.blocks.filter(b => b.included).sort((a, b) => a.sortOrder - b.sortOrder);

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1e293b; }
    h1 { font-size: 28px; color: #0d9488; margin-bottom: 8px; }
    h2 { font-size: 20px; color: #334155; margin-top: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h3 { font-size: 16px; color: #475569; margin-top: 24px; }
    p { line-height: 1.6; color: #475569; }
    .cover { text-align: center; margin-bottom: 48px; padding-bottom: 48px; border-bottom: 2px solid #0d9488; }
    .cover h1 { font-size: 36px; }
    .gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
    .gallery img { width: 100%; height: 200px; object-fit: cover; border-radius: 8px; }
    .gallery .caption { text-align: center; font-size: 12px; color: #64748b; margin-top: 4px; }
    .equipment-group { margin: 16px 0; }
    .equipment-group h4 { font-size: 14px; color: #0d9488; margin-bottom: 8px; }
    .equipment-list { list-style: none; padding: 0; }
    .equipment-list li { padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .pricing { background: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0; }
    .pricing-line { display: flex; justify-content: space-between; padding: 8px 0; }
    .pricing-line.total { font-weight: bold; font-size: 18px; border-top: 2px solid #0d9488; margin-top: 8px; padding-top: 16px; }
    .terms { background: #fefce8; padding: 24px; border-radius: 8px; margin-top: 32px; }
    .terms h2 { margin-top: 0; border: none; }
  </style>
</head>
<body>
`;

    for (const block of includedBlocks) {
      switch (block.type) {
        case 'COVER':
          html += `<div class="cover"><h1>${block.heading}</h1><div>${this.markdownToHtml(block.content)}</div></div>`;
          break;
        case 'MODEL_INTRO':
          html += `<section><h2>${block.heading}</h2><div>${this.markdownToHtml(block.content)}</div></section>`;
          break;
        case 'IMAGE_GALLERY':
          html += `<section><h2>${block.heading}</h2><div class="gallery">`;
          for (const img of block.images || []) {
            html += `<div><img src="${img.url}" alt="${img.caption || ''}" onerror="this.style.display='none'"><div class="caption">${img.caption || ''}</div></div>`;
          }
          html += '</div></section>';
          break;
        case 'EQUIPMENT_LIST':
          html += `<section><h2>${block.heading}</h2>`;
          for (const group of block.equipmentGroups || []) {
            html += `<div class="equipment-group"><h4>${group.category}</h4><ul class="equipment-list">`;
            for (const item of group.items) {
              html += `<li>${item.quantity} ${item.unit} - ${item.description}</li>`;
            }
            html += '</ul></div>';
          }
          html += '</section>';
          break;
        case 'PRICING_SUMMARY':
          const pricing = block.pricingSnapshot;
          if (pricing) {
            html += `<section><h2>${block.heading}</h2><div class="pricing">`;
            if (pricing.basePrice > 0) {
              html += `<div class="pricing-line"><span>Base Price</span><span>€${pricing.basePrice.toLocaleString()}</span></div>`;
            }
            if (pricing.optionsTotal > 0) {
              html += `<div class="pricing-line"><span>Options & Equipment</span><span>€${pricing.optionsTotal.toLocaleString()}</span></div>`;
            }
            html += `<div class="pricing-line"><span>Subtotal (excl. VAT)</span><span>€${pricing.subtotalExclVat.toLocaleString()}</span></div>`;
            if (pricing.discountPercent && pricing.discountAmount) {
              html += `<div class="pricing-line"><span>Discount (${pricing.discountPercent}%)</span><span>-€${pricing.discountAmount.toLocaleString()}</span></div>`;
            }
            html += `<div class="pricing-line"><span>Total (excl. VAT)</span><span>€${pricing.totalExclVat.toLocaleString()}</span></div>`;
            html += `<div class="pricing-line"><span>VAT (${pricing.vatRate}%)</span><span>€${pricing.vatAmount.toLocaleString()}</span></div>`;
            html += `<div class="pricing-line total"><span>Total (incl. VAT)</span><span>€${pricing.totalInclVat.toLocaleString()}</span></div>`;
            html += '</div></section>';
          }
          break;
        case 'TERMS':
          if (block.content.trim()) {
            html += `<div class="terms"><h2>${block.heading}</h2><div>${this.markdownToHtml(block.content)}</div></div>`;
          }
          break;
      }
    }

    html += '</body></html>';
    return html;
  },

  /**
   * Simple markdown to HTML conversion
   */
  markdownToHtml(markdown: string): string {
    return markdown
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/### (.+)/g, '<h3>$1</h3>')
      .replace(/## (.+)/g, '<h2>$1</h2>')
      .replace(/# (.+)/g, '<h1>$1</h1>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p><h/g, '<h')
      .replace(/<\/h(\d)><\/p>/g, '</h$1>');
  },
};

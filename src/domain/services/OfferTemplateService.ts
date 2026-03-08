/**
 * Offer Template Service - v4
 * Business logic for Offer Templates and Project Offers.
 *
 * ============================================
 * GOVERNANCE: EXPLICIT ACTIONS ONLY
 * ============================================
 * - Templates are managed in the library
 * - Project offers are created via explicit "Initialize from Template"
 * - Changes to templates do NOT auto-propagate to project offers
 * - Re-apply is an explicit user action with clear options
 */

import type {
  OfferTemplate,
  OfferTemplateBlock,
  ProjectOffer,
  ProjectOfferBlock,
  CreateOfferTemplateInput,
  UpdateOfferTemplateInput,
  ReapplyTemplateInput,
  OfferVariableContext,
} from '@/domain/models/offer-template';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { OfferTemplateRepository } from '@/data/repositories/OfferTemplateRepository';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// SEED DATA
// ============================================

const DEFAULT_OFFER_BLOCKS: Omit<OfferTemplateBlock, 'sortOrder'>[] = [
  {
    blockId: 'introduction',
    title: 'Introduction',
    defaultText: `Dear {{clientName}},

Thank you for your interest in our boats. We are pleased to present this quotation for the {{boatModel}}.

This offer is valid until {{validUntil}}.`,
    variables: [
      { name: 'clientName', label: 'Client Name', source: 'client', sourcePath: 'name', defaultValue: 'Customer' },
      { name: 'boatModel', label: 'Boat Model', source: 'project', sourcePath: 'boatModel' },
      { name: 'validUntil', label: 'Valid Until', source: 'quote', sourcePath: 'validUntil' },
    ],
  },
  {
    blockId: 'scope',
    title: 'Scope of Supply',
    defaultText: `The boat will be delivered complete and ready for use, including:
- Hull and superstructure as per specifications
- Standard equipment as listed in the attached equipment list
- All selected options and extras
- CE certification and documentation
- Sea trial and handover training`,
  },
  {
    blockId: 'delivery',
    title: 'Delivery',
    defaultText: `Estimated delivery time: {{deliveryWeeks}} weeks from order confirmation.

Delivery location: Ex-works, our facility. Transport can be arranged upon request at additional cost.

We will notify you when the boat is ready for delivery and arrange a convenient date for handover.`,
    variables: [
      { name: 'deliveryWeeks', label: 'Delivery Weeks', source: 'quote', sourcePath: 'deliveryWeeks', defaultValue: '12-16' },
    ],
  },
  {
    blockId: 'payment',
    title: 'Payment Terms',
    defaultText: `Payment schedule:
- 30% deposit upon order confirmation
- 40% upon completion of hull
- 30% upon delivery

All prices are exclusive of VAT unless otherwise stated. VAT will be charged at the applicable rate.`,
  },
  {
    blockId: 'warranty',
    title: 'Warranty',
    defaultText: `We provide the following warranties:
- 5 years structural warranty on the hull
- 2 years warranty on all installed equipment
- 1 year warranty on electrical systems

Warranty terms are subject to proper maintenance as specified in the owner's manual.`,
  },
  {
    blockId: 'terms',
    title: 'Terms & Conditions',
    defaultText: `This quotation is subject to our general terms and conditions, a copy of which is available upon request.

To proceed with this order, please sign and return the attached order confirmation along with the deposit payment.

We look forward to working with you on this project.`,
  },
];

// ============================================
// SERVICE
// ============================================

export const OfferTemplateService = {
  // ============================================
  // TEMPLATE MANAGEMENT
  // ============================================

  /**
   * Initialize seed data if no templates exist
   */
  async initializeSeedData(): Promise<void> {
    const count = await OfferTemplateRepository.count();
    if (count > 0) return;

    const defaultTemplate: OfferTemplate = {
      id: generateUUID(),
      name: 'Standard Offer',
      description: 'Default offer template for new quotations',
      blocks: DEFAULT_OFFER_BLOCKS.map((block, index) => ({
        ...block,
        sortOrder: index,
      })),
      isDefault: true,
      createdAt: now(),
      updatedAt: now(),
      version: 1,
    };

    await OfferTemplateRepository.save(defaultTemplate);
  },

  /**
   * Get all offer templates
   */
  async getAll(includeArchived = false): Promise<OfferTemplate[]> {
    return OfferTemplateRepository.getAll(includeArchived);
  },

  /**
   * Get offer template by ID
   */
  async getById(id: string): Promise<OfferTemplate | null> {
    return OfferTemplateRepository.getById(id);
  },

  /**
   * Get the default template
   */
  async getDefault(): Promise<OfferTemplate | null> {
    return OfferTemplateRepository.getDefault();
  },

  /**
   * Create a new offer template
   */
  async create(
    input: CreateOfferTemplateInput,
    context: AuditContext
  ): Promise<Result<OfferTemplate, string>> {
    if (!input.name?.trim()) {
      return Err('Template name is required');
    }

    if (!input.blocks || input.blocks.length === 0) {
      return Err('At least one block is required');
    }

    // If setting as default, clear other defaults
    if (input.isDefault) {
      await OfferTemplateRepository.clearDefault();
    }

    const template: OfferTemplate = {
      id: generateUUID(),
      name: input.name.trim(),
      description: input.description?.trim(),
      blocks: input.blocks.map((block, index) => ({
        ...block,
        sortOrder: index,
      })),
      isDefault: input.isDefault,
      createdAt: now(),
      updatedAt: now(),
      version: 1,
    };

    await OfferTemplateRepository.save(template);

    await AuditService.log(
      context,
      'CREATE',
      'OfferTemplate',
      template.id,
      `Created offer template: ${template.name}`
    );

    return Ok(template);
  },

  /**
   * Update an existing offer template
   */
  async update(
    id: string,
    input: UpdateOfferTemplateInput,
    context: AuditContext
  ): Promise<Result<OfferTemplate, string>> {
    const existing = await OfferTemplateRepository.getById(id);
    if (!existing) {
      return Err('Template not found');
    }

    // If setting as default, clear other defaults
    if (input.isDefault && !existing.isDefault) {
      await OfferTemplateRepository.clearDefault();
    }

    const updated: OfferTemplate = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      description: input.description !== undefined ? input.description?.trim() : existing.description,
      blocks: input.blocks
        ? input.blocks.map((block, index) => ({ ...block, sortOrder: index }))
        : existing.blocks,
      isDefault: input.isDefault ?? existing.isDefault,
      archived: input.archived ?? existing.archived,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await OfferTemplateRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'OfferTemplate',
      id,
      `Updated offer template: ${updated.name}`
    );

    return Ok(updated);
  },

  /**
   * Archive an offer template (soft delete)
   */
  async archive(
    id: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const existing = await OfferTemplateRepository.getById(id);
    if (!existing) {
      return Err('Template not found');
    }

    await OfferTemplateRepository.save({
      ...existing,
      archived: true,
      isDefault: false, // Can't be default if archived
      updatedAt: now(),
      version: existing.version + 1,
    });

    await AuditService.log(
      context,
      'DELETE',
      'OfferTemplate',
      id,
      `Archived offer template: ${existing.name}`
    );

    return Ok(undefined);
  },

  // ============================================
  // PROJECT OFFER OPERATIONS
  // ============================================

  /**
   * Resolve variables in template text using context
   */
  resolveVariables(text: string, context: OfferVariableContext): string {
    let resolved = text;

    // Replace known variables
    const replacements: Record<string, string | undefined> = {
      clientName: context.clientName,
      clientCompany: context.clientCompany,
      boatModel: context.boatModel,
      projectNumber: context.projectNumber,
      projectTitle: context.projectTitle,
      deliveryWeeks: context.deliveryWeeks?.toString(),
      totalExclVat: context.totalExclVat ? `€${context.totalExclVat.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : undefined,
      totalInclVat: context.totalInclVat ? `€${context.totalInclVat.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : undefined,
      quoteNumber: context.quoteNumber,
      validUntil: context.validUntil ? new Date(context.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : undefined,
    };

    // Apply manual overrides
    if (context.manualValues) {
      Object.assign(replacements, context.manualValues);
    }

    // Replace all {{variable}} patterns
    for (const [key, value] of Object.entries(replacements)) {
      if (value !== undefined) {
        resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }

    return resolved;
  },

  /**
   * Initialize a ProjectOffer from a template
   * GOVERNANCE: Explicit action only - no auto-initialization
   */
  async initializeFromTemplate(
    templateId: string,
    variableContext: OfferVariableContext,
    context: AuditContext
  ): Promise<Result<ProjectOffer, string>> {
    const template = await OfferTemplateRepository.getById(templateId);
    if (!template) {
      return Err('Template not found');
    }

    // Render blocks with variables
    const blocks: ProjectOfferBlock[] = template.blocks.map((block) => ({
      blockId: block.blockId,
      title: block.title,
      text: this.resolveVariables(block.defaultText, variableContext),
      isEdited: false,
      sortOrder: block.sortOrder,
    }));

    const projectOffer: ProjectOffer = {
      templateId: template.id,
      templateName: template.name,
      templateVersionUsed: template.version,
      blocks,
      initializedAt: now(),
      initializedBy: context.userId,
    };

    return Ok(projectOffer);
  },

  /**
   * Update a block's text in a ProjectOffer
   * Marks the block as edited with tracking info
   */
  updateBlock(
    offer: ProjectOffer,
    blockId: string,
    newText: string,
    context: AuditContext
  ): Result<ProjectOffer, string> {
    const blockIndex = offer.blocks.findIndex((b) => b.blockId === blockId);
    if (blockIndex === -1) {
      return Err('Block not found');
    }

    const updatedBlocks = [...offer.blocks];
    updatedBlocks[blockIndex] = {
      ...updatedBlocks[blockIndex],
      text: newText,
      isEdited: true,
      editedAt: now(),
      editedBy: context.userId,
    };

    const updatedOffer: ProjectOffer = {
      ...offer,
      blocks: updatedBlocks,
      lastModifiedAt: now(),
      lastModifiedBy: context.userId,
    };

    return Ok(updatedOffer);
  },

  /**
   * Reset a single block to template default
   * GOVERNANCE: Explicit action only
   */
  async resetBlock(
    offer: ProjectOffer,
    blockId: string,
    variableContext: OfferVariableContext,
    context: AuditContext
  ): Promise<Result<ProjectOffer, string>> {
    const template = await OfferTemplateRepository.getById(offer.templateId);
    if (!template) {
      return Err('Source template not found');
    }

    const templateBlock = template.blocks.find((b) => b.blockId === blockId);
    if (!templateBlock) {
      return Err('Block not found in template');
    }

    const blockIndex = offer.blocks.findIndex((b) => b.blockId === blockId);
    if (blockIndex === -1) {
      return Err('Block not found in offer');
    }

    const updatedBlocks = [...offer.blocks];
    updatedBlocks[blockIndex] = {
      ...updatedBlocks[blockIndex],
      text: this.resolveVariables(templateBlock.defaultText, variableContext),
      isEdited: false,
      editedAt: undefined,
      editedBy: undefined,
    };

    const updatedOffer: ProjectOffer = {
      ...offer,
      blocks: updatedBlocks,
      lastModifiedAt: now(),
      lastModifiedBy: context.userId,
    };

    return Ok(updatedOffer);
  },

  /**
   * Re-apply template to project offer
   * GOVERNANCE: Explicit action with user-chosen mode
   */
  async reapplyTemplate(
    offer: ProjectOffer,
    input: ReapplyTemplateInput,
    variableContext: OfferVariableContext,
    context: AuditContext
  ): Promise<Result<ProjectOffer, string>> {
    const template = await OfferTemplateRepository.getById(offer.templateId);
    if (!template) {
      return Err('Source template not found');
    }

    const updatedBlocks: ProjectOfferBlock[] = [];

    for (const block of offer.blocks) {
      const templateBlock = template.blocks.find((b) => b.blockId === block.blockId);

      // Determine if this block should be overwritten
      let shouldOverwrite = false;
      switch (input.mode) {
        case 'all':
          shouldOverwrite = true;
          break;
        case 'non-edited':
          shouldOverwrite = !block.isEdited;
          break;
        case 'selected':
          shouldOverwrite = input.selectedBlockIds?.includes(block.blockId) ?? false;
          break;
      }

      if (shouldOverwrite && templateBlock) {
        updatedBlocks.push({
          blockId: block.blockId,
          title: templateBlock.title,
          text: this.resolveVariables(templateBlock.defaultText, variableContext),
          isEdited: false,
          editedAt: undefined,
          editedBy: undefined,
          sortOrder: templateBlock.sortOrder,
        });
      } else {
        updatedBlocks.push(block);
      }
    }

    // Add any new blocks from template that aren't in the offer
    for (const templateBlock of template.blocks) {
      if (!updatedBlocks.find((b) => b.blockId === templateBlock.blockId)) {
        updatedBlocks.push({
          blockId: templateBlock.blockId,
          title: templateBlock.title,
          text: this.resolveVariables(templateBlock.defaultText, variableContext),
          isEdited: false,
          sortOrder: templateBlock.sortOrder,
        });
      }
    }

    // Sort by sortOrder
    updatedBlocks.sort((a, b) => a.sortOrder - b.sortOrder);

    const updatedOffer: ProjectOffer = {
      ...offer,
      templateVersionUsed: template.version,
      blocks: updatedBlocks,
      lastModifiedAt: now(),
      lastModifiedBy: context.userId,
    };

    return Ok(updatedOffer);
  },

  /**
   * Get combined text from all blocks (for display/export)
   */
  getCombinedText(offer: ProjectOffer): string {
    return offer.blocks
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((block) => `## ${block.title}\n\n${block.text}`)
      .join('\n\n---\n\n');
  },

  /**
   * Check if any blocks have been edited
   */
  hasEditedBlocks(offer: ProjectOffer): boolean {
    return offer.blocks.some((b) => b.isEdited);
  },

  /**
   * Get count of edited blocks
   */
  getEditedBlockCount(offer: ProjectOffer): number {
    return offer.blocks.filter((b) => b.isEdited).length;
  },
};

/**
 * Quote Service - v4
 * Handles quote creation, versioning, and PDF generation
 */

import type {
  Project,
  ProjectQuote,
  QuoteLine,
  QuoteStatus,
} from '@/domain/models';
import { generateUUID, generateNumber, now, Result, Ok, Err } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { StatusMachine } from '@/domain/workflow';
import { SettingsService } from './SettingsService';

// ============================================
// QUOTE SERVICE
// ============================================

export const QuoteService = {
  /**
   * Create a new quote draft from current configuration
   */
  async createDraft(
    projectId: string,
    context: AuditContext,
    options?: {
      validityDays?: number;
      paymentTerms?: string;
      deliveryTerms?: string;
      deliveryWeeks?: number;
      notes?: string;
    }
  ): Promise<Result<ProjectQuote, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    if (project.configuration.items.length === 0) {
      return Err('Configuration has no items. Add items before creating a quote.');
    }

    // Calculate new version number
    const existingQuotes = project.quotes || [];
    const version = existingQuotes.length + 1;

    // Generate quote number
    const quoteNumber = `${project.projectNumber.replace('PRJ', 'QUO')}-v${version}`;

    // Convert configuration items to quote lines
    const lines: QuoteLine[] = project.configuration.items
      .filter((item) => item.isIncluded)
      .map((item) => ({
        id: generateUUID(),
        configurationItemId: item.id,
        category: item.category,
        description: item.name + (item.description ? ` - ${item.description}` : ''),
        quantity: item.quantity,
        unit: item.unit,
        unitPriceExclVat: item.unitPriceExclVat,
        lineTotalExclVat: item.lineTotalExclVat,
        isOptional: false,
      }));

    // Get defaults from settings
    const settings = await SettingsService.getSettings();
    const defaultPaymentTerms = await SettingsService.getDefaultPaymentTerms();
    const defaultDeliveryTerms = await SettingsService.getDefaultDeliveryTerms();

    // Calculate validity
    const validityDays = options?.validityDays || settings.quoteValidityDays;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    const quote: ProjectQuote = {
      id: generateUUID(),
      projectId,
      quoteNumber,
      version,
      status: 'DRAFT',
      lines,
      subtotalExclVat: project.configuration.subtotalExclVat,
      discountPercent: project.configuration.discountPercent,
      discountAmount: project.configuration.discountAmount,
      totalExclVat: project.configuration.totalExclVat,
      vatRate: project.configuration.vatRate,
      vatAmount: project.configuration.vatAmount,
      totalInclVat: project.configuration.totalInclVat,
      validUntil: validUntil.toISOString(),
      paymentTerms: options?.paymentTerms || defaultPaymentTerms,
      deliveryTerms: options?.deliveryTerms || defaultDeliveryTerms,
      deliveryWeeks: options?.deliveryWeeks,
      notes: options?.notes,
      createdAt: now(),
      createdBy: context.userId,
    };

    // Mark previous drafts as superseded
    const updatedQuotes = existingQuotes.map((q) =>
      q.status === 'DRAFT'
        ? { ...q, status: 'SUPERSEDED' as QuoteStatus, supersededAt: now(), supersededBy: quote.id }
        : q
    );

    const updated = await ProjectRepository.update(projectId, {
      quotes: [...updatedQuotes, quote],
      currentQuoteId: quote.id,
    });

    if (!updated) {
      return Err('Failed to create quote');
    }

    await AuditService.log(
      context,
      'CREATE',
      'ProjectQuote',
      quote.id,
      `Created quote ${quoteNumber}`,
      { after: { quoteNumber, version, totalInclVat: quote.totalInclVat } }
    );

    return Ok(quote);
  },

  /**
   * Update a draft quote (including lines and pricing)
   */
  async updateDraft(
    projectId: string,
    quoteId: string,
    updates: Partial<ProjectQuote>,
    context: AuditContext
  ): Promise<Result<ProjectQuote, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const quoteIndex = project.quotes.findIndex((q) => q.id === quoteId);
    if (quoteIndex === -1) {
      return Err('Quote not found');
    }

    const quote = project.quotes[quoteIndex];
    if (quote.status !== 'DRAFT') {
      return Err('Only draft quotes can be updated');
    }

    // Merge updates with existing quote, but don't allow changing id, projectId, quoteNumber, version, status
    const updatedQuote: ProjectQuote = {
      ...quote,
      lines: updates.lines ?? quote.lines,
      subtotalExclVat: updates.subtotalExclVat ?? quote.subtotalExclVat,
      discountPercent: updates.discountPercent ?? quote.discountPercent,
      discountAmount: updates.discountAmount ?? quote.discountAmount,
      totalExclVat: updates.totalExclVat ?? quote.totalExclVat,
      vatRate: updates.vatRate ?? quote.vatRate,
      vatAmount: updates.vatAmount ?? quote.vatAmount,
      totalInclVat: updates.totalInclVat ?? quote.totalInclVat,
      validUntil: updates.validUntil ?? quote.validUntil,
      paymentTerms: updates.paymentTerms ?? quote.paymentTerms,
      deliveryTerms: updates.deliveryTerms ?? quote.deliveryTerms,
      deliveryWeeks: updates.deliveryWeeks ?? quote.deliveryWeeks,
      notes: updates.notes ?? quote.notes,
    };

    const updatedQuotes = [...project.quotes];
    updatedQuotes[quoteIndex] = updatedQuote;

    const updated = await ProjectRepository.update(projectId, { quotes: updatedQuotes });
    if (!updated) {
      return Err('Failed to update quote');
    }

    await AuditService.logUpdate(
      context,
      'ProjectQuote',
      quoteId,
      quote as unknown as Record<string, unknown>,
      updatedQuote as unknown as Record<string, unknown>
    );

    return Ok(updatedQuote);
  },

  /**
   * Create a new quote version from an existing quote
   */
  async createNewVersion(
    projectId: string,
    fromQuoteId: string,
    context: AuditContext
  ): Promise<Result<ProjectQuote, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const sourceQuote = project.quotes.find((q) => q.id === fromQuoteId);
    if (!sourceQuote) {
      return Err('Source quote not found');
    }

    // Calculate new version number
    const version = project.quotes.length + 1;
    const quoteNumber = `${project.projectNumber.replace('PRJ', 'QUO')}-v${version}`;

    // Copy lines
    const lines: QuoteLine[] = sourceQuote.lines.map((line) => ({
      ...line,
      id: generateUUID(),
    }));

    // Get validity from settings
    const settings = await SettingsService.getSettings();

    // Set new validity
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + settings.quoteValidityDays);

    const newQuote: ProjectQuote = {
      id: generateUUID(),
      projectId,
      quoteNumber,
      version,
      status: 'DRAFT',
      lines,
      subtotalExclVat: sourceQuote.subtotalExclVat,
      discountPercent: sourceQuote.discountPercent,
      discountAmount: sourceQuote.discountAmount,
      totalExclVat: sourceQuote.totalExclVat,
      vatRate: sourceQuote.vatRate,
      vatAmount: sourceQuote.vatAmount,
      totalInclVat: sourceQuote.totalInclVat,
      validUntil: validUntil.toISOString(),
      paymentTerms: sourceQuote.paymentTerms,
      deliveryTerms: sourceQuote.deliveryTerms,
      deliveryWeeks: sourceQuote.deliveryWeeks,
      notes: sourceQuote.notes,
      createdAt: now(),
      createdBy: context.userId,
    };

    const updated = await ProjectRepository.update(projectId, {
      quotes: [...project.quotes, newQuote],
    });

    if (!updated) {
      return Err('Failed to create new quote version');
    }

    await AuditService.logCreate(
      context,
      'ProjectQuote',
      newQuote.id,
      { quoteNumber, version, basedOn: fromQuoteId }
    );

    return Ok(newQuote);
  },

  /**
   * Mark quote as sent (locks the quote)
   */
  async markAsSent(
    projectId: string,
    quoteId: string,
    context: AuditContext
  ): Promise<Result<ProjectQuote, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const quoteIndex = project.quotes.findIndex((q) => q.id === quoteId);
    if (quoteIndex === -1) {
      return Err('Quote not found');
    }

    const quote = project.quotes[quoteIndex];
    if (quote.status !== 'DRAFT') {
      return Err('Only draft quotes can be marked as sent');
    }

    const updatedQuote: ProjectQuote = {
      ...quote,
      status: 'SENT',
      sentAt: now(),
    };

    const updatedQuotes = [...project.quotes];
    updatedQuotes[quoteIndex] = updatedQuote;

    // Progress project status: DRAFT → QUOTED → OFFER_SENT when quote is sent
    let newStatus = project.status;
    if (project.status === 'DRAFT') {
      newStatus = 'OFFER_SENT'; // Skip QUOTED, go directly to OFFER_SENT when first quote is sent
    } else if (project.status === 'QUOTED') {
      newStatus = 'OFFER_SENT'; // Transition to OFFER_SENT
    }

    const updated = await ProjectRepository.update(projectId, {
      quotes: updatedQuotes,
      status: newStatus,
    });

    if (!updated) {
      return Err('Failed to update quote');
    }

    await AuditService.logStatusTransition(
      context,
      'ProjectQuote',
      quoteId,
      'DRAFT',
      'SENT'
    );

    return Ok(updatedQuote);
  },

  /**
   * Mark quote as accepted
   */
  async markAsAccepted(
    projectId: string,
    quoteId: string,
    context: AuditContext
  ): Promise<Result<ProjectQuote, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const quoteIndex = project.quotes.findIndex((q) => q.id === quoteId);
    if (quoteIndex === -1) {
      return Err('Quote not found');
    }

    const quote = project.quotes[quoteIndex];
    if (quote.status !== 'SENT') {
      return Err('Only sent quotes can be accepted');
    }

    const updatedQuote: ProjectQuote = {
      ...quote,
      status: 'ACCEPTED',
      acceptedAt: now(),
    };

    // Mark other quotes as superseded
    const updatedQuotes = project.quotes.map((q, i) => {
      if (i === quoteIndex) return updatedQuote;
      if (q.status === 'SENT' || q.status === 'DRAFT') {
        return { ...q, status: 'SUPERSEDED' as QuoteStatus, supersededAt: now(), supersededBy: quoteId };
      }
      return q;
    });

    const updated = await ProjectRepository.update(projectId, {
      quotes: updatedQuotes,
      currentQuoteId: quoteId,
    });

    if (!updated) {
      return Err('Failed to update quote');
    }

    await AuditService.logStatusTransition(
      context,
      'ProjectQuote',
      quoteId,
      'SENT',
      'ACCEPTED'
    );

    return Ok(updatedQuote);
  },

  /**
   * Mark quote as rejected
   */
  async markAsRejected(
    projectId: string,
    quoteId: string,
    context: AuditContext
  ): Promise<Result<ProjectQuote, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const quoteIndex = project.quotes.findIndex((q) => q.id === quoteId);
    if (quoteIndex === -1) {
      return Err('Quote not found');
    }

    const quote = project.quotes[quoteIndex];
    if (quote.status !== 'SENT') {
      return Err('Only sent quotes can be rejected');
    }

    const updatedQuote: ProjectQuote = {
      ...quote,
      status: 'REJECTED',
      rejectedAt: now(),
    };

    const updatedQuotes = [...project.quotes];
    updatedQuotes[quoteIndex] = updatedQuote;

    const updated = await ProjectRepository.update(projectId, { quotes: updatedQuotes });
    if (!updated) {
      return Err('Failed to update quote');
    }

    await AuditService.logStatusTransition(
      context,
      'ProjectQuote',
      quoteId,
      'SENT',
      'REJECTED'
    );

    return Ok(updatedQuote);
  },

  /**
   * Store PDF data for a quote
   */
  async storePdf(
    projectId: string,
    quoteId: string,
    pdfData: string,
    context: AuditContext
  ): Promise<Result<ProjectQuote, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const quoteIndex = project.quotes.findIndex((q) => q.id === quoteId);
    if (quoteIndex === -1) {
      return Err('Quote not found');
    }

    const quote = project.quotes[quoteIndex];
    const updatedQuote: ProjectQuote = {
      ...quote,
      pdfData,
      pdfGeneratedAt: now(),
    };

    const updatedQuotes = [...project.quotes];
    updatedQuotes[quoteIndex] = updatedQuote;

    const updated = await ProjectRepository.update(projectId, { quotes: updatedQuotes });
    if (!updated) {
      return Err('Failed to store PDF');
    }

    await AuditService.log(
      context,
      'GENERATE_DOCUMENT',
      'ProjectQuote',
      quoteId,
      `Generated PDF for quote ${quote.quoteNumber}`
    );

    return Ok(updatedQuote);
  },

  /**
   * Get the current (latest) quote for a project
   */
  async getCurrentQuote(projectId: string): Promise<ProjectQuote | null> {
    const project = await ProjectRepository.getById(projectId);
    if (!project || project.quotes.length === 0) {
      return null;
    }

    if (project.currentQuoteId) {
      return project.quotes.find((q) => q.id === project.currentQuoteId) || null;
    }

    // Return latest quote
    return project.quotes[project.quotes.length - 1];
  },

  /**
   * Get all quotes for a project
   */
  async getQuotes(projectId: string): Promise<ProjectQuote[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return [];
    }

    return project.quotes;
  },

  /**
   * Check if project has a draft quote
   */
  async hasDraftQuote(projectId: string): Promise<boolean> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return false;
    }

    return project.quotes.some((q) => q.status === 'DRAFT');
  },

  /**
   * Check if project has a sent quote
   */
  async hasSentQuote(projectId: string): Promise<boolean> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return false;
    }

    return project.quotes.some((q) => q.status === 'SENT');
  },

  /**
   * Check if project has an accepted quote
   */
  async hasAcceptedQuote(projectId: string): Promise<boolean> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return false;
    }

    return project.quotes.some((q) => q.status === 'ACCEPTED');
  },
};

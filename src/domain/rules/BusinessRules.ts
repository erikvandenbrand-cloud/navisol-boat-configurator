/**
 * Business Rules - v4
 * Centralized business rules and validation
 */

import type { Project, ProjectStatus, ProjectQuote, ConfigurationItem } from '@/domain/models';
import { StatusMachine } from '@/domain/workflow';
import { Result, Ok, Err } from '@/domain/models';

// ============================================
// PROJECT RULES
// ============================================

export const ProjectRules = {
  /**
   * Check if project can be edited
   */
  canEdit(project: Project): Result<true, string> {
    if (project.archivedAt) {
      return Err('Project is archived');
    }

    if (StatusMachine.isLocked(project.status)) {
      return Err('Project is locked after delivery');
    }

    if (StatusMachine.isFrozen(project.status) && !project.configuration.isFrozen) {
      // Edge case: status says frozen but config isn't
      return Ok(true);
    }

    if (project.configuration.isFrozen) {
      return Err('Configuration is frozen. Use amendments to make changes.');
    }

    return Ok(true);
  },

  /**
   * Check if project can be archived
   */
  canArchive(project: Project): Result<true, string> {
    if (project.archivedAt) {
      return Err('Project is already archived');
    }

    // Can only archive if CLOSED or DRAFT
    if (project.status !== 'CLOSED' && project.status !== 'DRAFT') {
      return Err('Can only archive closed or draft projects');
    }

    return Ok(true);
  },

  /**
   * Check if project can transition to status
   */
  canTransition(project: Project, newStatus: ProjectStatus): Result<true, string[]> {
    const errors: string[] = [];

    if (!StatusMachine.canTransition(project.status, newStatus)) {
      errors.push(`Cannot transition from ${project.status} to ${newStatus}`);
    }

    // Status-specific requirements
    switch (newStatus) {
      case 'QUOTED':
        if (project.configuration.items.length === 0) {
          errors.push('Configuration must have at least one item');
        }
        break;

      case 'OFFER_SENT':
        if (!project.quotes.some((q) => q.status === 'DRAFT' || q.status === 'SENT')) {
          errors.push('Must have a quote before sending offer');
        }
        break;

      case 'ORDER_CONFIRMED':
        if (!project.quotes.some((q) => q.status === 'ACCEPTED')) {
          errors.push('Quote must be accepted before confirming order');
        }
        break;

      case 'DELIVERED':
        // Could add delivery checklist requirement here
        break;
    }

    return errors.length === 0 ? Ok(true) : Err(errors);
  },

  /**
   * Validate project has required fields
   */
  validate(project: Partial<Project>): Result<true, string[]> {
    const errors: string[] = [];

    if (!project.title?.trim()) {
      errors.push('Title is required');
    }

    if (!project.clientId) {
      errors.push('Client is required');
    }

    if (!project.type) {
      errors.push('Project type is required');
    }

    return errors.length === 0 ? Ok(true) : Err(errors);
  },
};

// ============================================
// QUOTE RULES
// ============================================

export const QuoteRules = {
  /**
   * Check if quote can be edited
   */
  canEdit(quote: ProjectQuote): Result<true, string> {
    if (quote.status !== 'DRAFT') {
      return Err('Only draft quotes can be edited');
    }
    return Ok(true);
  },

  /**
   * Check if quote can be sent
   */
  canSend(quote: ProjectQuote): Result<true, string> {
    if (quote.status !== 'DRAFT') {
      return Err('Only draft quotes can be sent');
    }

    if (quote.lines.length === 0) {
      return Err('Quote must have at least one line item');
    }

    if (quote.totalInclVat <= 0) {
      return Err('Quote total must be greater than zero');
    }

    return Ok(true);
  },

  /**
   * Check if quote can be accepted
   */
  canAccept(quote: ProjectQuote): Result<true, string> {
    if (quote.status !== 'SENT') {
      return Err('Only sent quotes can be accepted');
    }

    // Check if expired
    if (new Date(quote.validUntil) < new Date()) {
      return Err('Quote has expired');
    }

    return Ok(true);
  },

  /**
   * Check if quote is immutable (after being sent)
   */
  isImmutable(quote: ProjectQuote): boolean {
    return quote.status !== 'DRAFT';
  },

  /**
   * Validate quote has required fields
   */
  validate(quote: Partial<ProjectQuote>): Result<true, string[]> {
    const errors: string[] = [];

    if (!quote.lines || quote.lines.length === 0) {
      errors.push('Quote must have at least one line');
    }

    if (!quote.validUntil) {
      errors.push('Validity date is required');
    }

    if (!quote.paymentTerms?.trim()) {
      errors.push('Payment terms are required');
    }

    if (!quote.deliveryTerms?.trim()) {
      errors.push('Delivery terms are required');
    }

    return errors.length === 0 ? Ok(true) : Err(errors);
  },
};

// ============================================
// CONFIGURATION RULES
// ============================================

export const ConfigurationRules = {
  /**
   * Check if configuration can be modified
   */
  canModify(isFrozen: boolean, projectStatus: ProjectStatus): Result<true, string> {
    if (isFrozen) {
      return Err('Configuration is frozen');
    }

    if (!StatusMachine.isEditable(projectStatus)) {
      return Err(`Cannot modify configuration in ${projectStatus} status`);
    }

    return Ok(true);
  },

  /**
   * Validate configuration item
   */
  validateItem(item: Partial<ConfigurationItem>): Result<true, string[]> {
    const errors: string[] = [];

    if (!item.name?.trim()) {
      errors.push('Item name is required');
    }

    if (!item.category?.trim()) {
      errors.push('Category is required');
    }

    if (item.quantity === undefined || item.quantity < 0) {
      errors.push('Quantity must be a positive number');
    }

    if (item.unitPriceExclVat === undefined || item.unitPriceExclVat < 0) {
      errors.push('Unit price must be a positive number');
    }

    if (!item.unit?.trim()) {
      errors.push('Unit is required');
    }

    return errors.length === 0 ? Ok(true) : Err(errors);
  },

  /**
   * Check for duplicate items
   */
  hasDuplicate(items: ConfigurationItem[], newItem: { name: string; category: string }): boolean {
    return items.some(
      (item) =>
        item.name.toLowerCase() === newItem.name.toLowerCase() &&
        item.category.toLowerCase() === newItem.category.toLowerCase()
    );
  },
};

// ============================================
// AMENDMENT RULES
// ============================================

export const AmendmentRules = {
  /**
   * Check if project allows amendments
   */
  canAmend(project: Project): Result<true, string> {
    if (!StatusMachine.isFrozen(project.status)) {
      return Err('Amendments are only needed for frozen projects');
    }

    if (StatusMachine.isLocked(project.status)) {
      return Err('Project is locked and cannot be amended');
    }

    return Ok(true);
  },

  /**
   * Validate amendment request
   */
  validate(amendment: {
    type?: string;
    reason?: string;
    approvedBy?: string;
  }): Result<true, string[]> {
    const errors: string[] = [];

    if (!amendment.type) {
      errors.push('Amendment type is required');
    }

    if (!amendment.reason?.trim()) {
      errors.push('Reason is required for amendments');
    }

    if (!amendment.approvedBy) {
      errors.push('Approver is required');
    }

    return errors.length === 0 ? Ok(true) : Err(errors);
  },
};

// ============================================
// CE/SAFETY COMPLIANCE RULES
// ============================================

export const ComplianceRules = {
  /**
   * Get all CE-relevant items from configuration
   */
  getCeRelevantItems(items: ConfigurationItem[]): ConfigurationItem[] {
    return items.filter((item) => item.ceRelevant && item.isIncluded);
  },

  /**
   * Get all safety-critical items from configuration
   */
  getSafetyCriticalItems(items: ConfigurationItem[]): ConfigurationItem[] {
    return items.filter((item) => item.safetyCritical && item.isIncluded);
  },

  /**
   * Check if configuration has required CE items for propulsion type
   */
  hasRequiredCeItems(
    items: ConfigurationItem[],
    propulsionType: string
  ): Result<true, string[]> {
    const errors: string[] = [];
    const ceItems = items.filter((i) => i.ceRelevant && i.isIncluded);

    // Electric/Hybrid propulsion requires battery and motor certification
    if (propulsionType === 'Electric' || propulsionType === 'Hybrid') {
      const hasBattery = ceItems.some(
        (i) => i.category === 'Propulsion' && i.name.toLowerCase().includes('battery')
      );
      const hasMotor = ceItems.some(
        (i) => i.category === 'Propulsion' && i.name.toLowerCase().includes('motor')
      );

      if (!hasBattery) {
        errors.push('CE: Battery pack with CE marking required for electric propulsion');
      }
      if (!hasMotor) {
        errors.push('CE: Electric motor with CE marking required');
      }
    }

    // All vessels require navigation lights
    const hasNavLights = ceItems.some(
      (i) => i.name.toLowerCase().includes('navigation light')
    );
    if (!hasNavLights) {
      errors.push('CE: Navigation lights required for RCD compliance');
    }

    return errors.length === 0 ? Ok(true) : Err(errors);
  },

  /**
   * Check if configuration has required safety items
   */
  hasRequiredSafetyItems(items: ConfigurationItem[]): Result<true, string[]> {
    const errors: string[] = [];
    const safetyItems = items.filter((i) => i.safetyCritical && i.isIncluded);

    // Basic safety requirements
    const hasLifeJackets = safetyItems.some(
      (i) => i.name.toLowerCase().includes('life jacket') || i.name.toLowerCase().includes('lifejacket')
    );
    const hasFireExtinguisher = safetyItems.some(
      (i) => i.name.toLowerCase().includes('fire extinguisher')
    );
    const hasBilgePump = safetyItems.some(
      (i) => i.name.toLowerCase().includes('bilge pump')
    );

    if (!hasLifeJackets) {
      errors.push('Safety: Life jackets required');
    }
    if (!hasFireExtinguisher) {
      errors.push('Safety: Fire extinguisher required');
    }
    if (!hasBilgePump) {
      errors.push('Safety: Bilge pump required');
    }

    return errors.length === 0 ? Ok(true) : Err(errors);
  },

  /**
   * Validate item CE/Safety flags are appropriate for category
   */
  validateItemFlags(item: Partial<ConfigurationItem>): Result<true, string[]> {
    const errors: string[] = [];
    const category = item.category?.toLowerCase() || '';
    const name = item.name?.toLowerCase() || '';

    // Propulsion items should be CE relevant
    if (category === 'propulsion' && !item.ceRelevant) {
      if (name.includes('motor') || name.includes('battery') || name.includes('charger')) {
        errors.push('Propulsion components should be marked as CE relevant');
      }
    }

    // Safety equipment should be safety critical
    if (category === 'safety' && !item.safetyCritical) {
      errors.push('Safety equipment should be marked as safety critical');
    }

    return errors.length === 0 ? Ok(true) : Err(errors);
  },

  /**
   * Check compatibility of items
   */
  checkCompatibility(
    items: ConfigurationItem[],
    propulsionType: string
  ): Result<true, string[]> {
    const errors: string[] = [];

    // Diesel items incompatible with Electric propulsion
    if (propulsionType === 'Electric') {
      const hasDieselItems = items.some(
        (i) => i.isIncluded && i.name.toLowerCase().includes('diesel')
      );
      if (hasDieselItems) {
        errors.push('Diesel components are incompatible with electric propulsion');
      }
    }

    return errors.length === 0 ? Ok(true) : Err(errors);
  },
};

// ============================================
// CLIENT RULES
// ============================================

export const ClientRules = {
  /**
   * Validate client has required fields
   */
  validate(client: { name?: string; type?: string; country?: string }): Result<true, string[]> {
    const errors: string[] = [];

    if (!client.name?.trim()) {
      errors.push('Name is required');
    }

    if (!client.type) {
      errors.push('Client type is required');
    }

    if (!client.country?.trim()) {
      errors.push('Country is required');
    }

    return errors.length === 0 ? Ok(true) : Err(errors);
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate VAT number format (basic check)
   */
  isValidVatNumber(vatNumber: string, country: string): boolean {
    if (!vatNumber) return true; // Optional

    // Basic format check for Netherlands
    if (country === 'Netherlands' || country === 'NL') {
      return /^NL\d{9}B\d{2}$/.test(vatNumber);
    }

    // For other countries, just check it's not empty
    return vatNumber.length >= 5;
  },
};

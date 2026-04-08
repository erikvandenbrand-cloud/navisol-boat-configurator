/**
 * Offer Template Model - v4
 * Template-based customer offers for quotations.
 *
 * ============================================
 * GOVERNANCE: EXPLICIT ACTIONS ONLY
 * ============================================
 * - Templates are starters; project offers are owned instances
 * - No background sync between template and project offers
 * - User must explicitly: Initialize / Re-apply / Reset block
 * - Block-based structure supports partial re-apply
 */

import type { Entity } from './common';

// ============================================
// OFFER TEMPLATE (Library Entity)
// ============================================

/**
 * A block within an offer template.
 * Blocks are the unit of content that can be individually edited or reset.
 */
export interface OfferTemplateBlock {
  /** Unique ID for the block within the template */
  blockId: string;
  /** Display title for the block (e.g., "Introduction", "Warranty Terms") */
  title: string;
  /** Default text content with optional variable placeholders */
  defaultText: string;
  /**
   * Variable definitions for this block.
   * Variables use {{variableName}} syntax in defaultText.
   * Common variables: {{clientName}}, {{boatModel}}, {{projectNumber}}, {{deliveryWeeks}}
   */
  variables?: OfferTemplateVariable[];
  /** Sort order for display */
  sortOrder: number;
}

/**
 * Variable definition for template text substitution.
 */
export interface OfferTemplateVariable {
  /** Variable name (used as {{name}} in text) */
  name: string;
  /** Human-readable label */
  label: string;
  /** Source of the value: 'project', 'client', 'quote', 'manual' */
  source: 'project' | 'client' | 'quote' | 'manual';
  /** Path to the value if source is 'project', 'client', or 'quote' */
  sourcePath?: string;
  /** Default value if source value is not available */
  defaultValue?: string;
}

/**
 * Offer Template entity stored in the library.
 */
export interface OfferTemplate extends Entity {
  /** Template name (e.g., "Standard Offer", "Premium Offer") */
  name: string;
  /** Template description */
  description?: string;
  /** Template blocks in order */
  blocks: OfferTemplateBlock[];
  /** Whether this is the default template for new quotes */
  isDefault?: boolean;
  /** Whether the template is archived (soft delete) */
  archived?: boolean;
}

/**
 * Input for creating a new Offer Template.
 */
export interface CreateOfferTemplateInput {
  name: string;
  description?: string;
  blocks: Omit<OfferTemplateBlock, 'sortOrder'>[];
  isDefault?: boolean;
}

/**
 * Input for updating an existing Offer Template.
 */
export interface UpdateOfferTemplateInput {
  name?: string;
  description?: string;
  blocks?: Omit<OfferTemplateBlock, 'sortOrder'>[];
  isDefault?: boolean;
  archived?: boolean;
}

// ============================================
// PROJECT OFFER (Per-Quote Instance)
// ============================================

/**
 * A block within a project offer (instantiated from template).
 */
export interface ProjectOfferBlock {
  /** Block ID (matches template blockId) */
  blockId: string;
  /** Display title (copied from template) */
  title: string;
  /** Current text content (may be edited) */
  text: string;
  /** Whether this block has been edited from the template default */
  isEdited: boolean;
  /** Timestamp of last edit (if edited) */
  editedAt?: string;
  /** User ID who last edited (if edited) */
  editedBy?: string;
  /** Sort order for display */
  sortOrder: number;
}

/**
 * Project Offer stored on a Quote.
 * This is the owned instance derived from a template.
 */
export interface ProjectOffer {
  /** Source template ID */
  templateId: string;
  /** Source template name (cached for display) */
  templateName: string;
  /** Template version that was used for initialization */
  templateVersionUsed: number;
  /** Offer blocks (owned by this quote) */
  blocks: ProjectOfferBlock[];
  /** Timestamp of initialization from template */
  initializedAt: string;
  /** User who initialized the offer */
  initializedBy: string;
  /** Timestamp of last modification */
  lastModifiedAt?: string;
  /** User who last modified */
  lastModifiedBy?: string;
}

// ============================================
// RE-APPLY OPTIONS
// ============================================

/**
 * Options for re-applying template to project offer.
 */
export type ReapplyMode =
  | 'all'           // Overwrite ALL blocks from template
  | 'non-edited'    // Overwrite ONLY non-edited blocks
  | 'selected';     // Overwrite selected blocks only

export interface ReapplyTemplateInput {
  mode: ReapplyMode;
  /** Block IDs to overwrite (only used when mode is 'selected') */
  selectedBlockIds?: string[];
}

// ============================================
// VARIABLE CONTEXT
// ============================================

/**
 * Context for resolving template variables.
 */
export interface OfferVariableContext {
  projectNumber?: string;
  projectTitle?: string;
  clientName?: string;
  clientCompany?: string;
  boatModel?: string;
  deliveryWeeks?: number;
  totalExclVat?: number;
  totalInclVat?: number;
  quoteNumber?: string;
  validUntil?: string;
  /** Manual overrides for variables */
  manualValues?: Record<string, string>;
}

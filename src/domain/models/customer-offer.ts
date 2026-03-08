/**
 * Customer Offer Model - v325 (Sales Track)
 *
 * A Customer Offer is a brochure-style deliverable generated from a Quote.
 * It assembles:
 * - Quote data (client, pricing summary)
 * - Boat Model sales content (selected sections/images)
 * - Equipment list from quote lines
 *
 * GOVERNANCE:
 * - Generation is explicit user action only
 * - No auto-regeneration when quote/model changes
 * - After generation, content is manually editable
 * - No background sync
 * - Production role cannot access this feature
 */

import type { ProjectQuote, QuoteLine } from './project';

// ============================================
// CUSTOMER OFFER BLOCK TYPES
// ============================================

/**
 * Block types for Customer Offer document structure
 */
export type CustomerOfferBlockType =
  | 'COVER'           // Cover page with model name, client, quote reference
  | 'MODEL_INTRO'     // Selected sales sections + highlights from Boat Model
  | 'IMAGE_GALLERY'   // Selected images from Boat Model sales content
  | 'EQUIPMENT_LIST'  // Equipment/quote lines grouped by category
  | 'PRICING_SUMMARY' // Base price + options totals from quote (no recomputation)
  | 'TERMS';          // Manual editable terms snippet

/**
 * A single block in the Customer Offer document.
 * Blocks are generated initially, then user can edit manually.
 */
export interface CustomerOfferBlock {
  /** Stable ID */
  id: string;
  /** Block type determines rendering */
  type: CustomerOfferBlockType;
  /** Block heading (editable) */
  heading: string;
  /** Block content - can be text/markdown (editable after generation) */
  content: string;
  /** Whether this block is included in the offer */
  included: boolean;
  /** Display order */
  sortOrder: number;
  /** For EQUIPMENT_LIST: grouped lines data (read-only after generation) */
  equipmentGroups?: EquipmentGroup[];
  /** For PRICING_SUMMARY: pricing snapshot (read-only after generation) */
  pricingSnapshot?: PricingSnapshot;
  /** For IMAGE_GALLERY: image URLs */
  images?: CustomerOfferImage[];
}

/**
 * Equipment group for the equipment list block
 */
export interface EquipmentGroup {
  category: string;
  items: {
    description: string;
    quantity: number;
    unit: string;
  }[];
}

/**
 * Pricing snapshot for the pricing summary block
 */
export interface PricingSnapshot {
  basePrice: number;
  optionsTotal: number;
  subtotalExclVat: number;
  discountPercent?: number;
  discountAmount?: number;
  totalExclVat: number;
  vatRate: number;
  vatAmount: number;
  totalInclVat: number;
}

/**
 * Image reference for the image gallery block
 */
export interface CustomerOfferImage {
  id: string;
  url: string;
  caption?: string;
}

// ============================================
// CUSTOMER OFFER STATUS
// ============================================

export type CustomerOfferStatus = 'DRAFT' | 'FINALIZED';

// ============================================
// CUSTOMER OFFER ENTITY
// ============================================

/**
 * Customer Offer - a Quote Deliverable for brochure-style documents.
 * Part of the Quote deliverables system.
 *
 * GOVERNANCE:
 * - Generated explicitly from Quote via user action
 * - Blocks are editable after generation
 * - No auto-regeneration on quote/model changes
 * - Regenerate action requires confirmation (overwrites current draft)
 */
export interface CustomerOffer {
  /** Stable ID */
  id: string;
  /** Parent quote ID */
  quoteId: string;
  /** Parent project ID */
  projectId: string;
  /** Document status */
  status: CustomerOfferStatus;

  // ============================================
  // SOURCE REFERENCES (snapshot at generation time)
  // ============================================

  /** Boat Model ID used for sales content */
  boatModelId?: string;
  /** Boat Model name (cached for display) */
  boatModelName?: string;
  /** Client name (cached from quote/project) */
  clientName?: string;
  /** Quote reference number */
  quoteNumber: string;
  /** Quote version */
  quoteVersion: number;

  // ============================================
  // DOCUMENT BLOCKS
  // ============================================

  /** Ordered blocks comprising the document */
  blocks: CustomerOfferBlock[];

  // ============================================
  // METADATA
  // ============================================

  /** When the offer was generated */
  generatedAt: string;
  /** Who generated the offer */
  generatedBy: string;
  /** Last edit timestamp */
  updatedAt?: string;
  /** Last editor */
  updatedBy?: string;
  /** When finalized (if applicable) */
  finalizedAt?: string;
  /** Who finalized */
  finalizedBy?: string;

  createdAt: string;
}

// ============================================
// CREATE/UPDATE INPUTS
// ============================================

export interface GenerateCustomerOfferInput {
  quoteId: string;
  projectId: string;
  /** Which sales section IDs to include (from Boat Model) */
  includeSalesSectionIds?: string[];
  /** Which sales image IDs to include (from Boat Model) */
  includeSalesImageIds?: string[];
  /** Include equipment list block */
  includeEquipmentList?: boolean;
  /** Include pricing summary block */
  includePricingSummary?: boolean;
  /** Initial terms text (optional) */
  termsText?: string;
}

export interface UpdateCustomerOfferBlockInput {
  blockId: string;
  heading?: string;
  content?: string;
  included?: boolean;
}

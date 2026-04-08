/**
 * Equipment List Models - v4
 *
 * Non-priced equipment list generated from project configuration.
 * Used for informational purposes, can be included with quotes.
 *
 * Contract compliance:
 * - NO pricing fields (unitPrice, lineTotal, subtotal, VAT, discounts, etc.)
 * - Generated from configuration (or configuration snapshot)
 * - Project-scoped (with optional unit scope for multi-unit projects)
 * - Brand-aware output
 * - Can be linked to quotes
 */

import type { Entity } from './common';

// ============================================
// EQUIPMENT LIST ITEM (NON-PRICED)
// ============================================

/**
 * A single item in the equipment list.
 * Derived from ConfigurationItem but WITHOUT any pricing.
 */
export interface EquipmentListItem {
  id: string;

  /** Original configuration item ID (for traceability) */
  configurationItemId: string;

  /** Category grouping */
  category: string;
  subcategory?: string;

  /** Article/part number */
  articleNumber?: string;

  /** Item name */
  name: string;

  /** Description or specification */
  description?: string;

  /** Quantity */
  quantity: number;
  unit: string;

  /** Additional notes (e.g., installation notes, specs) */
  notes?: string;

  /** CE relevance flag (informational) */
  ceRelevant?: boolean;

  /** Safety critical flag (informational) */
  safetyCritical?: boolean;

  /** Sort order within category */
  sortOrder: number;
}

// ============================================
// EQUIPMENT LIST SECTION
// ============================================

/**
 * A section (category group) in the equipment list.
 */
export interface EquipmentListSection {
  /** Category name */
  category: string;

  /** Items in this category */
  items: EquipmentListItem[];

  /** Total item count in section */
  itemCount: number;
}

// ============================================
// BRAND TEMPLATE
// ============================================

/**
 * Brand/house-style configuration for equipment list output.
 */
export interface EquipmentListBrand {
  /** Brand key (e.g., 'default', 'premium', 'nautique') */
  key: string;

  /** Display name */
  name: string;

  /** Company name for header */
  companyName?: string;

  /** Logo URL or data URI */
  logoUrl?: string;

  /** Primary color (hex) */
  primaryColor?: string;

  /** Secondary color (hex) */
  secondaryColor?: string;

  /** Footer text */
  footerText?: string;

  /** Additional CSS classes or styling */
  cssClass?: string;
}

// ============================================
// EQUIPMENT LIST DOCUMENT
// ============================================

/**
 * A generated equipment list document.
 * Immutable after creation (like quotes).
 */
export interface EquipmentListDocument extends Entity {
  /** Project this list belongs to */
  projectId: string;

  /** Optional unit ID for multi-unit projects */
  unitId?: string;

  /** Optional configuration snapshot ID (for reproducibility) */
  configurationSnapshotId?: string;

  /** Brand/house-style used for this document */
  brandKey: string;

  /** Document version (increments per generation) */
  version: number;

  /** Project metadata at time of generation */
  projectNumber: string;
  projectTitle: string;
  clientName?: string;

  /** Unit label if unit-scoped */
  unitLabel?: string;

  /** Boat model name */
  boatModelName?: string;

  /** Propulsion type */
  propulsionType?: string;

  /** Sections (grouped by category) */
  sections: EquipmentListSection[];

  /** Total item count across all sections */
  totalItemCount: number;

  /** Generation metadata */
  generatedAt: string;
  generatedBy: string;

  /** Optional notes or remarks */
  notes?: string;
}

// ============================================
// INPUT TYPES
// ============================================

/**
 * Input for generating an equipment list.
 */
export interface GenerateEquipmentListInput {
  projectId: string;

  /** Optional unit ID for multi-unit projects */
  unitId?: string;

  /** Optional snapshot ID to generate from (defaults to current configuration) */
  configurationSnapshotId?: string;

  /** Brand key (defaults to 'default') */
  brandKey?: string;

  /** Optional notes to include */
  notes?: string;
}

// ============================================
// DEFAULT BRANDS
// ============================================

export const DEFAULT_EQUIPMENT_LIST_BRANDS: EquipmentListBrand[] = [
  {
    key: 'default',
    name: 'Standard',
    companyName: 'Navisol Boat Builders',
    primaryColor: '#0d9488', // teal-600
    secondaryColor: '#134e4a', // teal-900
    footerText: 'This equipment list is for informational purposes only.',
  },
  {
    key: 'premium',
    name: 'Premium',
    companyName: 'Navisol Yacht Division',
    primaryColor: '#1e3a5f',
    secondaryColor: '#0f172a',
    footerText: 'Luxury vessel equipment specification.',
  },
  {
    key: 'nautique',
    name: 'Nautique Marine',
    companyName: 'Nautique Marine Solutions',
    primaryColor: '#1e40af', // blue-800
    secondaryColor: '#1e3a8a', // blue-900
    footerText: 'Professional marine equipment list.',
  },
];

// ============================================
// QUOTE EQUIPMENT LIST REFERENCE
// ============================================

/**
 * Reference to an equipment list included with a quote.
 * Added to ProjectQuote to track which equipment list was included.
 */
export interface QuoteEquipmentListRef {
  /** Equipment list document ID */
  equipmentListId: string;

  /** Whether to include as attachment or link */
  includeAs: 'attachment' | 'link';

  /** Timestamp when linked */
  linkedAt: string;
}

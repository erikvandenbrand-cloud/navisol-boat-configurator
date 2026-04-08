/**
 * Standard Entity - v4
 * Internal representation of external standards (ISO, EN, etc.)
 * for the Standards Library.
 *
 * Standards are external in origin, but the library entries are internally owned.
 * Each entry allows a manual sourceNote for provenance visibility.
 *
 * No external synchronization - all data is manually maintained.
 */

import type { Entity } from './common';

// ============================================
// STANDARD ENTITY
// ============================================

/**
 * A standard in the Standards Library.
 * Represents an internal representation of an external standard.
 */
export interface Standard extends Entity {
  /** Standard code, e.g., "ISO 12217", "EN ISO 14509-1" */
  code: string;

  /** Short title of the standard */
  title: string;

  /** Edition or year, e.g., "2015", "2020+A1:2023" */
  editionOrYear?: string;

  /**
   * Manual source note for provenance visibility.
   * E.g., "EU Official Journal 2022/C 282", "From Lloyd's register"
   */
  sourceNote?: string;

  /**
   * Tags for categorization and filtering.
   * Common tags: 'electrical', 'stability', 'fuel', 'steering', 'hull', 'fire', etc.
   */
  tags?: string[];

  /** Whether this is an EU harmonised standard (gives presumption of conformity) */
  isHarmonised?: boolean;

  /** Whether the standard is archived (soft delete) */
  archived?: boolean;

  /** Optional notes about the standard */
  notes?: string;
}

/**
 * Input for creating a new Standard in the library.
 */
export interface CreateStandardInput {
  code: string;
  title: string;
  editionOrYear?: string;
  sourceNote?: string;
  tags?: string[];
  isHarmonised?: boolean;
  notes?: string;
}

/**
 * Input for updating an existing Standard.
 */
export interface UpdateStandardInput {
  code?: string;
  title?: string;
  editionOrYear?: string;
  sourceNote?: string;
  tags?: string[];
  isHarmonised?: boolean;
  notes?: string;
  archived?: boolean;
}

// ============================================
// APPLIED STANDARD ORIGIN
// ============================================

/**
 * Origin of an applied standard on a project.
 * Tracked at apply-time only - no sync after application.
 */
export type AppliedStandardOrigin =
  | 'LIBRARY'        // Added manually from Standards Library
  | 'MODEL_SUGGESTED' // Applied from Boat Model suggestions
  | 'MANUAL';         // Manually typed (legacy or custom)

/**
 * Extended applied standard with library reference.
 * The libraryStandardId is optional - standards can still be manually typed.
 */
export interface AppliedStandardWithOrigin {
  id: string;

  /** Reference to the library standard (if from library) */
  libraryStandardId?: string;

  /** Origin of this standard on the project */
  origin: AppliedStandardOrigin;

  /** Standard code, e.g., "EN ISO 12217-1" */
  code: string;

  /** Full title */
  title?: string;

  /** Year or edition */
  year?: string;

  /** Project-specific scope note */
  scopeNote?: string;

  /** Whether this is harmonised */
  isHarmonised?: boolean;

  /** Evidence attachment IDs */
  evidenceAttachmentIds?: string[];

  /** Tags for filtering */
  tags?: string[];

  /** Project-specific notes */
  projectNote?: string;
}

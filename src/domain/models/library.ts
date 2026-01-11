/**
 * Library Layer Models - v4
 * Global templates that are versioned and approved
 */

import type { Entity, PropulsionType, DesignCategory, VersionStatus, DocumentType } from './common';

// ============================================
// BOAT MODEL
// ============================================

export interface LibraryBoatModel extends Entity {
  name: string;
  range: string;
  currentVersionId?: string;
  description?: string;
  imageUrl?: string;
}

export interface BoatModelVersion extends Entity {
  modelId: string;
  versionLabel: string; // Semantic: "1.0.0"
  status: VersionStatus;

  // Specifications
  lengthM: number;
  beamM: number;
  draftM: number;
  weightKg: number;
  maxPersons: number;
  designCategory: DesignCategory;

  // Propulsion options
  availablePropulsion: PropulsionType[];
  defaultPropulsion: PropulsionType;

  // Pricing
  basePriceExclVat: number;

  // Display
  description?: string;
  highlights?: string[];
  imageUrl?: string;

  // Approval tracking
  approvedAt?: string;
  approvedBy?: string;

  // Who created this version
  createdBy: string;
}

// ============================================
// EQUIPMENT CATALOG
// ============================================

export interface LibraryCatalog extends Entity {
  name: string;
  description?: string;
  currentVersionId?: string;
}

export interface CatalogVersion extends Entity {
  catalogId: string;
  versionLabel: string; // "2025.1", "2025.2"
  status: VersionStatus;

  items: CatalogItem[];

  approvedAt?: string;
  approvedBy?: string;
  createdBy: string;
}

export interface CatalogItem {
  id: string;
  category: string;
  subcategory?: string;
  articleNumber?: string;
  name: string;
  description?: string;

  // Pricing
  unitPriceExclVat: number;
  unit: string; // "pcs", "set", "m"

  // Flags
  isStandard: boolean;
  isOptional: boolean;
  ceRelevant: boolean;
  safetyCritical: boolean;

  // Compatibility (which models this applies to)
  compatibleModelIds?: string[]; // Empty = all models

  sortOrder: number;
}

// ============================================
// DOCUMENT TEMPLATES
// ============================================

export interface LibraryDocumentTemplate extends Entity {
  type: DocumentType;
  name: string;
  description?: string;
  currentVersionId?: string;
}

export interface TemplateVersion extends Entity {
  templateId: string;
  versionLabel: string; // "1.0", "1.1"
  status: VersionStatus;

  // Template content (HTML with placeholders)
  content: string;

  // Required data fields
  requiredFields: string[];

  approvedAt?: string;
  approvedBy?: string;
  createdBy: string;
}

// ============================================
// PROCEDURES
// ============================================

export interface LibraryProcedure extends Entity {
  category: string;
  title: string;
  description?: string;
  currentVersionId?: string;
}

export interface ProcedureVersion extends Entity {
  procedureId: string;
  versionLabel: string;
  status: VersionStatus;

  // Content (markdown or structured)
  content: string;

  // Which models this applies to
  applicableModelIds?: string[];

  approvedAt?: string;
  approvedBy?: string;
  createdBy: string;
}

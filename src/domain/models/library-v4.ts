/**
 * Library v4 Models
 * Clean hierarchical structure: Categories → Subcategories → Articles/Kits
 * All versioned entities support DRAFT → APPROVED → DEPRECATED lifecycle
 */

import type { Entity } from './common';

// ============================================
// TAXONOMY (STABLE - NOT VERSIONED)
// ============================================

export interface LibraryCategory extends Entity {
  name: string;
  sortOrder: number;
}

export interface LibrarySubcategory extends Entity {
  categoryId: string;
  name: string;
  sortOrder: number;
}

// ============================================
// ATTACHMENTS
// ============================================

export type AttachmentType = '3D' | 'CNC' | 'MANUAL' | 'CERTIFICATE' | 'DRAWING' | 'DATASHEET' | 'OTHER';

export const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  '3D': '3D Model',
  'CNC': 'CNC File',
  'MANUAL': 'Manual',
  'CERTIFICATE': 'Certificate',
  'DRAWING': 'Drawing',
  'DATASHEET': 'Datasheet',
  'OTHER': 'Other',
};

export interface ArticleAttachment {
  id: string;
  type: AttachmentType;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string; // Base64 data URL for storage
  url?: string; // External URL (alternative to dataUrl)
  uploadedAt: string;
  uploadedBy: string;
  notes?: string;
}

// ============================================
// ARTICLES (VERSIONED)
// ============================================

export type ArticleTag = 'CE_CRITICAL' | 'SAFETY_CRITICAL' | 'OPTIONAL' | 'STANDARD';

export interface LibraryArticle extends Entity {
  code: string; // Unique, e.g. PROP-SHAFT-040
  name: string;
  subcategoryId: string;
  unit: string; // pcs, m, set, etc.
  supplierId?: string;
  tags?: ArticleTag[];
  currentVersionId?: string;
}

export type ArticleVersionStatus = 'DRAFT' | 'APPROVED' | 'DEPRECATED';

export interface ArticleVersion extends Entity {
  articleId: string;
  versionNumber: number;
  status: ArticleVersionStatus;
  sellPrice: number; // Required
  costPrice?: number; // Optional - warning if missing but does NOT block
  vatRate: number; // Default 21%
  weightKg?: number; // Weight in kilograms
  leadTimeDays?: number;
  notes?: string;
  specs?: Record<string, string | number>;
  attachments?: ArticleAttachment[]; // Versioned attachments
  approvedAt?: string;
  approvedBy?: string;
}

// ============================================
// KITS (ASSEMBLIES - VERSIONED)
// ============================================

export interface LibraryKit extends Entity {
  code: string; // Unique, e.g. KIT-PROP-SHAFTLINE-040
  name: string;
  subcategoryId: string;
  currentVersionId?: string;
}

export type KitVersionStatus = 'DRAFT' | 'APPROVED' | 'DEPRECATED';
export type CostRollupMode = 'SUM_COMPONENTS' | 'MANUAL';

export interface KitComponent {
  articleVersionId: string;
  qty: number;
  notes?: string;
}

export interface KitVersion extends Entity {
  kitId: string;
  versionNumber: number;
  status: KitVersionStatus;
  sellPrice: number; // Required - appears as ONE quote line
  costRollupMode: CostRollupMode;
  manualCostPrice?: number; // Used only if costRollupMode === 'MANUAL'
  components: KitComponent[];
  explodeInBOM: boolean; // Default true
  salesOnly: boolean; // Default false - if true, does not explode in BOM
  approvedAt?: string;
  approvedBy?: string;
}

// ============================================
// DEFAULT CONFIGURATION FOR BOAT MODELS
// ============================================

export type DefaultConfigItemType = 'KIT' | 'ARTICLE';

export interface DefaultConfigurationItem {
  type: DefaultConfigItemType;
  kitVersionId?: string;
  articleVersionId?: string;
  qty: number;
  notes?: string;
}

// ============================================
// CREATE/UPDATE INPUTS
// ============================================

export interface CreateCategoryInput {
  name: string;
  sortOrder?: number;
}

export interface CreateSubcategoryInput {
  categoryId: string;
  name: string;
  sortOrder?: number;
}

export interface CreateArticleInput {
  code: string;
  name: string;
  subcategoryId: string;
  unit: string;
  supplierId?: string;
  tags?: ArticleTag[];
  sellPrice: number;
  costPrice?: number;
  vatRate?: number;
  weightKg?: number;
  leadTimeDays?: number;
  notes?: string;
}

export interface CreateArticleVersionInput {
  sellPrice: number;
  costPrice?: number;
  vatRate?: number;
  weightKg?: number;
  leadTimeDays?: number;
  notes?: string;
  specs?: Record<string, string | number>;
  attachments?: ArticleAttachment[];
}

export interface CreateKitInput {
  code: string;
  name: string;
  subcategoryId: string;
  sellPrice: number;
  costRollupMode?: CostRollupMode;
  manualCostPrice?: number;
  components: KitComponent[];
  explodeInBOM?: boolean;
  salesOnly?: boolean;
}

export interface CreateKitVersionInput {
  sellPrice: number;
  costRollupMode?: CostRollupMode;
  manualCostPrice?: number;
  components: KitComponent[];
  explodeInBOM?: boolean;
  salesOnly?: boolean;
}

// ============================================
// COMPUTED TYPES
// ============================================

export interface ArticleWithVersion {
  article: LibraryArticle;
  version: ArticleVersion;
  category: LibraryCategory;
  subcategory: LibrarySubcategory;
}

export interface KitWithVersion {
  kit: LibraryKit;
  version: KitVersion;
  category: LibraryCategory;
  subcategory: LibrarySubcategory;
  components: {
    articleVersion: ArticleVersion;
    article: LibraryArticle;
    qty: number;
    notes?: string;
  }[];
}

export interface CategoryTree {
  category: LibraryCategory;
  subcategories: {
    subcategory: LibrarySubcategory;
    articleCount: number;
    kitCount: number;
  }[];
}

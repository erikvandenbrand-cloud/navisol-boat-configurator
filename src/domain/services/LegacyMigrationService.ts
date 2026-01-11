/**
 * Legacy Migration Service
 * Migrates Legacy Equipment Catalog items to Library v4 Articles
 *
 * Rules:
 * - Maps legacy categories to Library v4 category/subcategory taxonomy
 * - Deduplicates by article code (skips if already exists)
 * - Creates versioned Articles with initial APPROVED ArticleVersion
 * - Does NOT touch pinned Project data or BOM snapshots
 */

import type {
  LibraryArticle,
  ArticleVersion,
  LibraryCategory,
  LibrarySubcategory,
  ArticleTag,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import {
  CategoryRepository,
  SubcategoryRepository,
  ArticleRepository,
  ArticleVersionRepository,
} from '@/data/repositories/LibraryV4Repository';
import {
  EquipmentCatalogService,
  type EquipmentCatalogItem,
} from './EquipmentCatalogService';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// CATEGORY MAPPING
// Legacy categories → Library v4 category/subcategory
// ============================================

/**
 * Maps legacy equipment categories to Library v4 taxonomy
 * Format: legacyCategory → { categoryName, subcategoryName }
 */
const CATEGORY_MAPPING: Record<string, { category: string; subcategory: string }> = {
  // Propulsion
  'Propulsion': { category: 'Propulsion', subcategory: 'Electric motors & drives' },

  // Navigation
  'Navigation': { category: 'Electronics & Navigation', subcategory: 'Chartplotters & GPS' },

  // Safety
  'Safety': { category: 'Safety & Compliance', subcategory: 'Life-saving equipment' },

  // Comfort
  'Comfort': { category: 'Interior & Finish', subcategory: 'Seating & upholstery' },

  // Electronics
  'Electronics': { category: 'Electrical & Power', subcategory: 'Inverters' },

  // Deck Equipment
  'Deck Equipment': { category: 'Deck & Hardware', subcategory: 'Anchoring & mooring' },

  // Interior
  'Interior': { category: 'Interior & Finish', subcategory: 'Cabinets & joinery' },

  // Exterior
  'Exterior': { category: 'Deck & Hardware', subcategory: 'Rails & stanchions' },

  // Electrical
  'Electrical': { category: 'Electrical & Power', subcategory: 'Distribution & breakers' },

  // Plumbing
  'Plumbing': { category: 'Plumbing & Bilge', subcategory: 'Hoses & fittings' },

  // Hull
  'Hull': { category: 'Hull & Structural', subcategory: 'Hull plating & frames' },

  // Other/fallback
  'Other': { category: 'Services', subcategory: 'Installation labor' },
};

// Default fallback for unknown categories
const DEFAULT_MAPPING = { category: 'Services', subcategory: 'Installation labor' };

// ============================================
// TYPES
// ============================================

export interface MigrationResult {
  totalItems: number;
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  skippedItems: { code: string; reason: string }[];
  errors: { code: string; error: string }[];
  migratedItems: { code: string; articleId: string; versionId: string }[];
}

export interface MigrationOptions {
  /** If true, auto-approve migrated versions (default: true) */
  autoApprove?: boolean;
  /** If true, mark legacy items as archived after migration (default: false) */
  archiveLegacy?: boolean;
  /** If true, skip items that already exist; if false, return error (default: true) */
  skipExisting?: boolean;
}

// ============================================
// MIGRATION SERVICE
// ============================================

export const LegacyMigrationService = {
  /**
   * Get all legacy equipment items eligible for migration
   */
  async getLegacyItems(): Promise<EquipmentCatalogItem[]> {
    return EquipmentCatalogService.getAll();
  },

  /**
   * Preview migration without executing
   * Returns which items will be migrated vs skipped
   */
  async previewMigration(): Promise<{
    toMigrate: EquipmentCatalogItem[];
    toSkip: { item: EquipmentCatalogItem; reason: string }[];
  }> {
    const legacyItems = await EquipmentCatalogService.getAll();
    const toMigrate: EquipmentCatalogItem[] = [];
    const toSkip: { item: EquipmentCatalogItem; reason: string }[] = [];

    for (const item of legacyItems) {
      // Check if article with same code already exists
      const existing = await ArticleRepository.getByCode(item.articleNumber);
      if (existing) {
        toSkip.push({ item, reason: `Article with code ${item.articleNumber} already exists` });
      } else {
        toMigrate.push(item);
      }
    }

    return { toMigrate, toSkip };
  },

  /**
   * Get or create a subcategory for the given legacy category
   * Returns the subcategoryId for use in Article creation
   */
  async resolveSubcategory(
    legacyCategory: string,
    context: AuditContext
  ): Promise<string> {
    const mapping = CATEGORY_MAPPING[legacyCategory] || DEFAULT_MAPPING;

    // Find or create category
    const categories = await CategoryRepository.getAll();
    let category = categories.find(c => c.name === mapping.category);

    if (!category) {
      // Create category
      category = {
        id: generateUUID(),
        name: mapping.category,
        sortOrder: categories.length,
        createdAt: now(),
        updatedAt: now(),
        version: 0,
      };
      await CategoryRepository.save(category);
      await AuditService.logCreate(context, 'LibraryCategory', category.id, {
        name: category.name,
        source: 'LegacyMigration',
      });
    }

    // Find or create subcategory
    const subcategories = await SubcategoryRepository.getByCategory(category.id);
    let subcategory = subcategories.find(s => s.name === mapping.subcategory);

    if (!subcategory) {
      // Create subcategory
      subcategory = {
        id: generateUUID(),
        categoryId: category.id,
        name: mapping.subcategory,
        sortOrder: subcategories.length,
        createdAt: now(),
        updatedAt: now(),
        version: 0,
      };
      await SubcategoryRepository.save(subcategory);
      await AuditService.logCreate(context, 'LibrarySubcategory', subcategory.id, {
        name: subcategory.name,
        categoryId: category.id,
        source: 'LegacyMigration',
      });
    }

    return subcategory.id;
  },

  /**
   * Map legacy equipment item to Article tags
   */
  mapTags(item: EquipmentCatalogItem): ArticleTag[] {
    const tags: ArticleTag[] = [];
    if (item.ceRelevant) tags.push('CE_CRITICAL');
    if (item.safetyCritical) tags.push('SAFETY_CRITICAL');
    // Default equipment is considered STANDARD
    tags.push('STANDARD');
    return tags;
  },

  /**
   * Migrate a single legacy equipment item to a Library v4 Article
   */
  async migrateItem(
    item: EquipmentCatalogItem,
    context: AuditContext,
    options: MigrationOptions = {}
  ): Promise<Result<{ articleId: string; versionId: string }, string>> {
    const { autoApprove = true, skipExisting = true } = options;

    // Check for existing article with same code
    const existing = await ArticleRepository.getByCode(item.articleNumber);
    if (existing) {
      if (skipExisting) {
        return Err(`Skipped: Article with code ${item.articleNumber} already exists`);
      }
      return Err(`Article with code ${item.articleNumber} already exists`);
    }

    // Resolve subcategory from legacy category
    const subcategoryId = await this.resolveSubcategory(item.category, context);

    // Generate IDs
    const articleId = generateUUID();
    const versionId = generateUUID();

    // Create ArticleVersion
    const version: ArticleVersion = {
      id: versionId,
      articleId,
      versionNumber: 1,
      status: autoApprove ? 'APPROVED' : 'DRAFT',
      sellPrice: item.listPriceExclVat,
      costPrice: item.costPrice,
      vatRate: 21, // Default Dutch VAT
      leadTimeDays: item.leadTimeDays,
      notes: item.description ? `Migrated from legacy catalog. ${item.description}` : 'Migrated from legacy catalog.',
      approvedAt: autoApprove ? now() : undefined,
      approvedBy: autoApprove ? context.userId : undefined,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await ArticleVersionRepository.save(version);

    // Create Article
    const article: LibraryArticle = {
      id: articleId,
      code: item.articleNumber,
      name: item.name,
      subcategoryId,
      unit: item.unit || 'pcs',
      supplierId: item.supplier,
      tags: this.mapTags(item),
      currentVersionId: versionId,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await ArticleRepository.save(article);

    await AuditService.logCreate(context, 'LibraryArticle', articleId, {
      code: item.articleNumber,
      name: item.name,
      source: 'LegacyMigration',
      legacyId: item.id,
    });

    return Ok({ articleId, versionId });
  },

  /**
   * Migrate all legacy equipment items to Library v4 Articles
   */
  async migrateAll(
    context: AuditContext,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const { archiveLegacy = false } = options;

    const legacyItems = await EquipmentCatalogService.getAll();
    const result: MigrationResult = {
      totalItems: legacyItems.length,
      migratedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      skippedItems: [],
      errors: [],
      migratedItems: [],
    };

    for (const item of legacyItems) {
      const migrationResult = await this.migrateItem(item, context, options);

      if (migrationResult.ok) {
        result.migratedCount++;
        result.migratedItems.push({
          code: item.articleNumber,
          articleId: migrationResult.value.articleId,
          versionId: migrationResult.value.versionId,
        });

        // Optionally archive the legacy item
        if (archiveLegacy) {
          await EquipmentCatalogService.archive(item.id, context);
        }
      } else {
        const error = migrationResult.error;
        if (error.startsWith('Skipped:')) {
          result.skippedCount++;
          result.skippedItems.push({
            code: item.articleNumber,
            reason: error.replace('Skipped: ', ''),
          });
        } else {
          result.errorCount++;
          result.errors.push({
            code: item.articleNumber,
            error,
          });
        }
      }
    }

    await AuditService.log(
      context,
      'IMPORT',
      'LegacyMigration',
      'bulk',
      `Migrated ${result.migratedCount} legacy items to Library v4. Skipped: ${result.skippedCount}, Errors: ${result.errorCount}`
    );

    return result;
  },

  /**
   * Get the category mapping for documentation/display
   */
  getCategoryMapping(): Record<string, { category: string; subcategory: string }> {
    return { ...CATEGORY_MAPPING };
  },

  /**
   * Check if a specific legacy item has already been migrated
   */
  async isItemMigrated(articleNumber: string): Promise<boolean> {
    const existing = await ArticleRepository.getByCode(articleNumber);
    return existing !== null;
  },

  /**
   * Get migration status summary
   */
  async getMigrationStatus(): Promise<{
    totalLegacy: number;
    alreadyMigrated: number;
    pendingMigration: number;
  }> {
    const legacyItems = await EquipmentCatalogService.getAll();
    let alreadyMigrated = 0;

    for (const item of legacyItems) {
      if (await this.isItemMigrated(item.articleNumber)) {
        alreadyMigrated++;
      }
    }

    return {
      totalLegacy: legacyItems.length,
      alreadyMigrated,
      pendingMigration: legacyItems.length - alreadyMigrated,
    };
  },
};

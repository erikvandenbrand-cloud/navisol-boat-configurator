/**
 * Legacy Migration Tests
 * Tests for migrating Legacy Equipment Catalog to Library v4 Articles
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';
import { clearAllTestData } from '@/domain/__tests__/testUtils';

import { LegacyMigrationService } from '@/domain/services/LegacyMigrationService';
import { EquipmentCatalogService, type EquipmentCatalogItem } from '@/domain/services/EquipmentCatalogService';
import { LibraryArticleService, LibraryCategoryService, LibrarySubcategoryService } from '@/domain/services/LibraryV4Service';
import { ArticleRepository, ArticleVersionRepository, CategoryRepository, SubcategoryRepository } from '@/data/repositories/LibraryV4Repository';
import { getAdapter } from '@/data/persistence';
import type { AuditContext } from '@/domain/audit/AuditService';
import { generateUUID, now } from '@/domain/models';

// ============================================
// TEST CONTEXT
// ============================================

const testContext: AuditContext = {
  userId: 'test-user',
  userName: 'Test User',
  action: 'TEST',
};

// ============================================
// HELPERS
// ============================================

async function createLegacyItem(overrides: Partial<EquipmentCatalogItem> = {}): Promise<EquipmentCatalogItem> {
  const item: EquipmentCatalogItem = {
    id: generateUUID(),
    articleNumber: overrides.articleNumber || `LEG-${Math.random().toString(36).substring(7).toUpperCase()}`,
    name: overrides.name || 'Test Legacy Item',
    description: overrides.description || 'A test legacy item',
    category: overrides.category || 'Propulsion',
    subcategory: overrides.subcategory,
    listPriceExclVat: overrides.listPriceExclVat ?? 1000,
    costPrice: overrides.costPrice ?? 600,
    supplier: overrides.supplier || 'Test Supplier',
    supplierArticleNumber: overrides.supplierArticleNumber,
    leadTimeDays: overrides.leadTimeDays ?? 7,
    ceRelevant: overrides.ceRelevant ?? false,
    safetyCritical: overrides.safetyCritical ?? false,
    isActive: overrides.isActive ?? true,
    unit: overrides.unit || 'pcs',
    createdAt: now(),
    createdBy: 'test',
    updatedAt: now(),
    ...overrides,
  };

  // Save directly to adapter
  const adapter = getAdapter();
  await adapter.save('library_equipment_catalog', item);

  return item;
}

// ============================================
// CATEGORY MAPPING TESTS
// ============================================

describe('LegacyMigrationService - Category Mapping', () => {
  test('should return category mapping', () => {
    const mapping = LegacyMigrationService.getCategoryMapping();

    expect(mapping).toHaveProperty('Propulsion');
    expect(mapping.Propulsion.category).toBe('Propulsion');
    expect(mapping.Propulsion.subcategory).toBe('Electric motors & drives');
  });

  test('should map all standard legacy categories', () => {
    const mapping = LegacyMigrationService.getCategoryMapping();

    const legacyCategories = [
      'Propulsion', 'Navigation', 'Safety', 'Comfort',
      'Electronics', 'Deck Equipment', 'Interior', 'Exterior',
      'Electrical', 'Plumbing', 'Hull', 'Other'
    ];

    for (const cat of legacyCategories) {
      expect(mapping[cat]).toBeDefined();
      expect(mapping[cat].category).toBeTruthy();
      expect(mapping[cat].subcategory).toBeTruthy();
    }
  });
});

// ============================================
// MIGRATION PREVIEW TESTS
// ============================================

describe('LegacyMigrationService - Preview Migration', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  test('should preview migration with no existing articles', async () => {
    // Create legacy items
    await createLegacyItem({ articleNumber: 'PREV-001', name: 'Preview Item 1' });
    await createLegacyItem({ articleNumber: 'PREV-002', name: 'Preview Item 2' });

    const preview = await LegacyMigrationService.previewMigration();

    expect(preview.toMigrate.length).toBe(2);
    expect(preview.toSkip.length).toBe(0);
  });

  test('should identify items that already exist as articles', async () => {
    // Create legacy item
    const legacyItem = await createLegacyItem({ articleNumber: 'DUP-001', name: 'Duplicate Item' });

    // Migrate it first
    await LegacyMigrationService.migrateItem(legacyItem, testContext);

    // Create another legacy item with different code
    await createLegacyItem({ articleNumber: 'NEW-001', name: 'New Item' });

    const preview = await LegacyMigrationService.previewMigration();

    expect(preview.toMigrate.length).toBe(1);
    expect(preview.toMigrate[0].articleNumber).toBe('NEW-001');
    expect(preview.toSkip.length).toBe(1);
    expect(preview.toSkip[0].item.articleNumber).toBe('DUP-001');
  });
});

// ============================================
// SINGLE ITEM MIGRATION TESTS
// ============================================

describe('LegacyMigrationService - Migrate Single Item', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  test('should migrate legacy item to article', async () => {
    const legacyItem = await createLegacyItem({
      articleNumber: 'MIG-001',
      name: 'Migrated Motor',
      category: 'Propulsion',
      listPriceExclVat: 5000,
      costPrice: 3500,
      ceRelevant: true,
    });

    const result = await LegacyMigrationService.migrateItem(legacyItem, testContext);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify article was created
    const article = await ArticleRepository.getByCode('MIG-001');
    expect(article).not.toBeNull();
    expect(article!.name).toBe('Migrated Motor');
    expect(article!.tags).toContain('CE_CRITICAL');
    expect(article!.tags).toContain('STANDARD');

    // Verify version was created
    const version = await ArticleVersionRepository.getById(result.value.versionId);
    expect(version).not.toBeNull();
    expect(version!.sellPrice).toBe(5000);
    expect(version!.costPrice).toBe(3500);
    expect(version!.status).toBe('APPROVED');
  });

  test('should skip migration if article already exists', async () => {
    const legacyItem = await createLegacyItem({ articleNumber: 'SKIP-001' });

    // Migrate first time
    await LegacyMigrationService.migrateItem(legacyItem, testContext);

    // Try to migrate again
    const result = await LegacyMigrationService.migrateItem(legacyItem, testContext, { skipExisting: true });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Skipped');
  });

  test('should create category and subcategory if not exists', async () => {
    // Clear categories first
    await clearAllTestData();

    const legacyItem = await createLegacyItem({
      articleNumber: 'CAT-001',
      category: 'Safety',
    });

    await LegacyMigrationService.migrateItem(legacyItem, testContext);

    // Check category was created
    const categories = await CategoryRepository.getAll();
    const safetyCategory = categories.find(c => c.name === 'Safety & Compliance');
    expect(safetyCategory).toBeDefined();

    // Check subcategory was created
    const subcategories = await SubcategoryRepository.getByCategory(safetyCategory!.id);
    const lifeEquipment = subcategories.find(s => s.name === 'Life-saving equipment');
    expect(lifeEquipment).toBeDefined();
  });

  test('should not create draft version when autoApprove is false', async () => {
    const legacyItem = await createLegacyItem({ articleNumber: 'DRAFT-001' });

    const result = await LegacyMigrationService.migrateItem(legacyItem, testContext, { autoApprove: false });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const version = await ArticleVersionRepository.getById(result.value.versionId);
    expect(version!.status).toBe('DRAFT');
    expect(version!.approvedAt).toBeUndefined();
  });

  test('should map safety-critical items correctly', async () => {
    const legacyItem = await createLegacyItem({
      articleNumber: 'SAFE-001',
      safetyCritical: true,
      ceRelevant: true,
    });

    const result = await LegacyMigrationService.migrateItem(legacyItem, testContext);
    expect(result.ok).toBe(true);

    const article = await ArticleRepository.getByCode('SAFE-001');
    expect(article!.tags).toContain('CE_CRITICAL');
    expect(article!.tags).toContain('SAFETY_CRITICAL');
  });
});

// ============================================
// BULK MIGRATION TESTS
// ============================================

describe('LegacyMigrationService - Migrate All', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  test('should migrate all legacy items', async () => {
    await createLegacyItem({ articleNumber: 'BULK-001', name: 'Item 1' });
    await createLegacyItem({ articleNumber: 'BULK-002', name: 'Item 2' });
    await createLegacyItem({ articleNumber: 'BULK-003', name: 'Item 3' });

    const result = await LegacyMigrationService.migrateAll(testContext);

    expect(result.totalItems).toBe(3);
    expect(result.migratedCount).toBe(3);
    expect(result.skippedCount).toBe(0);
    expect(result.errorCount).toBe(0);
  });

  test('should skip already migrated items in bulk', async () => {
    // Create and migrate one item
    const firstItem = await createLegacyItem({ articleNumber: 'FIRST-001' });
    await LegacyMigrationService.migrateItem(firstItem, testContext);

    // Create more items
    await createLegacyItem({ articleNumber: 'SECOND-001' });
    await createLegacyItem({ articleNumber: 'THIRD-001' });

    const result = await LegacyMigrationService.migrateAll(testContext);

    expect(result.totalItems).toBe(3);
    expect(result.migratedCount).toBe(2);
    expect(result.skippedCount).toBe(1);
    expect(result.skippedItems[0].code).toBe('FIRST-001');
  });

  test('should return detailed migration result', async () => {
    await createLegacyItem({ articleNumber: 'RES-001', name: 'Result Item' });

    const result = await LegacyMigrationService.migrateAll(testContext);

    expect(result.migratedItems.length).toBe(1);
    expect(result.migratedItems[0].code).toBe('RES-001');
    expect(result.migratedItems[0].articleId).toBeTruthy();
    expect(result.migratedItems[0].versionId).toBeTruthy();
  });
});

// ============================================
// DEDUPLICATION TESTS
// ============================================

describe('LegacyMigrationService - Deduplication', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  test('should not create duplicate articles', async () => {
    const legacyItem = await createLegacyItem({ articleNumber: 'DEDUP-001' });

    // Migrate twice
    await LegacyMigrationService.migrateItem(legacyItem, testContext);
    await LegacyMigrationService.migrateItem(legacyItem, testContext);

    // Count articles with this code
    const articles = await ArticleRepository.getAll();
    const matching = articles.filter(a => a.code === 'DEDUP-001');

    expect(matching.length).toBe(1);
  });

  test('should report isItemMigrated correctly', async () => {
    const legacyItem = await createLegacyItem({ articleNumber: 'CHECK-001' });

    // Before migration
    const beforeMigration = await LegacyMigrationService.isItemMigrated('CHECK-001');
    expect(beforeMigration).toBe(false);

    // After migration
    await LegacyMigrationService.migrateItem(legacyItem, testContext);
    const afterMigration = await LegacyMigrationService.isItemMigrated('CHECK-001');
    expect(afterMigration).toBe(true);
  });
});

// ============================================
// VERSIONING TESTS
// ============================================

describe('LegacyMigrationService - Versioning', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  test('should create version 1 for migrated articles', async () => {
    const legacyItem = await createLegacyItem({ articleNumber: 'VER-001' });

    const result = await LegacyMigrationService.migrateItem(legacyItem, testContext);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const version = await ArticleVersionRepository.getById(result.value.versionId);
    expect(version!.versionNumber).toBe(1);
  });

  test('should set currentVersionId on article', async () => {
    const legacyItem = await createLegacyItem({ articleNumber: 'CUR-001' });

    const result = await LegacyMigrationService.migrateItem(legacyItem, testContext);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const article = await ArticleRepository.getByCode('CUR-001');
    expect(article!.currentVersionId).toBe(result.value.versionId);
  });

  test('should preserve pricing in version', async () => {
    const legacyItem = await createLegacyItem({
      articleNumber: 'PRICE-001',
      listPriceExclVat: 9999,
      costPrice: 5555,
    });

    const result = await LegacyMigrationService.migrateItem(legacyItem, testContext);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const version = await ArticleVersionRepository.getById(result.value.versionId);
    expect(version!.sellPrice).toBe(9999);
    expect(version!.costPrice).toBe(5555);
  });
});

// ============================================
// MIGRATION STATUS TESTS
// ============================================

describe('LegacyMigrationService - Migration Status', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  test('should report migration status correctly', async () => {
    await createLegacyItem({ articleNumber: 'STAT-001' });
    await createLegacyItem({ articleNumber: 'STAT-002' });
    await createLegacyItem({ articleNumber: 'STAT-003' });

    // Migrate one
    const items = await EquipmentCatalogService.getAll();
    await LegacyMigrationService.migrateItem(items[0], testContext);

    const status = await LegacyMigrationService.getMigrationStatus();

    expect(status.totalLegacy).toBe(3);
    expect(status.alreadyMigrated).toBe(1);
    expect(status.pendingMigration).toBe(2);
  });
});

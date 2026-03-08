/**
 * BOMService Tests - v4
 * Tests for BOM generation using Library v4 (Articles and Kits)
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { BOMService } from '@/domain/services/BOMService';
import {
  LibraryCategoryService,
  LibrarySubcategoryService,
  LibraryArticleService,
  LibraryKitService,
} from '@/domain/services';
import type { ConfigurationItem, ConfigurationItemType } from '@/domain/models';
import type { AuditContext } from '@/domain/audit/AuditService';
import { clearAllTestData } from './testUtils';

const testContext: AuditContext = {
  userId: 'test-user',
  userName: 'Test User',
};

function createConfigItem(
  overrides: Partial<ConfigurationItem> & { name: string; itemType: ConfigurationItemType }
): ConfigurationItem {
  return {
    id: `item-${Math.random().toString(36).substring(7)}`,
    itemType: overrides.itemType,
    isCustom: overrides.isCustom ?? false,
    category: overrides.category ?? 'Test',
    name: overrides.name,
    quantity: overrides.quantity ?? 1,
    unit: overrides.unit ?? 'pcs',
    unitPriceExclVat: overrides.unitPriceExclVat ?? 100,
    lineTotalExclVat: overrides.lineTotalExclVat ?? (overrides.quantity ?? 1) * (overrides.unitPriceExclVat ?? 100),
    isIncluded: overrides.isIncluded ?? true,
    ceRelevant: overrides.ceRelevant ?? false,
    safetyCritical: overrides.safetyCritical ?? false,
    sortOrder: overrides.sortOrder ?? 0,
    articleId: overrides.articleId,
    articleVersionId: overrides.articleVersionId,
    kitId: overrides.kitId,
    kitVersionId: overrides.kitVersionId,
    catalogItemId: overrides.catalogItemId,
    catalogVersionId: overrides.catalogVersionId,
    subcategory: overrides.subcategory,
    articleNumber: overrides.articleNumber,
    description: overrides.description,
  };
}

describe('BOMService - Item Type Handling', () => {
  it('should expand CUSTOM items with 60% cost estimation', async () => {
    const items: ConfigurationItem[] = [
      createConfigItem({
        name: 'Custom Navigation Display',
        itemType: 'CUSTOM',
        isCustom: true,
        category: 'Navigation',
        quantity: 1,
        unitPriceExclVat: 1000,
      }),
    ];

    const bomItems = await BOMService.expandToBOMItemsAsync(items);

    expect(bomItems.length).toBe(1);
    expect(bomItems[0].name).toBe('Custom Navigation Display');
    expect(bomItems[0].unitCost).toBe(600); // 60% of 1000
    expect(bomItems[0].totalCost).toBe(600);
  });

  it('should expand LEGACY items using hardcoded mapping if available', async () => {
    const items: ConfigurationItem[] = [
      createConfigItem({
        name: 'Electric Motor 20kW',
        itemType: 'LEGACY',
        category: 'Propulsion',
        quantity: 1,
        unitPriceExclVat: 18000,
      }),
    ];

    const bomItems = await BOMService.expandToBOMItemsAsync(items);

    // Should explode using legacy mapping
    expect(bomItems.length).toBeGreaterThan(0);
    expect(bomItems.some(i => i.articleNumber === 'EM-20-001')).toBe(true);
  });

  it('should fall back to custom expansion for unknown LEGACY items', async () => {
    const items: ConfigurationItem[] = [
      createConfigItem({
        name: 'Unknown Legacy Item',
        itemType: 'LEGACY',
        category: 'Other',
        quantity: 2,
        unitPriceExclVat: 500,
      }),
    ];

    const bomItems = await BOMService.expandToBOMItemsAsync(items);

    expect(bomItems.length).toBe(1);
    expect(bomItems[0].name).toBe('Unknown Legacy Item');
    expect(bomItems[0].quantity).toBe(2);
    expect(bomItems[0].unitCost).toBe(300); // 60% of 500
    expect(bomItems[0].totalCost).toBe(600);
  });

  it('should aggregate duplicate items from different config lines', async () => {
    const items: ConfigurationItem[] = [
      createConfigItem({
        id: 'item-1',
        name: 'Electric Motor 20kW',
        itemType: 'LEGACY',
        category: 'Propulsion',
        quantity: 1,
        unitPriceExclVat: 18000,
      }),
      createConfigItem({
        id: 'item-2',
        name: 'Electric Motor 20kW',
        itemType: 'LEGACY',
        category: 'Propulsion',
        quantity: 1,
        unitPriceExclVat: 18000,
      }),
    ];

    const bomItems = await BOMService.expandToBOMItemsAsync(items);

    // Should aggregate same parts
    const motorUnit = bomItems.find(i => i.articleNumber === 'EM-20-001');
    expect(motorUnit).toBeDefined();
    expect(motorUnit!.quantity).toBe(2); // Aggregated from 2 config items
  });

  it('should exclude non-included items', async () => {
    const items: ConfigurationItem[] = [
      createConfigItem({
        name: 'Included Item',
        itemType: 'CUSTOM',
        isCustom: true,
        isIncluded: true,
        unitPriceExclVat: 100,
      }),
      createConfigItem({
        name: 'Excluded Item',
        itemType: 'CUSTOM',
        isCustom: true,
        isIncluded: false,
        unitPriceExclVat: 200,
      }),
    ];

    const bomItems = await BOMService.expandToBOMItemsAsync(items);

    expect(bomItems.length).toBe(1);
    expect(bomItems[0].name).toBe('Included Item');
  });
});

describe('BOMService - ARTICLE Items', () => {
  let subcategoryId: string;
  let articleId: string;
  let articleVersionId: string;

  beforeEach(async () => {
    await clearAllTestData();

    // Create category and subcategory
    const catResult = await LibraryCategoryService.create(
      { name: 'Test Category' },
      testContext
    );
    if (!catResult.ok) throw new Error('Failed to create category');

    const subResult = await LibrarySubcategoryService.create(
      { categoryId: catResult.value.id, name: 'Test Subcategory' },
      testContext
    );
    if (!subResult.ok) throw new Error('Failed to create subcategory');
    subcategoryId = subResult.value.id;

    // Create and approve an article
    const articleResult = await LibraryArticleService.create(
      {
        code: 'TEST-ARTICLE-001',
        name: 'Test Article',
        subcategoryId,
        unit: 'pcs',
        sellPrice: 500,
        costPrice: 350,
      },
      testContext
    );
    if (!articleResult.ok) throw new Error('Failed to create article');
    articleId = articleResult.value.id;
    articleVersionId = articleResult.value.currentVersionId!;

    // Approve the article version
    await LibraryArticleService.approveVersion(articleVersionId, testContext);
  });

  it('should expand ARTICLE items using actual ArticleVersion data', async () => {
    const items: ConfigurationItem[] = [
      createConfigItem({
        name: 'Test Article',
        itemType: 'ARTICLE',
        articleId,
        articleVersionId,
        category: 'Test Category',
        quantity: 2,
        unitPriceExclVat: 500,
      }),
    ];

    const bomItems = await BOMService.expandToBOMItemsAsync(items);

    expect(bomItems.length).toBe(1);
    expect(bomItems[0].name).toBe('Test Article');
    expect(bomItems[0].quantity).toBe(2);
    expect(bomItems[0].unitCost).toBe(350); // Actual cost price from ArticleVersion
    expect(bomItems[0].totalCost).toBe(700);
  });

  it('should fall back to 60% estimation if costPrice is missing', async () => {
    // Create article without cost price
    const noCostResult = await LibraryArticleService.create(
      {
        code: 'NO-COST-001',
        name: 'No Cost Article',
        subcategoryId,
        unit: 'pcs',
        sellPrice: 1000,
        // No costPrice
      },
      testContext
    );
    if (!noCostResult.ok) throw new Error('Failed to create article');
    await LibraryArticleService.approveVersion(noCostResult.value.currentVersionId!, testContext);

    const items: ConfigurationItem[] = [
      createConfigItem({
        name: 'No Cost Article',
        itemType: 'ARTICLE',
        articleId: noCostResult.value.id,
        articleVersionId: noCostResult.value.currentVersionId!,
        category: 'Test',
        quantity: 1,
        unitPriceExclVat: 1000,
      }),
    ];

    const bomItems = await BOMService.expandToBOMItemsAsync(items);

    expect(bomItems.length).toBe(1);
    expect(bomItems[0].unitCost).toBe(600); // 60% of 1000 sellPrice
  });
});

describe('BOMService - KIT Items', () => {
  let subcategoryId: string;
  let articleVersionId1: string;
  let articleVersionId2: string;
  let kitId: string;
  let kitVersionId: string;

  beforeEach(async () => {
    await clearAllTestData();

    // Create category and subcategory
    const catResult = await LibraryCategoryService.create(
      { name: 'Kit Category' },
      testContext
    );
    if (!catResult.ok) throw new Error('Failed to create category');

    const subResult = await LibrarySubcategoryService.create(
      { categoryId: catResult.value.id, name: 'Kit Subcategory' },
      testContext
    );
    if (!subResult.ok) throw new Error('Failed to create subcategory');
    subcategoryId = subResult.value.id;

    // Create and approve two articles for the kit
    const article1 = await LibraryArticleService.create(
      {
        code: 'KIT-COMP-001',
        name: 'Kit Component 1',
        subcategoryId,
        unit: 'pcs',
        sellPrice: 100,
        costPrice: 70,
      },
      testContext
    );
    if (!article1.ok) throw new Error('Failed to create article 1');
    articleVersionId1 = article1.value.currentVersionId!;
    await LibraryArticleService.approveVersion(articleVersionId1, testContext);

    const article2 = await LibraryArticleService.create(
      {
        code: 'KIT-COMP-002',
        name: 'Kit Component 2',
        subcategoryId,
        unit: 'pcs',
        sellPrice: 200,
        costPrice: 140,
      },
      testContext
    );
    if (!article2.ok) throw new Error('Failed to create article 2');
    articleVersionId2 = article2.value.currentVersionId!;
    await LibraryArticleService.approveVersion(articleVersionId2, testContext);

    // Create and approve a kit
    const kitResult = await LibraryKitService.create(
      {
        code: 'TEST-KIT-001',
        name: 'Test Kit',
        subcategoryId,
        sellPrice: 500,
        explodeInBOM: true,
        salesOnly: false,
        components: [
          { articleVersionId: articleVersionId1, qty: 2 },
          { articleVersionId: articleVersionId2, qty: 1 },
        ],
      },
      testContext
    );
    if (!kitResult.ok) throw new Error('Failed to create kit');
    kitId = kitResult.value.id;
    kitVersionId = kitResult.value.currentVersionId!;
    await LibraryKitService.approveVersion(kitVersionId, testContext);
  });

  it('should explode KIT items into component articles when explodeInBOM is true', async () => {
    const items: ConfigurationItem[] = [
      createConfigItem({
        name: 'Test Kit',
        itemType: 'KIT',
        kitId,
        kitVersionId,
        category: 'Kit Category',
        quantity: 1,
        unitPriceExclVat: 500,
      }),
    ];

    const bomItems = await BOMService.expandToBOMItemsAsync(items);

    expect(bomItems.length).toBe(2); // 2 different components

    const comp1 = bomItems.find(i => i.articleNumber === 'KIT-COMP-001');
    expect(comp1).toBeDefined();
    expect(comp1!.quantity).toBe(2);
    expect(comp1!.unitCost).toBe(70);
    expect(comp1!.totalCost).toBe(140);

    const comp2 = bomItems.find(i => i.articleNumber === 'KIT-COMP-002');
    expect(comp2).toBeDefined();
    expect(comp2!.quantity).toBe(1);
    expect(comp2!.unitCost).toBe(140);
    expect(comp2!.totalCost).toBe(140);
  });

  it('should multiply component quantities by kit quantity', async () => {
    const items: ConfigurationItem[] = [
      createConfigItem({
        name: 'Test Kit',
        itemType: 'KIT',
        kitId,
        kitVersionId,
        category: 'Kit Category',
        quantity: 3, // 3 kits
        unitPriceExclVat: 500,
      }),
    ];

    const bomItems = await BOMService.expandToBOMItemsAsync(items);

    const comp1 = bomItems.find(i => i.articleNumber === 'KIT-COMP-001');
    expect(comp1!.quantity).toBe(6); // 2 per kit × 3 kits
    expect(comp1!.totalCost).toBe(420); // 6 × 70

    const comp2 = bomItems.find(i => i.articleNumber === 'KIT-COMP-002');
    expect(comp2!.quantity).toBe(3); // 1 per kit × 3 kits
    expect(comp2!.totalCost).toBe(420); // 3 × 140
  });

  it('should NOT explode salesOnly kits', async () => {
    // Create a sales-only kit
    const salesOnlyKit = await LibraryKitService.create(
      {
        code: 'SALES-KIT-001',
        name: 'Sales Only Kit',
        subcategoryId,
        sellPrice: 800,
        explodeInBOM: false,
        salesOnly: true,
        components: [
          { articleVersionId: articleVersionId1, qty: 5 },
        ],
      },
      testContext
    );
    if (!salesOnlyKit.ok) throw new Error('Failed to create sales-only kit');
    await LibraryKitService.approveVersion(salesOnlyKit.value.currentVersionId!, testContext);

    const items: ConfigurationItem[] = [
      createConfigItem({
        name: 'Sales Only Kit',
        itemType: 'KIT',
        kitId: salesOnlyKit.value.id,
        kitVersionId: salesOnlyKit.value.currentVersionId!,
        category: 'Kit Category',
        quantity: 1,
        unitPriceExclVat: 800,
      }),
    ];

    const bomItems = await BOMService.expandToBOMItemsAsync(items);

    // Should be a single line item, not exploded
    expect(bomItems.length).toBe(1);
    expect(bomItems[0].name).toBe('Sales Only Kit');
    expect(bomItems[0].unit).toBe('set');
  });
});

describe('BOMService - Sync Fallback', () => {
  it('should handle LEGACY items in sync mode', () => {
    const items: ConfigurationItem[] = [
      createConfigItem({
        name: 'Electric Motor 20kW',
        itemType: 'LEGACY',
        category: 'Propulsion',
        quantity: 1,
        unitPriceExclVat: 18000,
      }),
    ];

    // Use sync method
    const bomItems = BOMService.expandToBOMItems(items);

    expect(bomItems.length).toBeGreaterThan(0);
  });

  it('should treat ARTICLE and KIT as custom in sync mode (fallback)', () => {
    const items: ConfigurationItem[] = [
      createConfigItem({
        name: 'Article Item',
        itemType: 'ARTICLE',
        articleVersionId: 'some-version-id',
        category: 'Test',
        quantity: 1,
        unitPriceExclVat: 500,
      }),
    ];

    // Use sync method - can't load async data
    const bomItems = BOMService.expandToBOMItems(items);

    expect(bomItems.length).toBe(1);
    expect(bomItems[0].unitCost).toBe(300); // 60% fallback
  });
});

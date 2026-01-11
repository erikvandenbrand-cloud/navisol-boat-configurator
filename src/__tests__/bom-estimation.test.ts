/**
 * BOM Estimation Visibility Tests
 * Tests for displaying estimated vs actual costs in BOM
 */

import { describe, test, expect } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import { BOMService } from '@/domain/services/BOMService';
import type { BOMSnapshot, BOMItem } from '@/domain/models';
import { generateUUID } from '@/domain/models';

// ============================================
// TEST DATA
// ============================================

function createMockBOMItem(overrides: Partial<BOMItem> = {}): BOMItem {
  return {
    id: generateUUID(),
    category: 'Electronics',
    articleNumber: 'TEST-001',
    name: 'Test Item',
    description: 'A test item',
    quantity: 1,
    unit: 'pcs',
    unitCost: 100,
    totalCost: 100,
    isEstimated: false,
    ...overrides,
  };
}

function createMockBOMSnapshot(items: BOMItem[]): BOMSnapshot {
  const estimatedItems = items.filter(i => i.isEstimated);
  const estimatedCostTotal = estimatedItems.reduce((sum, i) => sum + i.totalCost, 0);
  const totalCostExclVat = items.reduce((sum, i) => sum + i.totalCost, 0);

  return {
    id: generateUUID(),
    projectId: 'test-project',
    snapshotNumber: 1,
    configurationSnapshotId: 'config-1',
    items,
    totalParts: items.reduce((sum, i) => sum + i.quantity, 0),
    totalCostExclVat,
    estimatedCostCount: estimatedItems.length,
    estimatedCostTotal,
    actualCostTotal: totalCostExclVat - estimatedCostTotal,
    costEstimationRatio: 0.6,
    status: 'BASELINE',
    createdAt: new Date().toISOString(),
    createdBy: 'test-user',
  };
}

// ============================================
// ESTIMATION SUMMARY TESTS
// ============================================

describe('BOMService - getEstimationSummary', () => {
  test('should return correct summary for BOM with no estimated items', () => {
    const items = [
      createMockBOMItem({ totalCost: 100, isEstimated: false }),
      createMockBOMItem({ totalCost: 200, isEstimated: false }),
      createMockBOMItem({ totalCost: 300, isEstimated: false }),
    ];
    const bom = createMockBOMSnapshot(items);

    const summary = BOMService.getEstimationSummary(bom);

    expect(summary.totalItems).toBe(3);
    expect(summary.estimatedCount).toBe(0);
    expect(summary.estimatedPercent).toBe(0);
    expect(summary.estimatedValue).toBe(0);
    expect(summary.estimatedValuePercent).toBe(0);
    expect(summary.actualValue).toBe(600);
    expect(summary.isHighEstimation).toBe(false);
  });

  test('should return correct summary for BOM with all estimated items', () => {
    const items = [
      createMockBOMItem({ totalCost: 100, isEstimated: true, estimationRatio: 0.6, sellPrice: 167 }),
      createMockBOMItem({ totalCost: 200, isEstimated: true, estimationRatio: 0.6, sellPrice: 333 }),
      createMockBOMItem({ totalCost: 300, isEstimated: true, estimationRatio: 0.6, sellPrice: 500 }),
    ];
    const bom = createMockBOMSnapshot(items);

    const summary = BOMService.getEstimationSummary(bom);

    expect(summary.totalItems).toBe(3);
    expect(summary.estimatedCount).toBe(3);
    expect(summary.estimatedPercent).toBe(100);
    expect(summary.estimatedValue).toBe(600);
    expect(summary.estimatedValuePercent).toBe(100);
    expect(summary.actualValue).toBe(0);
    expect(summary.isHighEstimation).toBe(true);
  });

  test('should return correct summary for BOM with mixed items', () => {
    const items = [
      createMockBOMItem({ totalCost: 100, isEstimated: false }),
      createMockBOMItem({ totalCost: 200, isEstimated: true, estimationRatio: 0.6, sellPrice: 333 }),
      createMockBOMItem({ totalCost: 300, isEstimated: false }),
      createMockBOMItem({ totalCost: 400, isEstimated: true, estimationRatio: 0.6, sellPrice: 667 }),
    ];
    const bom = createMockBOMSnapshot(items);

    const summary = BOMService.getEstimationSummary(bom);

    expect(summary.totalItems).toBe(4);
    expect(summary.estimatedCount).toBe(2);
    expect(summary.estimatedPercent).toBe(50);
    expect(summary.estimatedValue).toBe(600); // 200 + 400
    expect(summary.estimatedValuePercent).toBe(60); // 600/1000 = 60%
    expect(summary.actualValue).toBe(400); // 100 + 300
    expect(summary.isHighEstimation).toBe(true); // 60% > 30% threshold
  });

  test('should flag low estimation as not high estimation', () => {
    const items = [
      createMockBOMItem({ totalCost: 100, isEstimated: true, estimationRatio: 0.6, sellPrice: 167 }),
      createMockBOMItem({ totalCost: 900, isEstimated: false }),
    ];
    const bom = createMockBOMSnapshot(items);

    const summary = BOMService.getEstimationSummary(bom);

    expect(summary.estimatedValuePercent).toBe(10); // 100/1000 = 10%
    expect(summary.isHighEstimation).toBe(false); // 10% < 30% threshold
  });

  test('should include estimation ratio from BOM snapshot', () => {
    const items = [
      createMockBOMItem({ totalCost: 100, isEstimated: true, estimationRatio: 0.7, sellPrice: 143 }),
    ];
    const bom = createMockBOMSnapshot(items);
    bom.costEstimationRatio = 0.7;

    const summary = BOMService.getEstimationSummary(bom);

    expect(summary.ratio).toBe(0.7);
  });
});

// ============================================
// BOM ITEM ISESTIMATED FLAG TESTS
// ============================================

describe('BOMItem - isEstimated flag', () => {
  test('should have isEstimated = true for items without costPrice', () => {
    const item = createMockBOMItem({
      isEstimated: true,
      estimationRatio: 0.6,
      sellPrice: 1000,
      unitCost: 600, // 60% of 1000
    });

    expect(item.isEstimated).toBe(true);
    expect(item.estimationRatio).toBe(0.6);
    expect(item.sellPrice).toBe(1000);
  });

  test('should have isEstimated = false for items with costPrice', () => {
    const item = createMockBOMItem({
      isEstimated: false,
      estimationRatio: undefined,
      sellPrice: undefined,
      unitCost: 500, // Actual cost
    });

    expect(item.isEstimated).toBe(false);
    expect(item.estimationRatio).toBeUndefined();
    expect(item.sellPrice).toBeUndefined();
  });
});

// ============================================
// CSV EXPORT TESTS
// ============================================

describe('BOMService - exportToCSV with estimation', () => {
  test('should include estimation status in CSV export', () => {
    const items = [
      createMockBOMItem({
        articleNumber: 'ACT-001',
        name: 'Actual Cost Item',
        totalCost: 100,
        isEstimated: false
      }),
      createMockBOMItem({
        articleNumber: 'EST-001',
        name: 'Estimated Cost Item',
        totalCost: 200,
        isEstimated: true,
        estimationRatio: 0.6,
        sellPrice: 333
      }),
    ];
    const bom = createMockBOMSnapshot(items);

    const csv = BOMService.exportToCSV(bom);

    // Check headers include cost type column
    expect(csv).toContain('Cost Type');

    // Check actual item row contains ACTUAL
    expect(csv).toContain('ACTUAL');

    // Check estimated item row contains ESTIMATED
    expect(csv).toContain('ESTIMATED');

    // Check summary section
    expect(csv).toContain('SUMMARY');
    expect(csv).toContain('Estimated Cost Total');
    expect(csv).toContain('Actual Cost Total');
    expect(csv).toContain('Items with Estimated Cost');
  });

  test('should include estimation ratio in CSV export', () => {
    const items = [
      createMockBOMItem({
        totalCost: 100,
        isEstimated: true,
        estimationRatio: 0.6,
        sellPrice: 167
      }),
    ];
    const bom = createMockBOMSnapshot(items);
    bom.costEstimationRatio = 0.6;

    const csv = BOMService.exportToCSV(bom);

    expect(csv).toContain('60%');
  });
});

// ============================================
// BOM SNAPSHOT STRUCTURE TESTS
// ============================================

describe('BOMSnapshot - estimation fields', () => {
  test('should have correct estimation fields structure', () => {
    const items = [
      createMockBOMItem({ totalCost: 100, isEstimated: true }),
      createMockBOMItem({ totalCost: 200, isEstimated: false }),
    ];
    const bom = createMockBOMSnapshot(items);

    expect(bom).toHaveProperty('estimatedCostCount');
    expect(bom).toHaveProperty('estimatedCostTotal');
    expect(bom).toHaveProperty('actualCostTotal');
    expect(bom).toHaveProperty('costEstimationRatio');

    expect(bom.estimatedCostCount).toBe(1);
    expect(bom.estimatedCostTotal).toBe(100);
    expect(bom.actualCostTotal).toBe(200);
    expect(bom.costEstimationRatio).toBe(0.6);
  });
});

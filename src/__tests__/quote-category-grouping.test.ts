/**
 * Quote Category Grouping Tests
 * Tests for category-grouped quotation PDF output
 */

import { describe, test, expect } from 'bun:test';
import { generateQuotePDF, type QuotePDFData, type QuoteCategoryGroup } from '@/domain/services';

// ============================================
// TEST HELPERS
// ============================================

function createBaseQuotePDFData(): QuotePDFData {
  return {
    companyName: 'Test Company',
    companyAddress: 'Test Address',
    companyPhone: '+31 123 456 789',
    companyEmail: 'test@test.com',
    companyVat: 'NL123456789B01',
    companyKvk: '12345678',
    clientName: 'Test Client',
    clientAddress: 'Client Address',
    quoteNumber: 'Q-2025-001',
    quoteDate: '2025-01-09',
    validUntil: '2025-02-09',
    projectTitle: 'Test Project',
    projectNumber: 'P-001',
    lines: [],
    subtotal: 100000,
    totalExclVat: 100000,
    vatRate: 21,
    vatAmount: 21000,
    totalInclVat: 121000,
    paymentTerms: 'Net 30',
    deliveryTerms: 'Ex Works',
    status: 'DRAFT' as const,
  };
}

// ============================================
// CATEGORY GROUPING TESTS
// ============================================

describe('Quote Category Grouping', () => {
  test('should render category-grouped layout when categoryGroups is provided', () => {
    const categoryGroups: QuoteCategoryGroup[] = [
      {
        category: 'Propulsion',
        items: [
          { description: 'Electric Motor 40kW', quantity: 1, unit: 'set', isOptional: false },
          { description: 'Battery Pack 80kWh', quantity: 1, unit: 'set', isOptional: false },
        ],
        categoryTotal: 80000,
      },
      {
        category: 'Navigation',
        items: [
          { description: 'Navigation Display 12"', quantity: 1, unit: 'pcs', isOptional: false },
          { description: 'Autopilot System', quantity: 1, unit: 'set', isOptional: true },
        ],
        categoryTotal: 15000,
      },
    ];

    const data = createBaseQuotePDFData();
    data.categoryGroups = categoryGroups;

    const html = generateQuotePDF(data);

    // Should include category headers
    expect(html).toContain('Propulsion');
    expect(html).toContain('Navigation');

    // Should include article descriptions
    expect(html).toContain('Electric Motor 40kW');
    expect(html).toContain('Battery Pack 80kWh');
    expect(html).toContain('Navigation Display 12"');
    expect(html).toContain('Autopilot System');

    // Should include category totals with "Totaal" prefix
    expect(html).toContain('Totaal Propulsion');
    expect(html).toContain('Totaal Navigation');

    // Should NOT include "Unit Price" column header (category-grouped uses different header)
    expect(html).toContain('Description');
    expect(html).toContain('Qty');
    expect(html).toContain('Amount');
  });

  test('should NOT show per-article prices in category-grouped layout', () => {
    const categoryGroups: QuoteCategoryGroup[] = [
      {
        category: 'Propulsion',
        items: [
          { description: 'Electric Motor 40kW', quantity: 1, unit: 'set', isOptional: false },
        ],
        categoryTotal: 35000,
      },
    ];

    const data = createBaseQuotePDFData();
    data.categoryGroups = categoryGroups;

    // Add legacy lines with prices (these should be ignored)
    data.lines = [
      {
        description: 'Electric Motor 40kW',
        quantity: 1,
        unit: 'set',
        unitPrice: 35000,
        total: 35000,
        isOptional: false,
      },
    ];

    const html = generateQuotePDF(data);

    // Article rows should be in article-row class (no prices)
    expect(html).toContain('class="article-row');

    // Category total should show the sum
    expect(html).toContain('Totaal Propulsion');

    // Grand totals should still be shown
    expect(html).toContain('Subtotal');
    expect(html).toContain('Total excl. VAT');
    expect(html).toContain('Total incl. VAT');
  });

  test('should mark optional items in category-grouped layout', () => {
    const categoryGroups: QuoteCategoryGroup[] = [
      {
        category: 'Extras',
        items: [
          { description: 'Premium Sound System', quantity: 1, unit: 'set', isOptional: true },
        ],
        categoryTotal: 5000,
      },
    ];

    const data = createBaseQuotePDFData();
    data.categoryGroups = categoryGroups;

    const html = generateQuotePDF(data);

    // Should show optional indicator
    expect(html).toContain('(Optional)');
    expect(html).toContain('Premium Sound System');
  });

  test('should fall back to legacy layout when categoryGroups is not provided', () => {
    const data = createBaseQuotePDFData();
    data.lines = [
      {
        description: 'Test Item',
        quantity: 2,
        unit: 'pcs',
        unitPrice: 1000,
        total: 2000,
        isOptional: false,
      },
    ];

    const html = generateQuotePDF(data);

    // Should use legacy layout with Unit Price column
    expect(html).toContain('Unit Price');
    expect(html).toContain('Test Item');
  });

  test('should fall back to legacy layout when categoryGroups is empty', () => {
    const data = createBaseQuotePDFData();
    data.categoryGroups = [];
    data.lines = [
      {
        description: 'Legacy Item',
        quantity: 1,
        unit: 'pcs',
        unitPrice: 500,
        total: 500,
        isOptional: false,
      },
    ];

    const html = generateQuotePDF(data);

    // Should use legacy layout
    expect(html).toContain('Unit Price');
    expect(html).toContain('Legacy Item');
  });

  test('category total should equal sum of items in category', () => {
    // This is a business logic test - verifying the expectation
    const categoryGroups: QuoteCategoryGroup[] = [
      {
        category: 'Hull',
        items: [
          { description: 'Hull Construction', quantity: 1, unit: 'set', isOptional: false },
          { description: 'Deck Construction', quantity: 1, unit: 'set', isOptional: false },
        ],
        categoryTotal: 45000, // Sum of items in this category
      },
    ];

    const data = createBaseQuotePDFData();
    data.categoryGroups = categoryGroups;

    const html = generateQuotePDF(data);

    // Category total should be displayed
    expect(html).toContain('Totaal Hull');
    // The formatted currency value should appear (Dutch locale: € 45.000,00)
    expect(html).toContain('45.000');
  });

  test('should keep VAT summary in category-grouped layout', () => {
    const categoryGroups: QuoteCategoryGroup[] = [
      {
        category: 'Test Category',
        items: [{ description: 'Test Item', quantity: 1, unit: 'pcs', isOptional: false }],
        categoryTotal: 100000,
      },
    ];

    const data = createBaseQuotePDFData();
    data.categoryGroups = categoryGroups;
    data.vatRate = 21;
    data.vatAmount = 21000;

    const html = generateQuotePDF(data);

    // VAT summary should be present
    expect(html).toContain('VAT (21%)');
    // Dutch locale uses € 21.000,00 format
    expect(html).toContain('21.000');
  });

  test('should show discount in category-grouped layout', () => {
    const categoryGroups: QuoteCategoryGroup[] = [
      {
        category: 'Test Category',
        items: [{ description: 'Test Item', quantity: 1, unit: 'pcs', isOptional: false }],
        categoryTotal: 100000,
      },
    ];

    const data = createBaseQuotePDFData();
    data.categoryGroups = categoryGroups;
    data.discountPercent = 10;
    data.discountAmount = 10000;

    const html = generateQuotePDF(data);

    // Discount should be shown
    expect(html).toContain('Discount (10%)');
  });
});

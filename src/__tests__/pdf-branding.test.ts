/**
 * PDF Branding Tests
 * Tests that global branding (watermark background and header logo) is applied to all PDFs
 */

import { describe, test, expect } from 'bun:test';
import { generateQuotePDF, generateInvoicePDF, generateDeliveryNotePDF, type QuotePDFData, type InvoicePDFData, type DeliveryNotePDFData } from '@/domain/services';

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

function createBaseInvoicePDFData(): InvoicePDFData {
  return {
    companyName: 'Test Company',
    companyAddress: 'Test Address',
    companyPhone: '+31 123 456 789',
    companyEmail: 'test@test.com',
    companyVat: 'NL123456789B01',
    companyKvk: '12345678',
    companyIban: 'NL12ABCD1234567890',
    clientName: 'Test Client',
    clientAddress: 'Client Address',
    invoiceNumber: 'INV-2025-001',
    invoiceDate: '2025-01-09',
    dueDate: '2025-02-09',
    projectTitle: 'Test Project',
    projectNumber: 'P-001',
    lines: [],
    subtotal: 50000,
    totalExclVat: 50000,
    vatRate: 21,
    vatAmount: 10500,
    totalInclVat: 60500,
    paymentTerms: 'Net 30',
    status: 'FINAL' as const,
  };
}

function createBaseDeliveryNotePDFData(): DeliveryNotePDFData {
  return {
    companyName: 'Test Company',
    companyAddress: 'Test Address',
    companyPhone: '+31 123 456 789',
    clientName: 'Test Client',
    clientAddress: 'Client Address',
    deliveryNoteNumber: 'DN-2025-001',
    deliveryDate: '2025-01-09',
    projectTitle: 'Test Project',
    projectNumber: 'P-001',
    items: [],
    status: 'DRAFT' as const,
  };
}

// ============================================
// PDF BRANDING TESTS
// ============================================

describe('PDF Global Branding', () => {
  describe('Background Watermark', () => {
    test('Quote PDF should include background watermark', () => {
      const data = createBaseQuotePDFData();
      const html = generateQuotePDF(data);

      // Should include the watermark container
      expect(html).toContain('pdf-background-watermark');
      // Should include the propeller/wheel SVG elements
      expect(html).toContain('Propeller/Wheel');
      expect(html).toContain('viewBox="0 0 400 350"');
    });

    test('Invoice PDF should include background watermark', () => {
      const data = createBaseInvoicePDFData();
      const html = generateInvoicePDF(data);

      expect(html).toContain('pdf-background-watermark');
      expect(html).toContain('Propeller/Wheel');
    });

    test('Delivery Note PDF should include background watermark', () => {
      const data = createBaseDeliveryNotePDFData();
      const html = generateDeliveryNotePDF(data);

      expect(html).toContain('pdf-background-watermark');
      expect(html).toContain('Propeller/Wheel');
    });
  });

  describe('Header Logo', () => {
    test('Quote PDF should include header logo', () => {
      const data = createBaseQuotePDFData();
      const html = generateQuotePDF(data);

      // Should include the header logo container
      expect(html).toContain('pdf-header-logo');
      // Should include the NAVISOL text logo SVG
      expect(html).toContain('viewBox="0 0 320 50"');
    });

    test('Invoice PDF should include header logo', () => {
      const data = createBaseInvoicePDFData();
      const html = generateInvoicePDF(data);

      expect(html).toContain('pdf-header-logo');
      expect(html).toContain('viewBox="0 0 320 50"');
    });

    test('Delivery Note PDF should include header logo', () => {
      const data = createBaseDeliveryNotePDFData();
      const html = generateDeliveryNotePDF(data);

      expect(html).toContain('pdf-header-logo');
      expect(html).toContain('viewBox="0 0 320 50"');
    });
  });

  describe('Branding CSS Styles', () => {
    test('PDF should include branding CSS for watermark positioning with large scale', () => {
      const data = createBaseQuotePDFData();
      const html = generateQuotePDF(data);

      // Watermark should be centered, scaled large, and faded
      expect(html).toContain('.pdf-background-watermark');
      expect(html).toContain('opacity: 0.04');
      expect(html).toContain('position: fixed');
      // Watermark should use large scale transform
      expect(html).toContain('scale(1.8)');
      expect(html).toContain('width: 90%');
      expect(html).toContain('max-width: 600px');
    });

    test('PDF should include branding CSS for header logo positioned top-left', () => {
      const data = createBaseQuotePDFData();
      const html = generateQuotePDF(data);

      // Header logo should be at top-left (not centered)
      expect(html).toContain('.pdf-header-logo');
      expect(html).toContain('top: 0');
      expect(html).toContain('left: 0');
      expect(html).toContain('padding: 8px 10mm');
      // .pdf-header-logo block should NOT have text-align: center (extract and check)
      const headerLogoMatch = html.match(/\.pdf-header-logo\s*\{[^}]+\}/);
      expect(headerLogoMatch).not.toBeNull();
      expect(headerLogoMatch![0]).not.toContain('text-align: center');
    });

    test('PDF container should have padding for header logo', () => {
      const data = createBaseQuotePDFData();
      const html = generateQuotePDF(data);

      // Content should have padding to avoid overlap with header logo
      expect(html).toContain('padding-top: 45px');
    });
  });

  describe('Print Media Styles', () => {
    test('PDF should have print-specific styles for branding', () => {
      const data = createBaseQuotePDFData();
      const html = generateQuotePDF(data);

      // Print media query should exist for branding elements
      expect(html).toContain('@media print');
      // Watermark should render on every printed page (position: fixed)
      expect(html).toContain('/* Ensure background watermark renders on every printed page */');
      // Header logo should render on every printed page (position: fixed)
      expect(html).toContain('/* Ensure header logo renders on every printed page */');
    });
  });
});

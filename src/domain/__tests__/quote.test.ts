/**
 * Quote Tests - v4
 * Tests for quote immutability and versioning
 */

import { QuoteRules } from '../rules';
import type { ProjectQuote, QuoteStatus } from '../models';

function createMockQuote(status: QuoteStatus): ProjectQuote {
  return {
    id: 'quote-1',
    projectId: 'project-1',
    quoteNumber: 'QUO-2025-001-v1',
    version: 1,
    status,
    lines: [
      {
        id: 'line-1',
        configurationItemId: 'item-1',
        category: 'Propulsion',
        description: 'Electric Motor 40kW',
        quantity: 1,
        unit: 'set',
        unitPriceExclVat: 35000,
        lineTotalExclVat: 35000,
        isOptional: false,
      },
    ],
    subtotalExclVat: 35000,
    discountPercent: 0,
    discountAmount: 0,
    totalExclVat: 35000,
    vatRate: 21,
    vatAmount: 7350,
    totalInclVat: 42350,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    paymentTerms: '30% deposit, 60% before delivery, 10% at delivery',
    deliveryTerms: 'Ex Works, Maasbracht, Netherlands',
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
  };
}

function createExpiredQuote(): ProjectQuote {
  return {
    ...createMockQuote('SENT'),
    validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  };
}

describe('QuoteRules', () => {
  describe('canEdit', () => {
    it('should allow editing DRAFT quotes', () => {
      const quote = createMockQuote('DRAFT');
      const result = QuoteRules.canEdit(quote);
      expect(result.ok).toBe(true);
    });

    it('should NOT allow editing SENT quotes', () => {
      const quote = createMockQuote('SENT');
      const result = QuoteRules.canEdit(quote);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Only draft quotes');
      }
    });

    it('should NOT allow editing ACCEPTED quotes', () => {
      const quote = createMockQuote('ACCEPTED');
      const result = QuoteRules.canEdit(quote);
      expect(result.ok).toBe(false);
    });

    it('should NOT allow editing REJECTED quotes', () => {
      const quote = createMockQuote('REJECTED');
      const result = QuoteRules.canEdit(quote);
      expect(result.ok).toBe(false);
    });

    it('should NOT allow editing SUPERSEDED quotes', () => {
      const quote = createMockQuote('SUPERSEDED');
      const result = QuoteRules.canEdit(quote);
      expect(result.ok).toBe(false);
    });
  });

  describe('canSend', () => {
    it('should allow sending DRAFT quotes with lines', () => {
      const quote = createMockQuote('DRAFT');
      const result = QuoteRules.canSend(quote);
      expect(result.ok).toBe(true);
    });

    it('should NOT allow sending non-DRAFT quotes', () => {
      const quote = createMockQuote('SENT');
      const result = QuoteRules.canSend(quote);
      expect(result.ok).toBe(false);
    });

    it('should NOT allow sending quotes with no lines', () => {
      const quote = createMockQuote('DRAFT');
      quote.lines = [];
      const result = QuoteRules.canSend(quote);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('at least one line');
      }
    });

    it('should NOT allow sending quotes with zero total', () => {
      const quote = createMockQuote('DRAFT');
      quote.totalInclVat = 0;
      const result = QuoteRules.canSend(quote);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('greater than zero');
      }
    });
  });

  describe('canAccept', () => {
    it('should allow accepting SENT quotes that are not expired', () => {
      const quote = createMockQuote('SENT');
      const result = QuoteRules.canAccept(quote);
      expect(result.ok).toBe(true);
    });

    it('should NOT allow accepting DRAFT quotes', () => {
      const quote = createMockQuote('DRAFT');
      const result = QuoteRules.canAccept(quote);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Only sent quotes');
      }
    });

    it('should NOT allow accepting expired quotes', () => {
      const quote = createExpiredQuote();
      const result = QuoteRules.canAccept(quote);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('expired');
      }
    });

    it('should NOT allow accepting already ACCEPTED quotes', () => {
      const quote = createMockQuote('ACCEPTED');
      const result = QuoteRules.canAccept(quote);
      expect(result.ok).toBe(false);
    });
  });

  describe('isImmutable', () => {
    it('should return false for DRAFT quotes', () => {
      const quote = createMockQuote('DRAFT');
      expect(QuoteRules.isImmutable(quote)).toBe(false);
    });

    it('should return true for SENT quotes', () => {
      const quote = createMockQuote('SENT');
      expect(QuoteRules.isImmutable(quote)).toBe(true);
    });

    it('should return true for ACCEPTED quotes', () => {
      const quote = createMockQuote('ACCEPTED');
      expect(QuoteRules.isImmutable(quote)).toBe(true);
    });

    it('should return true for REJECTED quotes', () => {
      const quote = createMockQuote('REJECTED');
      expect(QuoteRules.isImmutable(quote)).toBe(true);
    });

    it('should return true for SUPERSEDED quotes', () => {
      const quote = createMockQuote('SUPERSEDED');
      expect(QuoteRules.isImmutable(quote)).toBe(true);
    });
  });

  describe('validate', () => {
    it('should pass validation for complete quote', () => {
      const quote = createMockQuote('DRAFT');
      const result = QuoteRules.validate(quote);
      expect(result.ok).toBe(true);
    });

    it('should fail validation for quote without lines', () => {
      const result = QuoteRules.validate({ lines: [] });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some((e: string) => e.includes('at least one line'))).toBe(true);
      }
    });

    it('should fail validation for quote without validity date', () => {
      const result = QuoteRules.validate({
        lines: [{ id: '1' }],
        paymentTerms: 'Test',
        deliveryTerms: 'Test',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some((e: string) => e.includes('Validity date'))).toBe(true);
      }
    });

    it('should fail validation for quote without payment terms', () => {
      const result = QuoteRules.validate({
        lines: [{ id: '1' }],
        validUntil: new Date().toISOString(),
        deliveryTerms: 'Test',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some((e: string) => e.includes('Payment terms'))).toBe(true);
      }
    });

    it('should fail validation for quote without delivery terms', () => {
      const result = QuoteRules.validate({
        lines: [{ id: '1' }],
        validUntil: new Date().toISOString(),
        paymentTerms: 'Test',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some((e: string) => e.includes('Delivery terms'))).toBe(true);
      }
    });
  });
});

describe('Quote Immutability', () => {
  describe('after SENT status', () => {
    it('quote lines should be immutable', () => {
      const quote = createMockQuote('SENT');
      const canEdit = QuoteRules.canEdit(quote);

      expect(canEdit.ok).toBe(false);
      expect(QuoteRules.isImmutable(quote)).toBe(true);
    });

    it('quote totals should be immutable', () => {
      const quote = createMockQuote('SENT');
      const originalTotal = quote.totalInclVat;

      // Attempting to modify (in real implementation, this would be blocked)
      expect(QuoteRules.isImmutable(quote)).toBe(true);
      expect(quote.totalInclVat).toBe(originalTotal);
    });

    it('new version should be created for changes', () => {
      const quote1 = createMockQuote('SENT');
      const quote2: ProjectQuote = {
        ...createMockQuote('DRAFT'),
        version: 2,
        quoteNumber: 'QUO-2025-001-v2',
      };

      // Original quote remains immutable
      expect(QuoteRules.isImmutable(quote1)).toBe(true);
      // New version can be edited
      expect(QuoteRules.canEdit(quote2).ok).toBe(true);
    });
  });

  describe('after ACCEPTED status', () => {
    it('quote should be fully locked', () => {
      const quote = createMockQuote('ACCEPTED');

      expect(QuoteRules.canEdit(quote).ok).toBe(false);
      expect(QuoteRules.canSend(quote).ok).toBe(false);
      expect(QuoteRules.canAccept(quote).ok).toBe(false);
      expect(QuoteRules.isImmutable(quote)).toBe(true);
    });
  });
});

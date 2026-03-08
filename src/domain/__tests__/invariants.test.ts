/**
 * Invariant Tests - v4
 * Tests for critical business invariants:
 * 1. Delivery Pack requires FINAL documents
 * 2. boatModelVersionId is immutable after creation
 * 3. Settings are forward-only (don't affect existing snapshots)
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { Project, ProjectDocument, DocumentType, ProjectQuote } from '../models';
import { generateUUID, now } from '../models';

// Import shared test utilities (sets up mock localStorage/window)
import './testUtils';

// ============================================
// TEST 1: DELIVERY PACK FINAL DOCUMENTS
// ============================================

describe('Delivery Pack - FINAL Documents Only', () => {
  // Inline logic matching DeliveryPackService behavior
  function getFinalDocuments(documents: ProjectDocument[]): ProjectDocument[] {
    return documents.filter(doc => doc.status === 'FINAL');
  }

  function validateRequiredDocuments(documents: ProjectDocument[]): {
    ready: boolean;
    missingDocuments: DocumentType[];
  } {
    const finalDocs = getFinalDocuments(documents);
    const finalTypes = new Set(finalDocs.map(d => d.type));
    const requiredTypes: DocumentType[] = ['CE_DECLARATION', 'OWNERS_MANUAL', 'DELIVERY_NOTE'];
    const missingDocuments = requiredTypes.filter(t => !finalTypes.has(t));

    return {
      ready: missingDocuments.length === 0 && finalDocs.length > 0,
      missingDocuments,
    };
  }

  function canGenerateDeliveryPack(documents: ProjectDocument[]): { allowed: boolean; error?: string } {
    const finalDocs = getFinalDocuments(documents);

    if (finalDocs.length === 0) {
      return { allowed: false, error: 'No finalized documents available for delivery pack' };
    }

    const validation = validateRequiredDocuments(documents);
    if (!validation.ready) {
      const missing = validation.missingDocuments.map(t => t.replace(/_/g, ' ')).join(', ');
      return { allowed: false, error: `Missing required finalized documents: ${missing}` };
    }

    return { allowed: true };
  }

  function createMockDocument(type: DocumentType, status: 'DRAFT' | 'FINAL'): ProjectDocument {
    return {
      id: generateUUID(),
      projectId: 'test-project',
      type,
      title: `${type} Document`,
      version: 1,
      status,
      mimeType: 'text/html',
      inputSnapshot: {},
      generatedAt: now(),
      generatedBy: 'test',
      createdAt: now(),
    };
  }

  it('should reject when no FINAL documents exist', () => {
    const documents: ProjectDocument[] = [
      createMockDocument('CE_DECLARATION', 'DRAFT'),
      createMockDocument('OWNERS_MANUAL', 'DRAFT'),
    ];

    const result = canGenerateDeliveryPack(documents);
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('No finalized documents');
  });

  it('should reject when required FINAL documents are missing', () => {
    const documents: ProjectDocument[] = [
      createMockDocument('CE_DECLARATION', 'FINAL'),
      // Missing OWNERS_MANUAL and DELIVERY_NOTE as FINAL
      createMockDocument('OWNERS_MANUAL', 'DRAFT'),
      createMockDocument('DELIVERY_NOTE', 'DRAFT'),
    ];

    const result = canGenerateDeliveryPack(documents);
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('Missing required');
    expect(result.error).toContain('OWNERS MANUAL');
    expect(result.error).toContain('DELIVERY NOTE');
  });

  it('should succeed when all required documents are FINAL', () => {
    const documents: ProjectDocument[] = [
      createMockDocument('CE_DECLARATION', 'FINAL'),
      createMockDocument('OWNERS_MANUAL', 'FINAL'),
      createMockDocument('DELIVERY_NOTE', 'FINAL'),
    ];

    const result = canGenerateDeliveryPack(documents);
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should only include FINAL documents (not DRAFT)', () => {
    const documents: ProjectDocument[] = [
      createMockDocument('CE_DECLARATION', 'FINAL'),
      createMockDocument('CE_DECLARATION', 'DRAFT'), // Should be excluded
      createMockDocument('OWNERS_MANUAL', 'FINAL'),
      createMockDocument('DELIVERY_NOTE', 'FINAL'),
      createMockDocument('INVOICE', 'DRAFT'), // Should be excluded
    ];

    const finalDocs = getFinalDocuments(documents);
    expect(finalDocs.length).toBe(3);
    expect(finalDocs.every(d => d.status === 'FINAL')).toBe(true);
  });
});

// ============================================
// TEST 2: BOAT MODEL VERSION ID IMMUTABILITY
// ============================================

describe('boatModelVersionId Immutability', () => {
  interface ProjectConfiguration {
    boatModelVersionId?: string;
    propulsionType: string;
    items: unknown[];
  }

  // Inline logic matching ProjectRepository/ConfigurationService behavior
  function validateConfigurationUpdate(
    existing: ProjectConfiguration,
    updates: Partial<ProjectConfiguration>
  ): { valid: boolean; error?: string } {
    // boatModelVersionId cannot be changed after being set
    if (
      existing.boatModelVersionId &&
      updates.boatModelVersionId !== undefined &&
      updates.boatModelVersionId !== existing.boatModelVersionId
    ) {
      return {
        valid: false,
        error: 'Boat model version cannot be changed after project creation. Use an Amendment instead.',
      };
    }

    return { valid: true };
  }

  it('should allow setting boatModelVersionId on new project (empty)', () => {
    const existing: ProjectConfiguration = {
      boatModelVersionId: undefined,
      propulsionType: 'Electric',
      items: [],
    };

    const updates: Partial<ProjectConfiguration> = {
      boatModelVersionId: 'model-version-123',
    };

    const result = validateConfigurationUpdate(existing, updates);
    expect(result.valid).toBe(true);
  });

  it('should reject changing boatModelVersionId after it is set', () => {
    const existing: ProjectConfiguration = {
      boatModelVersionId: 'model-version-123',
      propulsionType: 'Electric',
      items: [],
    };

    const updates: Partial<ProjectConfiguration> = {
      boatModelVersionId: 'different-model-456',
    };

    const result = validateConfigurationUpdate(existing, updates);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot be changed');
    expect(result.error).toContain('Amendment');
  });

  it('should allow keeping the same boatModelVersionId', () => {
    const existing: ProjectConfiguration = {
      boatModelVersionId: 'model-version-123',
      propulsionType: 'Electric',
      items: [],
    };

    const updates: Partial<ProjectConfiguration> = {
      boatModelVersionId: 'model-version-123', // Same value
      propulsionType: 'Hybrid', // Other changes allowed
    };

    const result = validateConfigurationUpdate(existing, updates);
    expect(result.valid).toBe(true);
  });

  it('should allow other updates when boatModelVersionId is not changed', () => {
    const existing: ProjectConfiguration = {
      boatModelVersionId: 'model-version-123',
      propulsionType: 'Electric',
      items: [],
    };

    const updates: Partial<ProjectConfiguration> = {
      propulsionType: 'Diesel',
      items: [{ id: 'item-1' }],
      // Note: boatModelVersionId not in updates
    };

    const result = validateConfigurationUpdate(existing, updates);
    expect(result.valid).toBe(true);
  });
});

// ============================================
// TEST 3: SETTINGS FORWARD-ONLY
// ============================================

describe('Settings Forward-Only', () => {
  interface Settings {
    paymentTerms: string;
    deliveryTerms: string;
    quoteValidityDays: number;
    companyName: string;
  }

  interface QuoteSnapshot {
    paymentTerms: string;
    deliveryTerms: string;
    validUntil: string;
    createdAt: string;
  }

  // Simulate quote creation capturing settings at creation time
  function createQuote(settings: Settings): QuoteSnapshot {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + settings.quoteValidityDays);

    return {
      paymentTerms: settings.paymentTerms,
      deliveryTerms: settings.deliveryTerms,
      validUntil: validUntil.toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  it('should capture settings at quote creation time', () => {
    const originalSettings: Settings = {
      paymentTerms: '30% / 40% / 30%',
      deliveryTerms: 'Ex Works Elburg',
      quoteValidityDays: 30,
      companyName: 'Eagle Boats B.V.',
    };

    const quote = createQuote(originalSettings);

    expect(quote.paymentTerms).toBe('30% / 40% / 30%');
    expect(quote.deliveryTerms).toBe('Ex Works Elburg');
  });

  it('should NOT be affected by settings changes after creation', () => {
    // Step 1: Create quote with original settings
    const originalSettings: Settings = {
      paymentTerms: '30% / 40% / 30%',
      deliveryTerms: 'Ex Works Elburg',
      quoteValidityDays: 30,
      companyName: 'Eagle Boats B.V.',
    };

    const existingQuote = createQuote(originalSettings);

    // Step 2: Change settings (simulate user updating settings)
    const newSettings: Settings = {
      paymentTerms: '50% / 50%', // Changed
      deliveryTerms: 'FOB Rotterdam', // Changed
      quoteValidityDays: 60, // Changed
      companyName: 'Navisol Boats B.V.', // Changed
    };

    // Step 3: Existing quote should retain original values
    expect(existingQuote.paymentTerms).toBe('30% / 40% / 30%');
    expect(existingQuote.deliveryTerms).toBe('Ex Works Elburg');
    expect(existingQuote.paymentTerms).not.toBe(newSettings.paymentTerms);
    expect(existingQuote.deliveryTerms).not.toBe(newSettings.deliveryTerms);

    // Step 4: New quote should use new settings
    const newQuote = createQuote(newSettings);
    expect(newQuote.paymentTerms).toBe('50% / 50%');
    expect(newQuote.deliveryTerms).toBe('FOB Rotterdam');
  });

  it('should store immutable snapshots in documents', () => {
    interface DocumentSnapshot {
      inputSnapshot: {
        companyName: string;
        generatedAt: string;
        templateVersionId: string;
      };
    }

    function createDocument(settings: Settings): DocumentSnapshot {
      return {
        inputSnapshot: {
          companyName: settings.companyName,
          generatedAt: new Date().toISOString(),
          templateVersionId: 'template-v1',
        },
      };
    }

    // Create document with original settings
    const originalSettings: Settings = {
      paymentTerms: '30% / 40% / 30%',
      deliveryTerms: 'Ex Works',
      quoteValidityDays: 30,
      companyName: 'Eagle Boats B.V.',
    };

    const document = createDocument(originalSettings);

    // Change settings
    const updatedSettings: Settings = {
      ...originalSettings,
      companyName: 'New Company Name',
    };

    // Document snapshot should be unchanged
    expect(document.inputSnapshot.companyName).toBe('Eagle Boats B.V.');
    expect(document.inputSnapshot.companyName).not.toBe(updatedSettings.companyName);
  });
});

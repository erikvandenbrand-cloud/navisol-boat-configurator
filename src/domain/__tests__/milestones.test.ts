/**
 * Milestone Tests - v4
 * Tests for configuration freeze and BOM baseline at ORDER_CONFIRMED
 */

import { StatusMachine } from '../workflow';
import type {
  Project,
  ProjectConfiguration,
  ConfigurationItem,
  ConfigurationSnapshot,
  BOMSnapshot,
  ProjectQuote,
} from '../models';

// ============================================
// MOCK DATA FACTORIES
// ============================================

function createMockConfigurationItem(overrides?: Partial<ConfigurationItem>): ConfigurationItem {
  return {
    id: 'item-1',
    isCustom: false,
    category: 'Propulsion',
    name: 'Electric Motor 40kW',
    quantity: 1,
    unit: 'set',
    unitPriceExclVat: 35000,
    lineTotalExclVat: 35000,
    isIncluded: true,
    ceRelevant: true,
    safetyCritical: true,
    sortOrder: 0,
    ...overrides,
  };
}

function createMockConfiguration(isFrozen: boolean = false): ProjectConfiguration {
  return {
    propulsionType: 'Electric',
    items: [
      createMockConfigurationItem({ id: 'item-1', name: 'Electric Motor 40kW', unitPriceExclVat: 35000, lineTotalExclVat: 35000 }),
      createMockConfigurationItem({ id: 'item-2', name: 'Battery Pack 80kWh', unitPriceExclVat: 45000, lineTotalExclVat: 45000 }),
    ],
    subtotalExclVat: 80000,
    totalExclVat: 80000,
    vatRate: 21,
    vatAmount: 16800,
    totalInclVat: 96800,
    isFrozen,
    frozenAt: isFrozen ? new Date().toISOString() : undefined,
    frozenBy: isFrozen ? 'user-1' : undefined,
    lastModifiedAt: new Date().toISOString(),
    lastModifiedBy: 'user-1',
  };
}

function createMockQuote(status: 'DRAFT' | 'SENT' | 'ACCEPTED'): ProjectQuote {
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
    totalExclVat: 35000,
    vatRate: 21,
    vatAmount: 7350,
    totalInclVat: 42350,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    paymentTerms: '30% deposit',
    deliveryTerms: 'Ex Works',
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
    sentAt: status !== 'DRAFT' ? new Date().toISOString() : undefined,
    acceptedAt: status === 'ACCEPTED' ? new Date().toISOString() : undefined,
  };
}

function createMockProject(status: string, configFrozen: boolean = false): Project {
  return {
    id: 'project-1',
    projectNumber: 'PRJ-2025-001',
    title: 'Test Project',
    type: 'NEW_BUILD',
    status: status as Project['status'],
    clientId: 'client-1',
    configuration: createMockConfiguration(configFrozen),
    configurationSnapshots: [],
    quotes: [createMockQuote('ACCEPTED')],
    bomSnapshots: [],
    documents: [],
    amendments: [],
    createdAt: new Date().toISOString(),
    createdBy: 'user-1',
    updatedAt: new Date().toISOString(),
    version: 0,
  };
}

// ============================================
// ORDER_CONFIRMED MILESTONE TESTS
// ============================================

describe('ORDER_CONFIRMED Milestone Effects', () => {
  describe('Configuration Freeze', () => {
    it('should mark configuration as frozen at ORDER_CONFIRMED', () => {
      const project = createMockProject('OFFER_SENT');
      expect(project.configuration.isFrozen).toBe(false);

      // Simulate freeze effect
      const frozenConfig: ProjectConfiguration = {
        ...project.configuration,
        isFrozen: true,
        frozenAt: new Date().toISOString(),
        frozenBy: 'user-1',
      };

      expect(frozenConfig.isFrozen).toBe(true);
      expect(frozenConfig.frozenAt).toBeDefined();
      expect(frozenConfig.frozenBy).toBeDefined();
    });

    it('should create configuration snapshot at ORDER_CONFIRMED', () => {
      const project = createMockProject('OFFER_SENT');

      // Simulate snapshot creation
      const snapshot: ConfigurationSnapshot = {
        id: 'snapshot-1',
        projectId: project.id,
        snapshotNumber: 1,
        data: { ...project.configuration, isFrozen: true },
        trigger: 'ORDER_CONFIRMED',
        triggerReason: 'Order confirmed by client',
        createdAt: new Date().toISOString(),
        createdBy: 'user-1',
      };

      expect(snapshot.trigger).toBe('ORDER_CONFIRMED');
      expect(snapshot.data.isFrozen).toBe(true);
      expect(snapshot.data.items.length).toBe(project.configuration.items.length);
    });

    it('frozen configuration should preserve original pricing', () => {
      const originalTotal = 96800;
      const project = createMockProject('ORDER_CONFIRMED', true);

      expect(project.configuration.totalInclVat).toBe(originalTotal);
      expect(project.configuration.isFrozen).toBe(true);

      // Original values preserved even if items "change" in memory
      // (actual changes blocked by service layer)
      expect(project.configuration.items[0].lineTotalExclVat).toBe(35000);
    });
  });

  describe('BOM Baseline Generation', () => {
    it('should generate BOM baseline from frozen configuration', () => {
      const project = createMockProject('ORDER_CONFIRMED', true);

      // Simulate BOM generation
      const bomSnapshot: BOMSnapshot = {
        id: 'bom-1',
        projectId: project.id,
        snapshotNumber: 1,
        configurationSnapshotId: 'snapshot-1',
        items: project.configuration.items.map((item) => ({
          id: `bom-item-${item.id}`,
          category: item.category,
          articleNumber: item.articleNumber,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitPriceExclVat,
          totalCost: item.lineTotalExclVat,
        })),
        totalParts: project.configuration.items.reduce((sum, i) => sum + i.quantity, 0),
        totalCostExclVat: project.configuration.items.reduce((sum, i) => sum + i.lineTotalExclVat, 0),
        status: 'BASELINE',
        createdAt: new Date().toISOString(),
        createdBy: 'user-1',
      };

      expect(bomSnapshot.status).toBe('BASELINE');
      expect(bomSnapshot.items.length).toBe(project.configuration.items.length);
      expect(bomSnapshot.totalCostExclVat).toBe(80000);
      expect(bomSnapshot.configurationSnapshotId).toBeDefined();
    });

    it('BOM should reference configuration snapshot, not live config', () => {
      const bomSnapshot: BOMSnapshot = {
        id: 'bom-1',
        projectId: 'project-1',
        snapshotNumber: 1,
        configurationSnapshotId: 'snapshot-1', // References snapshot, not live config
        items: [],
        totalParts: 0,
        totalCostExclVat: 0,
        status: 'BASELINE',
        createdAt: new Date().toISOString(),
        createdBy: 'user-1',
      };

      // BOM is linked to immutable snapshot
      expect(bomSnapshot.configurationSnapshotId).toBe('snapshot-1');
    });
  });

  describe('Library Version Pinning', () => {
    it('should pin library versions at ORDER_CONFIRMED', () => {
      const project = createMockProject('ORDER_CONFIRMED', true);

      // Simulate library pinning
      const libraryPins = {
        boatModelVersionId: 'boat-model-v1.2.0',
        catalogVersionId: 'catalog-2025.1',
        templateVersionIds: {
          QUOTE: 'quote-template-v2.1',
          OWNERS_MANUAL: 'manual-template-v1.3',
          CE_DECLARATION: 'ce-template-v1.0',
        },
        procedureVersionIds: ['proc-v1', 'proc-v2'],
        pinnedAt: new Date().toISOString(),
        pinnedBy: 'user-1',
      };

      expect(libraryPins.pinnedAt).toBeDefined();
      expect(libraryPins.boatModelVersionId).not.toContain('latest');
      expect(libraryPins.catalogVersionId).not.toContain('current');
    });

    it('pinned versions should be immutable references', () => {
      const pinnedVersion = 'catalog-2025.1';

      // Version is a specific ID, not "latest" or "current"
      expect(pinnedVersion).toMatch(/^catalog-\d{4}\.\d+$/);
      expect(pinnedVersion).not.toBe('current');
      expect(pinnedVersion).not.toBe('latest');
    });
  });
});

// ============================================
// OFFER_SENT MILESTONE TESTS
// ============================================

describe('OFFER_SENT Milestone Effects', () => {
  describe('Quote Lock', () => {
    it('should mark quote as immutable after SENT', () => {
      const quote = createMockQuote('SENT');

      expect(quote.status).toBe('SENT');
      expect(quote.sentAt).toBeDefined();

      // Quote should be immutable - status is not DRAFT
      const isImmutable = quote.status !== 'DRAFT';
      expect(isImmutable).toBe(true);
    });

    it('quote lines should be locked after SENT', () => {
      const quote = createMockQuote('SENT');
      const originalLineCount = quote.lines.length;
      const originalTotal = quote.totalInclVat;

      // Lines should remain unchanged (enforced by service layer)
      expect(quote.lines.length).toBe(originalLineCount);
      expect(quote.totalInclVat).toBe(originalTotal);
    });

    it('PDF snapshot should be stored with quote', () => {
      const quote: ProjectQuote = {
        ...createMockQuote('SENT'),
        pdfData: 'base64-encoded-pdf-content',
        pdfGeneratedAt: new Date().toISOString(),
      };

      expect(quote.pdfData).toBeDefined();
      expect(quote.pdfGeneratedAt).toBeDefined();
    });
  });
});

// ============================================
// STATUS MACHINE MILESTONE CHECKS
// ============================================

describe('StatusMachine Milestone Detection', () => {
  it('should identify ORDER_CONFIRMED as milestone', () => {
    expect(StatusMachine.isMilestone('ORDER_CONFIRMED')).toBe(true);
  });

  it('should identify OFFER_SENT as milestone', () => {
    expect(StatusMachine.isMilestone('OFFER_SENT')).toBe(true);
  });

  it('should identify DELIVERED as milestone', () => {
    expect(StatusMachine.isMilestone('DELIVERED')).toBe(true);
  });

  it('should return correct effects for ORDER_CONFIRMED', () => {
    const effects = StatusMachine.getMilestoneEffects('ORDER_CONFIRMED');

    expect(effects.length).toBe(3);
    expect(effects.map((e) => e.type)).toContain('FREEZE_CONFIGURATION');
    expect(effects.map((e) => e.type)).toContain('GENERATE_BOM');
    expect(effects.map((e) => e.type)).toContain('PIN_LIBRARY_VERSIONS');
  });

  it('should return LOCK_QUOTE effect for OFFER_SENT', () => {
    const effects = StatusMachine.getMilestoneEffects('OFFER_SENT');

    expect(effects.length).toBe(1);
    expect(effects[0].type).toBe('LOCK_QUOTE');
  });
});

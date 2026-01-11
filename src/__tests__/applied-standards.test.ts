/**
 * Applied Standards Tests
 * Tests for Applied Standards model structure and data handling
 */

import { describe, it, expect } from 'bun:test';
import type { Project, AppliedStandard } from '@/domain/models';
import { generateUUID, now } from '@/domain/models';

// ============================================
// TEST HELPERS
// ============================================

function createTestProject(overrides: Partial<Project> = {}): Project {
  return {
    id: generateUUID(),
    projectNumber: 'P-TEST-001',
    title: 'Test Boat Project',
    type: 'NEW_BUILD',
    status: 'DRAFT',
    clientId: 'client-123',
    configuration: {
      propulsionType: 'OUTBOARD',
      items: [],
      subtotalExclVat: 0,
      totalExclVat: 0,
      vatRate: 21,
      vatAmount: 0,
      totalInclVat: 0,
      isFrozen: false,
      lastModifiedAt: now(),
      lastModifiedBy: 'test-user',
    },
    configurationSnapshots: [],
    quotes: [],
    bomSnapshots: [],
    documents: [],
    amendments: [],
    tasks: [],
    isArchived: false,
    createdAt: now(),
    createdBy: 'test-user',
    updatedAt: now(),
    version: 0,
    ...overrides,
  };
}

function createTestStandard(overrides: Partial<AppliedStandard> = {}): AppliedStandard {
  return {
    id: generateUUID(),
    code: 'EN ISO 12217-1',
    title: 'Stability and buoyancy - Part 1: Non-sailing boats',
    year: '2015',
    scopeNote: 'Applied to verify stability requirements for power boats',
    isHarmonised: true,
    evidenceAttachmentIds: [],
    ...overrides,
  };
}

// ============================================
// MODEL TESTS
// ============================================

describe('Applied Standards Model', () => {
  describe('AppliedStandard interface', () => {
    it('should have required code field', () => {
      const standard = createTestStandard();
      expect(standard.code).toBe('EN ISO 12217-1');
    });

    it('should have optional title field', () => {
      const standard = createTestStandard({ title: undefined });
      expect(standard.title).toBeUndefined();
    });

    it('should have optional year field', () => {
      const standard = createTestStandard({ year: undefined });
      expect(standard.year).toBeUndefined();
    });

    it('should have optional scopeNote field', () => {
      const standard = createTestStandard({ scopeNote: undefined });
      expect(standard.scopeNote).toBeUndefined();
    });

    it('should have optional isHarmonised boolean', () => {
      const standard = createTestStandard({ isHarmonised: undefined });
      expect(standard.isHarmonised).toBeUndefined();
    });

    it('should have optional evidenceAttachmentIds array', () => {
      const standard = createTestStandard({ evidenceAttachmentIds: ['att-1', 'att-2'] });
      expect(standard.evidenceAttachmentIds).toEqual(['att-1', 'att-2']);
    });

    it('should support minimal standard with only code', () => {
      const standard: AppliedStandard = { id: 'std-min', code: 'EN ISO 99999' };
      expect(standard.code).toBe('EN ISO 99999');
      expect(standard.title).toBeUndefined();
      expect(standard.year).toBeUndefined();
      expect(standard.isHarmonised).toBeUndefined();
    });
  });

  describe('Project with appliedStandards', () => {
    it('should have optional appliedStandards array', () => {
      const project = createTestProject();
      expect(project.appliedStandards).toBeUndefined();
    });

    it('should allow empty appliedStandards array', () => {
      const project = createTestProject({ appliedStandards: [] });
      expect(project.appliedStandards).toEqual([]);
    });

    it('should store multiple applied standards', () => {
      const standards: AppliedStandard[] = [
        createTestStandard({ code: 'EN ISO 12217-1' }),
        createTestStandard({ code: 'EN ISO 12216' }),
        createTestStandard({ code: 'EN ISO 10133' }),
      ];
      const project = createTestProject({ appliedStandards: standards });
      expect(project.appliedStandards?.length).toBe(3);
    });

    it('should store standards with all fields populated', () => {
      const standard = createTestStandard({
        id: 'std-full',
        code: 'EN ISO 12217-1',
        title: 'Stability and buoyancy - Part 1: Non-sailing boats',
        year: '2015',
        scopeNote: 'Applied for stability verification',
        isHarmonised: true,
        evidenceAttachmentIds: ['att-1', 'att-2'],
      });
      const project = createTestProject({ appliedStandards: [standard] });

      const stored = project.appliedStandards?.[0];
      expect(stored?.id).toBe('std-full');
      expect(stored?.code).toBe('EN ISO 12217-1');
      expect(stored?.title).toBe('Stability and buoyancy - Part 1: Non-sailing boats');
      expect(stored?.year).toBe('2015');
      expect(stored?.scopeNote).toBe('Applied for stability verification');
      expect(stored?.isHarmonised).toBe(true);
      expect(stored?.evidenceAttachmentIds).toEqual(['att-1', 'att-2']);
    });
  });
});

// ============================================
// DATA OPERATIONS TESTS
// ============================================

describe('Applied Standards Data Operations', () => {
  it('should add standard to empty list', () => {
    const project = createTestProject({ appliedStandards: [] });
    const newStandard = createTestStandard({ code: 'EN ISO 10133' });

    const updatedStandards = [...(project.appliedStandards || []), newStandard];
    expect(updatedStandards.length).toBe(1);
    expect(updatedStandards[0].code).toBe('EN ISO 10133');
  });

  it('should add standard to existing list', () => {
    const existingStandard = createTestStandard({ id: 'std-1', code: 'EN ISO 12217-1' });
    const project = createTestProject({ appliedStandards: [existingStandard] });
    const newStandard = createTestStandard({ id: 'std-2', code: 'EN ISO 10133' });

    const updatedStandards = [...(project.appliedStandards || []), newStandard];
    expect(updatedStandards.length).toBe(2);
  });

  it('should remove standard from list', () => {
    const standards: AppliedStandard[] = [
      createTestStandard({ id: 'std-1', code: 'EN ISO 12217-1' }),
      createTestStandard({ id: 'std-2', code: 'EN ISO 12216' }),
      createTestStandard({ id: 'std-3', code: 'EN ISO 10133' }),
    ];
    const project = createTestProject({ appliedStandards: standards });

    const filtered = (project.appliedStandards || []).filter(s => s.id !== 'std-2');
    expect(filtered.length).toBe(2);
    expect(filtered.find(s => s.id === 'std-2')).toBeUndefined();
  });

  it('should update existing standard', () => {
    const standards: AppliedStandard[] = [
      createTestStandard({ id: 'std-1', code: 'EN ISO 12217-1', isHarmonised: false }),
    ];
    const project = createTestProject({ appliedStandards: standards });

    const updated = (project.appliedStandards || []).map(s =>
      s.id === 'std-1' ? { ...s, isHarmonised: true, scopeNote: 'Updated note' } : s
    );

    expect(updated[0].isHarmonised).toBe(true);
    expect(updated[0].scopeNote).toBe('Updated note');
  });

  it('should find standard by id', () => {
    const standards: AppliedStandard[] = [
      createTestStandard({ id: 'std-1', code: 'EN ISO 12217-1' }),
      createTestStandard({ id: 'std-2', code: 'EN ISO 12216' }),
    ];
    const project = createTestProject({ appliedStandards: standards });

    const found = (project.appliedStandards || []).find(s => s.id === 'std-2');
    expect(found?.code).toBe('EN ISO 12216');
  });

  it('should filter harmonised standards', () => {
    const standards: AppliedStandard[] = [
      createTestStandard({ id: 'std-1', code: 'EN ISO 12217-1', isHarmonised: true }),
      createTestStandard({ id: 'std-2', code: 'EN ISO 12216', isHarmonised: false }),
      createTestStandard({ id: 'std-3', code: 'EN ISO 10133', isHarmonised: true }),
    ];
    const project = createTestProject({ appliedStandards: standards });

    const harmonised = (project.appliedStandards || []).filter(s => s.isHarmonised);
    expect(harmonised.length).toBe(2);
  });

  it('should count evidence attachments', () => {
    const standards: AppliedStandard[] = [
      createTestStandard({ id: 'std-1', evidenceAttachmentIds: ['att-1', 'att-2'] }),
      createTestStandard({ id: 'std-2', evidenceAttachmentIds: ['att-3'] }),
      createTestStandard({ id: 'std-3', evidenceAttachmentIds: undefined }),
    ];
    const project = createTestProject({ appliedStandards: standards });

    const totalEvidence = (project.appliedStandards || []).reduce(
      (sum, s) => sum + (s.evidenceAttachmentIds?.length || 0),
      0
    );
    expect(totalEvidence).toBe(3);
  });
});

// ============================================
// READ-ONLY (CLOSED PROJECT) TESTS
// ============================================

describe('Applied Standards Read-Only Behavior', () => {
  it('should not restrict model-level access for CLOSED projects', () => {
    const standards: AppliedStandard[] = [
      createTestStandard({ code: 'EN ISO 12217-1' }),
    ];
    const project = createTestProject({
      status: 'CLOSED',
      appliedStandards: standards,
    });

    // Model level: data is always readable
    expect(project.appliedStandards?.length).toBe(1);
    expect(project.status).toBe('CLOSED');
  });

  it('should allow reading standards regardless of project status', () => {
    const statuses = ['DRAFT', 'QUOTED', 'IN_PRODUCTION', 'DELIVERED', 'CLOSED'] as const;

    for (const status of statuses) {
      const project = createTestProject({
        status,
        appliedStandards: [createTestStandard({ code: 'EN ISO 12217-1' })],
      });
      expect(project.appliedStandards?.length).toBe(1);
    }
  });
});

// ============================================
// EVIDENCE LINKING TESTS
// ============================================

describe('Applied Standards Evidence Linking', () => {
  it('should store multiple evidence attachment IDs', () => {
    const standard = createTestStandard({
      evidenceAttachmentIds: ['att-1', 'att-2', 'att-3'],
    });
    expect(standard.evidenceAttachmentIds?.length).toBe(3);
  });

  it('should handle empty evidence array', () => {
    const standard = createTestStandard({
      evidenceAttachmentIds: [],
    });
    expect(standard.evidenceAttachmentIds).toEqual([]);
  });

  it('should handle undefined evidence', () => {
    const standard = createTestStandard({
      evidenceAttachmentIds: undefined,
    });
    expect(standard.evidenceAttachmentIds).toBeUndefined();
  });

  it('should add evidence to existing list', () => {
    const standard = createTestStandard({
      evidenceAttachmentIds: ['att-1'],
    });
    const updated = {
      ...standard,
      evidenceAttachmentIds: [...(standard.evidenceAttachmentIds || []), 'att-2'],
    };
    expect(updated.evidenceAttachmentIds).toEqual(['att-1', 'att-2']);
  });

  it('should remove evidence from list', () => {
    const standard = createTestStandard({
      evidenceAttachmentIds: ['att-1', 'att-2', 'att-3'],
    });
    const updated = {
      ...standard,
      evidenceAttachmentIds: standard.evidenceAttachmentIds?.filter(id => id !== 'att-2'),
    };
    expect(updated.evidenceAttachmentIds).toEqual(['att-1', 'att-3']);
  });
});

// ============================================
// SERIALIZATION TESTS (for ZIP roundtrip)
// ============================================

describe('Applied Standards Serialization', () => {
  it('should serialize to JSON correctly', () => {
    const standards: AppliedStandard[] = [
      {
        id: 'std-1',
        code: 'EN ISO 12217-1',
        title: 'Stability and buoyancy',
        year: '2015',
        isHarmonised: true,
        scopeNote: 'Applied for stability',
        evidenceAttachmentIds: ['att-1'],
      },
    ];
    const project = createTestProject({ appliedStandards: standards });

    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;

    expect(parsed.appliedStandards?.length).toBe(1);
    expect(parsed.appliedStandards?.[0].code).toBe('EN ISO 12217-1');
    expect(parsed.appliedStandards?.[0].isHarmonised).toBe(true);
    expect(parsed.appliedStandards?.[0].evidenceAttachmentIds).toEqual(['att-1']);
  });

  it('should handle undefined optional fields in serialization', () => {
    const standards: AppliedStandard[] = [
      { id: 'std-min', code: 'EN ISO 99999' },
    ];
    const project = createTestProject({ appliedStandards: standards });

    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;

    expect(parsed.appliedStandards?.[0].code).toBe('EN ISO 99999');
    expect(parsed.appliedStandards?.[0].title).toBeUndefined();
    expect(parsed.appliedStandards?.[0].year).toBeUndefined();
  });

  it('should preserve empty appliedStandards array in serialization', () => {
    const project = createTestProject({ appliedStandards: [] });

    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;

    expect(parsed.appliedStandards).toEqual([]);
  });

  it('should handle missing appliedStandards field in deserialization', () => {
    const project = createTestProject();
    delete (project as Partial<Project>).appliedStandards;

    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;

    expect(parsed.appliedStandards).toBeUndefined();
  });
});

// ============================================
// PROJECT TYPE GATING TESTS
// ============================================

describe('Applied Standards Project Type Gating', () => {
  it('should allow appliedStandards for NEW_BUILD projects', () => {
    const project = createTestProject({
      type: 'NEW_BUILD',
      appliedStandards: [createTestStandard()],
    });
    expect(project.type).toBe('NEW_BUILD');
    expect(project.appliedStandards?.length).toBe(1);
  });

  it('should allow appliedStandards for REFIT projects', () => {
    const project = createTestProject({
      type: 'REFIT',
      appliedStandards: [createTestStandard()],
    });
    expect(project.type).toBe('REFIT');
    expect(project.appliedStandards?.length).toBe(1);
  });

  it('should allow appliedStandards for MAINTENANCE projects', () => {
    const project = createTestProject({
      type: 'MAINTENANCE',
      appliedStandards: [createTestStandard()],
    });
    expect(project.type).toBe('MAINTENANCE');
    expect(project.appliedStandards?.length).toBe(1);
  });

  it('should default to empty for all project types', () => {
    const types = ['NEW_BUILD', 'REFIT', 'MAINTENANCE'] as const;
    for (const type of types) {
      const project = createTestProject({ type });
      expect(project.appliedStandards).toBeUndefined();
    }
  });
});

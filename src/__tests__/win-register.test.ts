/**
 * WIN Register Service Tests
 * Tests for WIN Register selector, filtering, and boat instance migration
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import {
  WINRegisterService,
  filterWINRegisterEntries,
  ensureBoatInstances,
  type WINRegisterEntry,
} from '@/domain/services/WINRegisterService';
import { ProjectRepository } from '@/data/repositories';
import type { Project, ProjectConfiguration, BoatInstance } from '@/domain/models';
import { generateUUID, now } from '@/domain/models';

// ============================================
// TEST HELPERS
// ============================================

function createTestConfiguration(): ProjectConfiguration {
  return {
    propulsionType: 'Electric',
    items: [],
    subtotalExclVat: 0,
    totalExclVat: 0,
    vatRate: 21,
    vatAmount: 0,
    totalInclVat: 0,
    isFrozen: false,
    lastModifiedAt: now(),
    lastModifiedBy: 'test',
  };
}

async function createTestProject(overrides: Partial<Project> = {}): Promise<Project> {
  const projectId = generateUUID();
  const project: Project = {
    id: projectId,
    projectNumber: `PRJ-${projectId.slice(0, 6)}`,
    title: overrides.title || 'Test Project',
    type: overrides.type || 'NEW_BUILD',
    status: overrides.status || 'DRAFT',
    clientId: overrides.clientId || 'test-client',
    configuration: overrides.configuration || createTestConfiguration(),
    configurationSnapshots: [],
    quotes: [],
    bomSnapshots: [],
    documents: [],
    amendments: [],
    tasks: [],
    createdBy: 'test',
    createdAt: overrides.createdAt || now(),
    updatedAt: now(),
    version: 0,
    archivedAt: overrides.archivedAt,
    win: overrides.win,
    boats: overrides.boats,
    ...overrides,
  };

  const { getAdapter } = await import('@/data/persistence');
  await getAdapter().save('projects', project);

  return project;
}

async function clearProjects() {
  const { getAdapter } = await import('@/data/persistence');
  const projects = await getAdapter().getAll<Project>('projects');
  for (const project of projects) {
    await getAdapter().delete('projects', project.id);
  }
}

// ============================================
// MIGRATION TESTS
// ============================================

describe('WINRegisterService - Migration', () => {
  test('project without boats gets Boat 01', () => {
    const project: Project = {
      id: 'test-1',
      projectNumber: 'PRJ-2024-0001',
      title: 'Test Project',
      type: 'NEW_BUILD',
      status: 'DRAFT',
      clientId: 'client-1',
      configuration: createTestConfiguration(),
      configurationSnapshots: [],
      quotes: [],
      bomSnapshots: [],
      documents: [],
      amendments: [],
      tasks: [],
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
      // No boats, no win
    };

    const boats = ensureBoatInstances(project);

    expect(boats.length).toBe(1);
    expect(boats[0].label).toBe('Boat 01');
    expect(boats[0].win).toBeUndefined();
  });

  test('legacy project.win migrates to Boat 01 when Boat 01 win is empty', () => {
    const project: Project = {
      id: 'test-2',
      projectNumber: 'PRJ-2024-0002',
      title: 'Legacy Project',
      type: 'NEW_BUILD',
      status: 'DRAFT',
      clientId: 'client-1',
      configuration: createTestConfiguration(),
      configurationSnapshots: [],
      quotes: [],
      bomSnapshots: [],
      documents: [],
      amendments: [],
      tasks: [],
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
      win: 'NL-NAV-LEGACY-2024', // Legacy win
      // No boats
    };

    const boats = ensureBoatInstances(project);

    expect(boats.length).toBe(1);
    expect(boats[0].label).toBe('Boat 01');
    expect(boats[0].win).toBe('NL-NAV-LEGACY-2024'); // Migrated from legacy
  });

  test('legacy project.win migrates to existing boats[0] when boats[0].win is empty', () => {
    const project: Project = {
      id: 'test-3',
      projectNumber: 'PRJ-2024-0003',
      title: 'Partial Migration Project',
      type: 'NEW_BUILD',
      status: 'DRAFT',
      clientId: 'client-1',
      configuration: createTestConfiguration(),
      configurationSnapshots: [],
      quotes: [],
      bomSnapshots: [],
      documents: [],
      amendments: [],
      tasks: [],
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
      win: 'NL-NAV-LEGACY-2024', // Legacy win
      boats: [
        { id: 'boat-1', label: 'Hull 001', win: undefined }, // Empty win
        { id: 'boat-2', label: 'Hull 002', win: 'NL-NAV-OTHER-2024' },
      ],
    };

    const boats = ensureBoatInstances(project);

    expect(boats.length).toBe(2);
    expect(boats[0].label).toBe('Hull 001');
    expect(boats[0].win).toBe('NL-NAV-LEGACY-2024'); // Migrated from legacy
    expect(boats[1].win).toBe('NL-NAV-OTHER-2024'); // Unchanged
  });

  test('existing boats[0].win is NOT overwritten by legacy project.win', () => {
    const project: Project = {
      id: 'test-4',
      projectNumber: 'PRJ-2024-0004',
      title: 'Already Migrated Project',
      type: 'NEW_BUILD',
      status: 'DRAFT',
      clientId: 'client-1',
      configuration: createTestConfiguration(),
      configurationSnapshots: [],
      quotes: [],
      bomSnapshots: [],
      documents: [],
      amendments: [],
      tasks: [],
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
      win: 'NL-NAV-OLD-2024', // Legacy win (should be ignored)
      boats: [
        { id: 'boat-1', label: 'Boat 01', win: 'NL-NAV-NEW-2024' }, // Already has win
      ],
    };

    const boats = ensureBoatInstances(project);

    expect(boats.length).toBe(1);
    expect(boats[0].win).toBe('NL-NAV-NEW-2024'); // NOT overwritten by legacy
  });

  test('projects with boats array intact are unchanged', () => {
    const existingBoats: BoatInstance[] = [
      { id: 'boat-1', label: 'Hull A', win: 'NL-NAV-A-2024' },
      { id: 'boat-2', label: 'Hull B', win: undefined },
      { id: 'boat-3', label: 'Hull C', win: 'NL-NAV-C-2024' },
    ];

    const project: Project = {
      id: 'test-5',
      projectNumber: 'PRJ-2024-0005',
      title: 'Multi-Boat Project',
      type: 'NEW_BUILD',
      status: 'DRAFT',
      clientId: 'client-1',
      configuration: createTestConfiguration(),
      configurationSnapshots: [],
      quotes: [],
      bomSnapshots: [],
      documents: [],
      amendments: [],
      tasks: [],
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
      boats: existingBoats,
    };

    const boats = ensureBoatInstances(project);

    expect(boats.length).toBe(3);
    expect(boats).toEqual(existingBoats);
  });
});

// ============================================
// SELECTOR TESTS (BOAT-BASED)
// ============================================

describe('WINRegisterService - Selector (Boat Rows)', () => {
  beforeEach(async () => {
    await clearProjects();
  });

  test('should return boat rows for NEW_BUILD projects', async () => {
    // Create a project with 2 boats
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'Serial Production',
      boats: [
        { id: 'b1', label: 'Boat 01', win: 'NL-NAV-001' },
        { id: 'b2', label: 'Boat 02', win: 'NL-NAV-002' },
      ],
    });

    const entries = await WINRegisterService.getWINRegisterEntries();

    // Should have 2 entries (one per boat)
    expect(entries.length).toBe(2);
    expect(entries[0].boatLabel).toBe('Boat 01');
    expect(entries[1].boatLabel).toBe('Boat 02');
  });

  test('should return only NEW_BUILD projects (not REFIT/MAINTENANCE)', async () => {
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'New Build',
      boats: [{ id: 'b1', label: 'Boat 01', win: undefined }],
    });
    await createTestProject({ type: 'REFIT', title: 'Refit' });
    await createTestProject({ type: 'MAINTENANCE', title: 'Maintenance' });

    const entries = await WINRegisterService.getWINRegisterEntries();

    expect(entries.length).toBe(1);
    expect(entries[0].projectTitle).toBe('New Build');
  });

  test('should not include archived projects', async () => {
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'Active',
      boats: [{ id: 'b1', label: 'Boat 01', win: undefined }],
    });
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'Archived',
      boats: [{ id: 'b2', label: 'Boat 01', win: 'NL-NAV-001' }],
      archivedAt: '2025-01-01T00:00:00Z',
    });

    const entries = await WINRegisterService.getWINRegisterEntries();

    expect(entries.length).toBe(1);
    expect(entries[0].projectTitle).toBe('Active');
  });

  test('should include boat WIN values correctly', async () => {
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'Mixed WINs',
      boats: [
        { id: 'b1', label: 'Boat 01', win: 'NL-NAV-12345-2024' },
        { id: 'b2', label: 'Boat 02', win: undefined },
      ],
    });

    const entries = await WINRegisterService.getWINRegisterEntries();

    const withWIN = entries.find((e) => e.boatLabel === 'Boat 01');
    const withoutWIN = entries.find((e) => e.boatLabel === 'Boat 02');

    expect(withWIN?.win).toBe('NL-NAV-12345-2024');
    expect(withoutWIN?.win).toBeNull();
  });

  test('should sort boats with WIN first (alphabetically), then without WIN (by project date descending)', async () => {
    // Create projects with specific order
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'Older Without WIN',
      createdAt: '2024-01-01T00:00:00Z',
      boats: [{ id: 'b1', label: 'Boat 01', win: undefined }],
    });
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'Newer Without WIN',
      createdAt: '2025-01-01T00:00:00Z',
      boats: [{ id: 'b2', label: 'Boat 01', win: undefined }],
    });
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'With WIN B',
      boats: [{ id: 'b3', label: 'Boat 01', win: 'NL-NAV-B0002-2024' }],
    });
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'With WIN A',
      boats: [{ id: 'b4', label: 'Boat 01', win: 'NL-NAV-A0001-2024' }],
    });

    const entries = await WINRegisterService.getWINRegisterEntries();

    // First two should be sorted alphabetically by WIN
    expect(entries[0].win).toBe('NL-NAV-A0001-2024');
    expect(entries[1].win).toBe('NL-NAV-B0002-2024');
    // Next should be newer project without WIN
    expect(entries[2].projectTitle).toBe('Newer Without WIN');
    // Last should be older project without WIN
    expect(entries[3].projectTitle).toBe('Older Without WIN');
  });

  test('legacy project with win but no boats should show boat with migrated WIN', async () => {
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'Legacy Project',
      win: 'NL-NAV-LEGACY-2024',
      // No boats array - will be migrated
    });

    const entries = await WINRegisterService.getWINRegisterEntries();

    expect(entries.length).toBe(1);
    expect(entries[0].boatLabel).toBe('Boat 01');
    expect(entries[0].win).toBe('NL-NAV-LEGACY-2024');
  });

  test('should include project status in boat entries', async () => {
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'Draft Project',
      status: 'DRAFT',
      boats: [{ id: 'b1', label: 'Boat 01', win: undefined }],
    });
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'In Production',
      status: 'IN_PRODUCTION',
      boats: [{ id: 'b2', label: 'Boat 01', win: undefined }],
    });

    const entries = await WINRegisterService.getWINRegisterEntries();

    const draft = entries.find((e) => e.projectTitle === 'Draft Project');
    const inProd = entries.find((e) => e.projectTitle === 'In Production');

    expect(draft?.status).toBe('DRAFT');
    expect(inProd?.status).toBe('IN_PRODUCTION');
  });
});

// ============================================
// FILTER TESTS
// ============================================

describe('WINRegisterService - Filtering', () => {
  const testEntries: WINRegisterEntry[] = [
    {
      boatId: 'b1',
      boatLabel: 'Hull 001',
      win: 'NL-NAV-44001-2024',
      projectId: '1',
      projectNumber: 'PRJ-2024-0001',
      projectTitle: 'Eagle 44 for Smith',
      boatModel: 'Eagle 44',
      status: 'IN_PRODUCTION',
      clientId: 'client-1',
      createdAt: '2024-06-01',
    },
    {
      boatId: 'b2',
      boatLabel: 'Hull 002',
      win: 'NL-NAV-44002-2024',
      projectId: '1',
      projectNumber: 'PRJ-2024-0001',
      projectTitle: 'Eagle 44 for Smith',
      boatModel: 'Eagle 44',
      status: 'IN_PRODUCTION',
      clientId: 'client-1',
      createdAt: '2024-06-01',
    },
    {
      boatId: 'b3',
      boatLabel: 'Boat 01',
      win: 'NL-NAV-32001-2024',
      projectId: '2',
      projectNumber: 'PRJ-2024-0002',
      projectTitle: 'Falcon 32 for Jones',
      boatModel: 'Falcon 32',
      status: 'DRAFT',
      clientId: 'client-2',
      createdAt: '2024-07-01',
    },
    {
      boatId: 'b4',
      boatLabel: 'Boat 01',
      win: null,
      projectId: '3',
      projectNumber: 'PRJ-2024-0003',
      projectTitle: 'Eagle 36 for Williams',
      boatModel: 'Eagle 36',
      status: 'QUOTED',
      clientId: 'client-3',
      createdAt: '2024-08-01',
    },
  ];

  test('should return all entries when search is empty', () => {
    const result = filterWINRegisterEntries(testEntries, { search: '' });
    expect(result.length).toBe(4);
  });

  test('should return all entries when search is undefined', () => {
    const result = filterWINRegisterEntries(testEntries, {});
    expect(result.length).toBe(4);
  });

  test('should filter by WIN number', () => {
    const result = filterWINRegisterEntries(testEntries, { search: '44001' });
    expect(result.length).toBe(1);
    expect(result[0].win).toBe('NL-NAV-44001-2024');
  });

  test('should filter by boat label', () => {
    const result = filterWINRegisterEntries(testEntries, { search: 'Hull' });
    expect(result.length).toBe(2);
    expect(result[0].boatLabel).toBe('Hull 001');
    expect(result[1].boatLabel).toBe('Hull 002');
  });

  test('should filter by project number', () => {
    const result = filterWINRegisterEntries(testEntries, { search: '0002' });
    expect(result.length).toBe(1);
    expect(result[0].projectNumber).toBe('PRJ-2024-0002');
  });

  test('should filter by project title', () => {
    const result = filterWINRegisterEntries(testEntries, { search: 'Jones' });
    expect(result.length).toBe(1);
    expect(result[0].projectTitle).toBe('Falcon 32 for Jones');
  });

  test('should filter by boat model', () => {
    const result = filterWINRegisterEntries(testEntries, { search: 'Eagle' });
    expect(result.length).toBe(3); // 2 from Smith project + 1 from Williams project
  });

  test('should be case-insensitive', () => {
    const result = filterWINRegisterEntries(testEntries, { search: 'HULL' });
    expect(result.length).toBe(2);
  });

  test('should return empty array when no matches', () => {
    const result = filterWINRegisterEntries(testEntries, { search: 'xyz999' });
    expect(result.length).toBe(0);
  });
});

// ============================================
// STATISTICS TESTS
// ============================================

describe('WINRegisterService - Statistics', () => {
  beforeEach(async () => {
    await clearProjects();
  });

  test('should calculate statistics correctly (boats, not projects)', async () => {
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'Project 1',
      boats: [
        { id: 'b1', label: 'Boat 01', win: 'NL-NAV-001' },
        { id: 'b2', label: 'Boat 02', win: 'NL-NAV-002' },
      ],
    });
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'Project 2',
      boats: [
        { id: 'b3', label: 'Boat 01', win: undefined },
      ],
    });
    await createTestProject({ type: 'REFIT', title: 'Refit' }); // Should not count

    const stats = await WINRegisterService.getWINStatistics();

    expect(stats.totalNewBuildProjects).toBe(2);
    expect(stats.totalBoats).toBe(3);
    expect(stats.boatsWithWIN).toBe(2);
    expect(stats.boatsWithoutWIN).toBe(1);
  });

  test('should return zeros when no projects', async () => {
    const stats = await WINRegisterService.getWINStatistics();

    expect(stats.totalNewBuildProjects).toBe(0);
    expect(stats.totalBoats).toBe(0);
    expect(stats.boatsWithWIN).toBe(0);
    expect(stats.boatsWithoutWIN).toBe(0);
  });

  test('should count migrated boats from legacy projects', async () => {
    // Legacy project with win but no boats array
    await createTestProject({
      type: 'NEW_BUILD',
      title: 'Legacy Project',
      win: 'NL-NAV-LEGACY-2024',
      // No boats array
    });

    const stats = await WINRegisterService.getWINStatistics();

    expect(stats.totalNewBuildProjects).toBe(1);
    expect(stats.totalBoats).toBe(1);
    expect(stats.boatsWithWIN).toBe(1);
    expect(stats.boatsWithoutWIN).toBe(0);
  });
});

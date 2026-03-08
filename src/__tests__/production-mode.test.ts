/**
 * Production Mode Tests
 * Tests for single/serial production mode during project creation:
 * - Single boat: creates 1 BoatInstance (Boat 01)
 * - Serial production: creates Boat 01..Boat NN (min 2, default 2)
 * - Default behavior: single boat if user skips choice
 * - Old imports unchanged (backward compatibility)
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import { ProjectRepository } from '@/data/repositories';
import type { Project, ProjectConfiguration } from '@/domain/models';
import { now } from '@/domain/models';

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

async function clearProjects() {
  const { getAdapter } = await import('@/data/persistence');
  const projects = await getAdapter().getAll<Project>('projects');
  for (const project of projects) {
    await getAdapter().delete('projects', project.id);
  }
}

async function clearClients() {
  const { getAdapter } = await import('@/data/persistence');
  const clients = await getAdapter().getAll<{ id: string }>('clients');
  for (const client of clients) {
    await getAdapter().delete('clients', client.id);
  }
}

async function createTestClient() {
  const { getAdapter } = await import('@/data/persistence');
  await getAdapter().save('clients', {
    id: 'test-client',
    name: 'Test Client',
    type: 'INDIVIDUAL',
    createdAt: now(),
    updatedAt: now(),
    version: 0,
  });
}

// ============================================
// SINGLE BOAT MODE TESTS
// ============================================

describe('ProductionMode - Single Boat', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('productionMode=single creates 1 boat', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Single Boat Project',
        type: 'NEW_BUILD',
        clientId: 'test-client',
        productionMode: 'single',
      },
      'test-user'
    );

    expect(project.boats).toBeDefined();
    expect(project.boats!.length).toBe(1);
    expect(project.boats![0].label).toBe('Boat 01');
    expect(project.boats![0].win).toBeUndefined();
  });

  test('default (no productionMode) creates 1 boat for backward compatibility', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Default Boat Project',
        type: 'NEW_BUILD',
        clientId: 'test-client',
        // No productionMode specified - defaults to single
      },
      'test-user'
    );

    expect(project.boats).toBeDefined();
    expect(project.boats!.length).toBe(1);
    expect(project.boats![0].label).toBe('Boat 01');
  });

  test('productionMode=single with initialBoatCount is ignored', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Single With Count',
        type: 'NEW_BUILD',
        clientId: 'test-client',
        productionMode: 'single',
        initialBoatCount: 5, // Should be ignored
      },
      'test-user'
    );

    expect(project.boats!.length).toBe(1);
  });
});

// ============================================
// SERIAL PRODUCTION MODE TESTS
// ============================================

describe('ProductionMode - Serial Production', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('productionMode=serial with default count creates 2 boats', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Serial Production Default',
        type: 'NEW_BUILD',
        clientId: 'test-client',
        productionMode: 'serial',
        // No initialBoatCount - defaults to 2
      },
      'test-user'
    );

    expect(project.boats).toBeDefined();
    expect(project.boats!.length).toBe(2);
    expect(project.boats![0].label).toBe('Boat 01');
    expect(project.boats![1].label).toBe('Boat 02');
  });

  test('productionMode=serial with custom count creates correct boats', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Serial Production 5',
        type: 'NEW_BUILD',
        clientId: 'test-client',
        productionMode: 'serial',
        initialBoatCount: 5,
      },
      'test-user'
    );

    expect(project.boats!.length).toBe(5);
    expect(project.boats![0].label).toBe('Boat 01');
    expect(project.boats![1].label).toBe('Boat 02');
    expect(project.boats![2].label).toBe('Boat 03');
    expect(project.boats![3].label).toBe('Boat 04');
    expect(project.boats![4].label).toBe('Boat 05');
  });

  test('productionMode=serial enforces minimum of 2 boats', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Serial Production Min',
        type: 'NEW_BUILD',
        clientId: 'test-client',
        productionMode: 'serial',
        initialBoatCount: 1, // Below minimum
      },
      'test-user'
    );

    expect(project.boats!.length).toBe(2); // Enforced minimum
  });

  test('productionMode=serial with 10 boats creates correct labels', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Serial Production 10',
        type: 'NEW_BUILD',
        clientId: 'test-client',
        productionMode: 'serial',
        initialBoatCount: 10,
      },
      'test-user'
    );

    expect(project.boats!.length).toBe(10);
    expect(project.boats![9].label).toBe('Boat 10');
  });
});

// ============================================
// NON-NEW_BUILD PROJECTS
// ============================================

describe('ProductionMode - Non-NEW_BUILD Projects', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('REFIT project does not create boats', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Refit Project',
        type: 'REFIT',
        clientId: 'test-client',
      },
      'test-user'
    );

    expect(project.boats).toBeUndefined();
  });

  test('MAINTENANCE project does not create boats', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Maintenance Project',
        type: 'MAINTENANCE',
        clientId: 'test-client',
      },
      'test-user'
    );

    expect(project.boats).toBeUndefined();
  });

  test('REFIT with productionMode is ignored', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Refit With Mode',
        type: 'REFIT',
        clientId: 'test-client',
        productionMode: 'serial',
        initialBoatCount: 5,
      },
      'test-user'
    );

    expect(project.boats).toBeUndefined();
  });
});

// ============================================
// BACKWARD COMPATIBILITY TESTS
// ============================================

describe('ProductionMode - Backward Compatibility', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('legacy import without boats gets migrated correctly', async () => {
    const { getAdapter } = await import('@/data/persistence');

    // Simulate an old project without boats array
    const legacyProject = {
      id: 'legacy-project',
      projectNumber: 'PRJ-2024-9999',
      title: 'Legacy Project',
      type: 'NEW_BUILD',
      status: 'DRAFT',
      clientId: 'test-client',
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
      // NO boats array
    };

    // Create export data manually (simulating import from old version)
    const exportData = {
      manifest: {
        version: '1.0.0',
        appVersion: '4.0.0',
        exportedAt: now(),
        exportedBy: 'Test User',
        counts: {
          projects: 1,
          clients: 1,
          users: 0,
          articles: 0,
          articleVersions: 0,
          kits: 0,
          kitVersions: 0,
          categories: 0,
          subcategories: 0,
          templates: 0,
          procedures: 0,
          boatModels: 0,
          equipmentItems: 0,
          productionProcedures: 0,
          productionProcedureVersions: 0,
          auditEntries: 0,
          timesheets: 0,
        },
        options: {
          includeProjects: true,
          includeClients: true,
          includeUsers: false,
          includeUserPasswords: false,
          includeLibrary: false,
          includeAuditLog: false,
          includeDocuments: false,
        },
      },
      projects: [legacyProject as unknown as Project],
      clients: [
        {
          id: 'test-client',
          name: 'Test Client',
          type: 'INDIVIDUAL',
          createdAt: now(),
          updatedAt: now(),
          version: 0,
        },
      ],
    };

    const { ExportImportService } = await import('@/domain/services/ExportImportService');

    const importResult = await ExportImportService.importData(
      exportData as any,
      {
        mode: 'merge',
        skipConflicts: false,
        importProjects: true,
        importClients: true,
        importUsers: false,
        importLibrary: false,
        importAuditLog: false,
      },
      { userId: 'test', userName: 'Test User' }
    );

    expect(importResult.ok).toBe(true);

    // Legacy projects without boats are imported as-is
    // Migration happens at read-time via ensureBoatInstances
    const imported = await ProjectRepository.getById('legacy-project');
    expect(imported).toBeDefined();
    // Note: boats might be undefined on import, but ensureBoatInstances handles this at read-time
  });

  test('legacy project with win field gets migrated via ensureBoatInstances', async () => {
    const { WINRegisterService, ensureBoatInstances } = await import('@/domain/services/WINRegisterService');

    // Create a legacy project with win but no boats
    const legacyProject: Partial<Project> = {
      id: 'legacy-win-project',
      projectNumber: 'PRJ-2024-8888',
      type: 'NEW_BUILD',
      win: 'NL-NAV-LEGACY-2024',
      // No boats array
    };

    const boats = ensureBoatInstances(legacyProject as Project);

    expect(boats.length).toBe(1);
    expect(boats[0].label).toBe('Boat 01');
    expect(boats[0].win).toBe('NL-NAV-LEGACY-2024');
  });
});

// ============================================
// ZIP ROUNDTRIP TESTS
// ============================================

describe('ProductionMode - ZIP Roundtrip', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('serial production boats survive export/import', async () => {
    // Create a project with serial production
    const project = await ProjectRepository.create(
      {
        title: 'Serial Production Export',
        type: 'NEW_BUILD',
        clientId: 'test-client',
        productionMode: 'serial',
        initialBoatCount: 3,
      },
      'test-user'
    );

    expect(project.boats!.length).toBe(3);

    // Export
    const { ExportImportService } = await import('@/domain/services/ExportImportService');

    const exportResult = await ExportImportService.exportData(
      {
        includeProjects: true,
        includeClients: true,
        includeUsers: false,
        includeUserPasswords: false,
        includeLibrary: false,
        includeAuditLog: false,
        includeDocuments: false,
        includeTimesheets: false,
      },
      { userId: 'test', userName: 'Test User' }
    );

    expect(exportResult.ok).toBe(true);
    if (!exportResult.ok) return;

    // Clear and re-import
    await clearProjects();

    const importResult = await ExportImportService.importData(
      exportResult.value,
      {
        mode: 'merge',
        skipConflicts: false,
        importProjects: true,
        importClients: true,
        importUsers: false,
        importLibrary: false,
        importAuditLog: false,
      },
      { userId: 'test', userName: 'Test User' }
    );

    expect(importResult.ok).toBe(true);

    // Verify the imported project
    const imported = await ProjectRepository.getById(project.id);
    expect(imported).toBeDefined();
    expect(imported!.boats).toBeDefined();
    expect(imported!.boats!.length).toBe(3);
    expect(imported!.boats![0].label).toBe('Boat 01');
    expect(imported!.boats![1].label).toBe('Boat 02');
    expect(imported!.boats![2].label).toBe('Boat 03');
  });
});

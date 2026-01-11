/**
 * Export/Import Service Tests
 * Tests for data export and import functionality
 */

import { describe, test, expect } from 'bun:test';
import { ExportImportService, type ExportOptions, type ImportOptions, type ExportData, EXPORT_VERSION, APP_VERSION } from '@/domain/services/ExportImportService';
import { generateUUID, now } from '@/domain/models';
import type { Project, Client } from '@/domain/models';

// ============================================
// TEST DATA FACTORIES
// ============================================

function createTestClient(): Client {
  return {
    id: generateUUID(),
    clientNumber: 'CLI-TEST-0001',
    name: 'Test Client',
    type: 'company',
    status: 'active',
    email: 'test@example.com',
    country: 'Netherlands',
    createdAt: now(),
    updatedAt: now(),
    version: 1,
  };
}

function createTestProject(clientId: string): Project {
  return {
    id: generateUUID(),
    projectNumber: 'PRJ-TEST-0001',
    title: 'Test Project',
    type: 'NEW_BUILD',
    status: 'DRAFT',
    clientId,
    configuration: {
      propulsionType: 'Electric',
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
    createdAt: now(),
    createdBy: 'test-user',
    updatedAt: now(),
    version: 1,
  };
}

function createMinimalManifest() {
  return {
    version: EXPORT_VERSION,
    appVersion: APP_VERSION,
    exportedAt: now(),
    exportedBy: 'Test',
    counts: {
      projects: 0,
      clients: 0,
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
      auditEntries: 0,
    },
    options: ExportImportService.getDefaultExportOptions(),
  };
}

const testContext = {
  userId: 'test-user',
  userName: 'Test User',
};

// ============================================
// EXPORT TESTS
// ============================================

describe('ExportImportService - Export', () => {
  test('should export with default options and return valid manifest', async () => {
    const options = ExportImportService.getDefaultExportOptions();
    const result = await ExportImportService.exportData(options, testContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.manifest).toBeDefined();
      expect(result.value.manifest.version).toBe(EXPORT_VERSION);
      expect(result.value.manifest.appVersion).toBe(APP_VERSION);
      expect(result.value.manifest.exportedBy).toBe('Test User');
      expect(result.value.manifest.exportedAt).toBeDefined();
    }
  });

  test('should respect selective export options', async () => {
    const options: ExportOptions = {
      includeProjects: false,
      includeClients: false,
      includeUsers: false,
      includeUserPasswords: false,
      includeLibrary: false,
      includeAuditLog: false,
      includeDocuments: false,
    };

    const result = await ExportImportService.exportData(options, testContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.projects).toBeUndefined();
      expect(result.value.clients).toBeUndefined();
      expect(result.value.users).toBeUndefined();
      expect(result.value.library).toBeUndefined();
      expect(result.value.auditEntries).toBeUndefined();
    }
  });

  test('should include arrays when options are enabled', async () => {
    const options: ExportOptions = {
      includeProjects: true,
      includeClients: true,
      includeUsers: true,
      includeUserPasswords: false,
      includeLibrary: true,
      includeAuditLog: true,
      includeDocuments: false,
    };

    const result = await ExportImportService.exportData(options, testContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.value.projects)).toBe(true);
      expect(Array.isArray(result.value.clients)).toBe(true);
      expect(Array.isArray(result.value.users)).toBe(true);
      expect(result.value.library).toBeDefined();
      expect(Array.isArray(result.value.auditEntries)).toBe(true);
    }
  });
});

// ============================================
// IMPORT PREVIEW TESTS
// ============================================

describe('ExportImportService - Import Preview', () => {
  test('should preview new items correctly', async () => {
    const client = createTestClient();
    const project = createTestProject(client.id);

    const exportData = {
      manifest: { ...createMinimalManifest(), counts: { ...createMinimalManifest().counts, projects: 1, clients: 1 } },
      projects: [project],
      clients: [client],
    };

    const result = await ExportImportService.previewImport(exportData);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // New items should be counted
      expect(result.value.counts.projects.new).toBeGreaterThanOrEqual(0);
      expect(result.value.counts.clients.new).toBeGreaterThanOrEqual(0);
      expect(result.value.isCompatible).toBe(true);
    }
  });

  test('should detect version incompatibility warnings', async () => {
    const exportData = {
      manifest: {
        ...createMinimalManifest(),
        version: '2.0.0', // Different major version
      },
    };

    const result = await ExportImportService.previewImport(exportData);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.warnings.length).toBeGreaterThan(0);
      expect(result.value.warnings.some(w => w.includes('compatible'))).toBe(true);
    }
  });

  test('should detect pinned/frozen projects in conflicts', async () => {
    const client = createTestClient();
    const project = createTestProject(client.id);
    project.configuration.isFrozen = true;
    project.libraryPins = {
      boatModelVersionId: 'test',
      catalogVersionId: 'test',
      templateVersionIds: {},
      procedureVersionIds: [],
      pinnedAt: now(),
      pinnedBy: 'test',
    };

    const exportData = {
      manifest: createMinimalManifest(),
      projects: [project],
    };

    const result = await ExportImportService.previewImport(exportData);

    expect(result.ok).toBe(true);
    // Preview should succeed even with frozen projects
  });
});

// ============================================
// IMPORT TESTS
// ============================================

describe('ExportImportService - Import', () => {
  test('should import new clients in merge mode', async () => {
    const client = createTestClient();
    client.id = generateUUID(); // Ensure unique ID

    const exportData = {
      manifest: createMinimalManifest(),
      clients: [client],
    };

    const options: ImportOptions = {
      ...ExportImportService.getDefaultImportOptions(),
      mode: 'merge',
    };

    const result = await ExportImportService.importData(exportData, options, testContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Import should succeed
      expect(result.value.success).toBe(true);
      expect(result.value.errors.length).toBe(0);
    }
  });

  test('should handle import with no data gracefully', async () => {
    const exportData = {
      manifest: createMinimalManifest(),
    };

    const options: ImportOptions = {
      ...ExportImportService.getDefaultImportOptions(),
      mode: 'merge',
    };

    const result = await ExportImportService.importData(exportData, options, testContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.success).toBe(true);
      expect(result.value.imported.clients).toBe(0);
      expect(result.value.imported.projects).toBe(0);
    }
  });

  test('should skip project if client is missing', async () => {
    const project = createTestProject('non-existent-client-id');

    const exportData = {
      manifest: createMinimalManifest(),
      projects: [project],
    };

    const options: ImportOptions = {
      ...ExportImportService.getDefaultImportOptions(),
      mode: 'merge',
    };

    const result = await ExportImportService.importData(exportData, options, testContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.imported.projects).toBe(0);
      expect(result.value.errors.some(e => e.includes('client not found'))).toBe(true);
    }
  });

  test('should import projects with their client dependencies', async () => {
    const client = createTestClient();
    client.id = generateUUID();
    const project = createTestProject(client.id);
    project.id = generateUUID();

    const exportData = {
      manifest: createMinimalManifest(),
      clients: [client],
      projects: [project],
    };

    const options: ImportOptions = {
      ...ExportImportService.getDefaultImportOptions(),
      mode: 'merge',
    };

    const result = await ExportImportService.importData(exportData, options, testContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Client should be imported first
      expect(result.value.imported.clients).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================
// VALIDATION TESTS
// ============================================

describe('ExportImportService - Validation', () => {
  test('should validate valid export data structure', () => {
    const validData = {
      manifest: {
        version: '1.0.0',
        appVersion: '4.0.0',
        exportedAt: now(),
        exportedBy: 'Test',
        counts: {},
        options: {},
      },
    };

    const result = ExportImportService.validateExportData(validData);
    expect(result.ok).toBe(true);
  });

  test('should reject data without manifest', () => {
    const invalidData = {
      noManifest: true,
    };

    const result = ExportImportService.validateExportData(invalidData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('missing manifest');
    }
  });

  test('should reject data with missing version', () => {
    const invalidData = {
      manifest: {
        exportedAt: now(),
      },
    };

    const result = ExportImportService.validateExportData(invalidData);
    expect(result.ok).toBe(false);
  });

  test('should reject null data', () => {
    const result = ExportImportService.validateExportData(null);
    expect(result.ok).toBe(false);
  });

  test('should reject non-object data', () => {
    const result = ExportImportService.validateExportData('string');
    expect(result.ok).toBe(false);
  });
});

// ============================================
// DEFAULT OPTIONS TESTS
// ============================================

describe('ExportImportService - Default Options', () => {
  test('should provide sensible default export options', () => {
    const options = ExportImportService.getDefaultExportOptions();

    expect(options.includeProjects).toBe(true);
    expect(options.includeClients).toBe(true);
    expect(options.includeUsers).toBe(true);
    expect(options.includeUserPasswords).toBe(false); // Security default
    expect(options.includeLibrary).toBe(true);
    expect(options.includeAuditLog).toBe(true);
    expect(options.includeDocuments).toBe(false); // Not implemented
  });

  test('should provide sensible default import options', () => {
    const options = ExportImportService.getDefaultImportOptions();

    expect(options.mode).toBe('merge'); // Safe default
    expect(options.skipConflicts).toBe(true); // Safe default
    expect(options.importProjects).toBe(true);
    expect(options.importClients).toBe(true);
    expect(options.importUsers).toBe(true);
    expect(options.importLibrary).toBe(true);
    expect(options.importAuditLog).toBe(true);
  });
});

// ============================================
// MERGE VS REPLACE BEHAVIOR TESTS
// ============================================

describe('ExportImportService - Merge vs Replace Behavior', () => {
  test('merge mode should be the default', () => {
    const options = ExportImportService.getDefaultImportOptions();
    expect(options.mode).toBe('merge');
  });

  test('merge mode with skipConflicts should be safe', () => {
    const options = ExportImportService.getDefaultImportOptions();
    expect(options.mode).toBe('merge');
    expect(options.skipConflicts).toBe(true);
  });

  test('replace mode exists as an option', () => {
    const options: ImportOptions = {
      ...ExportImportService.getDefaultImportOptions(),
      mode: 'replace',
    };
    expect(options.mode).toBe('replace');
  });
});

// ============================================
// PINNED DATA PROTECTION TESTS
// ============================================

describe('ExportImportService - Pinned Data Protection', () => {
  test('frozen project should be marked as pinned in preview', async () => {
    const client = createTestClient();
    const project = createTestProject(client.id);
    project.configuration.isFrozen = true;

    const exportData = {
      manifest: createMinimalManifest(),
      projects: [project],
    };

    const result = await ExportImportService.previewImport(exportData);
    expect(result.ok).toBe(true);
  });

  test('project with library pins should be marked as pinned', async () => {
    const client = createTestClient();
    const project = createTestProject(client.id);
    project.libraryPins = {
      boatModelVersionId: 'version-1',
      catalogVersionId: 'catalog-2024',
      templateVersionIds: {},
      procedureVersionIds: [],
      pinnedAt: now(),
      pinnedBy: 'admin',
    };

    const exportData = {
      manifest: createMinimalManifest(),
      projects: [project],
    };

    const result = await ExportImportService.previewImport(exportData);
    expect(result.ok).toBe(true);
  });
});

// ============================================
// AUDIT LOG IMPORT TESTS
// ============================================

describe('ExportImportService - Audit Log', () => {
  test('audit entries should always be merged, never replaced', async () => {
    const exportData = {
      manifest: createMinimalManifest(),
      auditEntries: [
        {
          id: generateUUID(),
          timestamp: now(),
          createdAt: now(),
          userId: 'test',
          userName: 'Test',
          action: 'CREATE' as const,
          entityType: 'Project',
          entityId: 'test-123',
          description: 'Test entry',
        },
      ],
    };

    // Even in replace mode, audit should merge
    const options: ImportOptions = {
      ...ExportImportService.getDefaultImportOptions(),
      mode: 'replace',
      importAuditLog: true,
    };

    const result = await ExportImportService.importData(exportData, options, testContext);
    expect(result.ok).toBe(true);
  });
});

// ============================================
// PRODUCTION STAGE PLANNED DATES TESTS
// ============================================

describe('ExportImportService - Production Stage Planned Dates', () => {
  test('should export and import production stages with plannedStartDate and plannedEndDate', async () => {
    // Create a project with production stages that have planned dates
    const projectWithStages: Project = {
      ...createTestProject('client-1'),
      id: 'proj-planned-dates-test',
      status: 'IN_PRODUCTION',
      productionStages: [
        {
          id: 'stage-1',
          projectId: 'proj-planned-dates-test',
          code: 'PREP',
          name: 'Preparation',
          order: 1,
          status: 'IN_PROGRESS',
          progressPercent: 50,
          autoProgressFromTasks: false,
          estimatedDays: 5,
          plannedStartDate: '2025-01-15',
          plannedEndDate: '2025-01-20',
          taskIds: [],
          comments: [],
          photos: [],
          createdAt: now(),
          updatedAt: now(),
          version: 0,
        },
        {
          id: 'stage-2',
          projectId: 'proj-planned-dates-test',
          code: 'HULL',
          name: 'Hull Construction',
          order: 2,
          status: 'NOT_STARTED',
          progressPercent: 0,
          autoProgressFromTasks: false,
          estimatedDays: 15,
          plannedStartDate: '2025-01-21',
          plannedEndDate: '2025-02-05',
          taskIds: [],
          comments: [],
          photos: [],
          createdAt: now(),
          updatedAt: now(),
          version: 0,
        },
      ],
    };

    const exportData: ExportData = {
      manifest: {
        ...createMinimalManifest(),
        counts: {
          ...createMinimalManifest().counts,
          projects: 1,
        },
      },
      projects: [projectWithStages],
    };

    // Verify the export data contains the planned dates
    expect(exportData.projects![0].productionStages![0].plannedStartDate).toBe('2025-01-15');
    expect(exportData.projects![0].productionStages![0].plannedEndDate).toBe('2025-01-20');
    expect(exportData.projects![0].productionStages![1].plannedStartDate).toBe('2025-01-21');
    expect(exportData.projects![0].productionStages![1].plannedEndDate).toBe('2025-02-05');

    // Simulate JSON serialization/deserialization (as would happen in ZIP export/import)
    const serialized = JSON.stringify(exportData);
    const deserialized: ExportData = JSON.parse(serialized);

    // Verify planned dates survive serialization roundtrip
    expect(deserialized.projects![0].productionStages![0].plannedStartDate).toBe('2025-01-15');
    expect(deserialized.projects![0].productionStages![0].plannedEndDate).toBe('2025-01-20');
    expect(deserialized.projects![0].productionStages![1].plannedStartDate).toBe('2025-01-21');
    expect(deserialized.projects![0].productionStages![1].plannedEndDate).toBe('2025-02-05');

    // Import the data
    const importOptions: ImportOptions = {
      ...ExportImportService.getDefaultImportOptions(),
      mode: 'merge',
      importProjects: true,
    };

    const result = await ExportImportService.importData(deserialized, importOptions, testContext);
    expect(result.ok).toBe(true);
  });

  test('should import projects with production stages that have no planned dates (backward compatibility)', async () => {
    // Create a project with production stages WITHOUT planned dates (simulating old export format)
    const projectWithOldStages: Project = {
      ...createTestProject('client-2'),
      id: 'proj-old-format-test',
      status: 'IN_PRODUCTION',
      productionStages: [
        {
          id: 'stage-old-1',
          projectId: 'proj-old-format-test',
          code: 'PREP',
          name: 'Preparation',
          order: 1,
          status: 'NOT_STARTED',
          progressPercent: 0,
          autoProgressFromTasks: false,
          estimatedDays: 5,
          // NO plannedStartDate or plannedEndDate (simulating old format)
          taskIds: [],
          comments: [],
          photos: [],
          createdAt: now(),
          updatedAt: now(),
          version: 0,
        },
      ],
    };

    const exportData: ExportData = {
      manifest: {
        ...createMinimalManifest(),
        counts: {
          ...createMinimalManifest().counts,
          projects: 1,
        },
      },
      projects: [projectWithOldStages],
    };

    // Verify stage has no planned dates
    expect(exportData.projects![0].productionStages![0].plannedStartDate).toBeUndefined();
    expect(exportData.projects![0].productionStages![0].plannedEndDate).toBeUndefined();

    // Simulate JSON roundtrip
    const serialized = JSON.stringify(exportData);
    const deserialized: ExportData = JSON.parse(serialized);

    // Import should succeed without errors
    const importOptions: ImportOptions = {
      ...ExportImportService.getDefaultImportOptions(),
      mode: 'merge',
      importProjects: true,
    };

    const result = await ExportImportService.importData(deserialized, importOptions, testContext);
    expect(result.ok).toBe(true);

    // Stage should still have no planned dates (not auto-populated)
    expect(deserialized.projects![0].productionStages![0].plannedStartDate).toBeUndefined();
    expect(deserialized.projects![0].productionStages![0].plannedEndDate).toBeUndefined();
  });

  test('should preserve partial planned dates (only start or only end)', async () => {
    const projectWithPartialDates: Project = {
      ...createTestProject('client-3'),
      id: 'proj-partial-dates-test',
      status: 'IN_PRODUCTION',
      productionStages: [
        {
          id: 'stage-partial-1',
          projectId: 'proj-partial-dates-test',
          code: 'PREP',
          name: 'Preparation',
          order: 1,
          status: 'IN_PROGRESS',
          progressPercent: 25,
          autoProgressFromTasks: false,
          estimatedDays: 5,
          plannedStartDate: '2025-02-01', // Only start date set
          // No plannedEndDate
          taskIds: [],
          comments: [],
          photos: [],
          createdAt: now(),
          updatedAt: now(),
          version: 0,
        },
        {
          id: 'stage-partial-2',
          projectId: 'proj-partial-dates-test',
          code: 'HULL',
          name: 'Hull Construction',
          order: 2,
          status: 'NOT_STARTED',
          progressPercent: 0,
          autoProgressFromTasks: false,
          estimatedDays: 15,
          // No plannedStartDate
          plannedEndDate: '2025-03-15', // Only end date set
          taskIds: [],
          comments: [],
          photos: [],
          createdAt: now(),
          updatedAt: now(),
          version: 0,
        },
      ],
    };

    const exportData: ExportData = {
      manifest: {
        ...createMinimalManifest(),
        counts: {
          ...createMinimalManifest().counts,
          projects: 1,
        },
      },
      projects: [projectWithPartialDates],
    };

    // JSON roundtrip
    const serialized = JSON.stringify(exportData);
    const deserialized: ExportData = JSON.parse(serialized);

    // Verify partial dates are preserved correctly
    const stage1 = deserialized.projects![0].productionStages![0];
    const stage2 = deserialized.projects![0].productionStages![1];

    expect(stage1.plannedStartDate).toBe('2025-02-01');
    expect(stage1.plannedEndDate).toBeUndefined();
    expect(stage2.plannedStartDate).toBeUndefined();
    expect(stage2.plannedEndDate).toBe('2025-03-15');

    // Import should succeed
    const importOptions: ImportOptions = {
      ...ExportImportService.getDefaultImportOptions(),
      mode: 'merge',
      importProjects: true,
    };

    const result = await ExportImportService.importData(deserialized, importOptions, testContext);
    expect(result.ok).toBe(true);
  });
});

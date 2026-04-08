/**
 * Technical File Tests
 * Tests for Technical File structure, backward compatibility, and ZIP roundtrip
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import {
  createEmptyTechnicalFile,
  ensureTechnicalFile,
  TECHNICAL_FILE_SECTION_IDS,
  TECHNICAL_FILE_SECTION_TITLES,
  type TechnicalFile,
  type TechnicalFileSection,
} from '@/domain/models/technical-file';
import { ProjectRepository } from '@/data/repositories';
import type { Project, ProjectConfiguration } from '@/domain/models';
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

// ============================================
// SECTION STRUCTURE TESTS
// ============================================

describe('TechnicalFile - Section Structure', () => {
  test('should have exactly 10 section IDs', () => {
    expect(TECHNICAL_FILE_SECTION_IDS.length).toBe(10);
  });

  test('should have correct section IDs', () => {
    expect(TECHNICAL_FILE_SECTION_IDS).toContain('general-description');
    expect(TECHNICAL_FILE_SECTION_IDS).toContain('design-drawings');
    expect(TECHNICAL_FILE_SECTION_IDS).toContain('calculations');
    expect(TECHNICAL_FILE_SECTION_IDS).toContain('materials');
    expect(TECHNICAL_FILE_SECTION_IDS).toContain('essential-requirements');
    expect(TECHNICAL_FILE_SECTION_IDS).toContain('stability-buoyancy');
    expect(TECHNICAL_FILE_SECTION_IDS).toContain('electrical-systems');
    expect(TECHNICAL_FILE_SECTION_IDS).toContain('fuel-systems');
    expect(TECHNICAL_FILE_SECTION_IDS).toContain('steering-systems');
    expect(TECHNICAL_FILE_SECTION_IDS).toContain('conformity-assessment');
  });

  test('should have titles for all sections', () => {
    for (const sectionId of TECHNICAL_FILE_SECTION_IDS) {
      expect(TECHNICAL_FILE_SECTION_TITLES[sectionId]).toBeDefined();
      expect(typeof TECHNICAL_FILE_SECTION_TITLES[sectionId]).toBe('string');
      expect(TECHNICAL_FILE_SECTION_TITLES[sectionId].length).toBeGreaterThan(0);
    }
  });
});

// ============================================
// FACTORY FUNCTION TESTS
// ============================================

describe('TechnicalFile - createEmptyTechnicalFile', () => {
  test('should create a technical file with 10 sections', () => {
    const technicalFile = createEmptyTechnicalFile();

    expect(technicalFile.sections.length).toBe(10);
  });

  test('should create sections in correct order', () => {
    const technicalFile = createEmptyTechnicalFile();

    for (let i = 0; i < TECHNICAL_FILE_SECTION_IDS.length; i++) {
      expect(technicalFile.sections[i].id).toBe(TECHNICAL_FILE_SECTION_IDS[i]);
    }
  });

  test('should assign correct titles to sections', () => {
    const technicalFile = createEmptyTechnicalFile();

    for (const section of technicalFile.sections) {
      expect(section.title).toBe(TECHNICAL_FILE_SECTION_TITLES[section.id]);
    }
  });

  test('should create sections with empty items array', () => {
    const technicalFile = createEmptyTechnicalFile();

    for (const section of technicalFile.sections) {
      expect(Array.isArray(section.items)).toBe(true);
      expect(section.items.length).toBe(0);
    }
  });
});

// ============================================
// BACKWARD COMPATIBILITY TESTS
// ============================================

describe('TechnicalFile - ensureTechnicalFile (Backward Compatibility)', () => {
  test('should create empty technical file when undefined', () => {
    const result = ensureTechnicalFile(undefined);

    expect(result.sections.length).toBe(10);
    for (const section of result.sections) {
      expect(section.items.length).toBe(0);
    }
  });

  test('should preserve existing sections and items', () => {
    const existingFile: TechnicalFile = {
      sections: [
        {
          id: 'general-description',
          title: 'General Description',
          items: [{ kind: 'attachmentRef', attachmentId: 'att-001', note: 'Main specs' }],
        },
        {
          id: 'design-drawings',
          title: 'Design Drawings & Plans',
          items: [{ kind: 'attachmentRef', attachmentId: 'att-002' }],
        },
      ],
    };

    const result = ensureTechnicalFile(existingFile);

    // Should have all 10 sections
    expect(result.sections.length).toBe(10);

    // Existing sections should preserve their items
    const generalSection = result.sections.find((s) => s.id === 'general-description');
    expect(generalSection?.items.length).toBe(1);
    expect(generalSection?.items[0].attachmentId).toBe('att-001');
    expect(generalSection?.items[0].note).toBe('Main specs');

    const drawingsSection = result.sections.find((s) => s.id === 'design-drawings');
    expect(drawingsSection?.items.length).toBe(1);
    expect(drawingsSection?.items[0].attachmentId).toBe('att-002');
  });

  test('should add missing sections', () => {
    const partialFile: TechnicalFile = {
      sections: [
        {
          id: 'general-description',
          title: 'General Description',
          items: [],
        },
      ],
    };

    const result = ensureTechnicalFile(partialFile);

    // Should have all 10 sections
    expect(result.sections.length).toBe(10);

    // Missing sections should be added with empty items
    const calcSection = result.sections.find((s) => s.id === 'calculations');
    expect(calcSection).toBeDefined();
    expect(calcSection?.items.length).toBe(0);
  });

  test('should sort sections in correct order', () => {
    const unorderedFile: TechnicalFile = {
      sections: [
        { id: 'conformity-assessment', title: 'Conformity Assessment Documentation', items: [] },
        { id: 'general-description', title: 'General Description', items: [] },
        { id: 'fuel-systems', title: 'Fuel Systems', items: [] },
      ],
    };

    const result = ensureTechnicalFile(unorderedFile);

    // Sections should be in the correct order
    expect(result.sections[0].id).toBe('general-description');
    expect(result.sections[result.sections.length - 1].id).toBe('conformity-assessment');

    // Verify full order
    for (let i = 0; i < TECHNICAL_FILE_SECTION_IDS.length; i++) {
      expect(result.sections[i].id).toBe(TECHNICAL_FILE_SECTION_IDS[i]);
    }
  });
});

// ============================================
// PROJECT CREATION TESTS
// ============================================

describe('TechnicalFile - Project Creation', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();

    // Create a test client
    const { getAdapter } = await import('@/data/persistence');
    await getAdapter().save('clients', {
      id: 'test-client',
      name: 'Test Client',
      type: 'INDIVIDUAL',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    });
  });

  test('should initialize technicalFile on project creation', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        type: 'NEW_BUILD',
        clientId: 'test-client',
      },
      'test-user'
    );

    expect(project.technicalFile).toBeDefined();
    expect(project.technicalFile?.sections.length).toBe(10);
  });

  test('should create all 10 sections on new project', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Another Project',
        type: 'NEW_BUILD',
        clientId: 'test-client',
      },
      'test-user'
    );

    const sectionIds = project.technicalFile?.sections.map((s) => s.id) || [];

    for (const expectedId of TECHNICAL_FILE_SECTION_IDS) {
      expect(sectionIds).toContain(expectedId);
    }
  });

  test('should create sections with empty items array', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Empty Items Project',
        type: 'NEW_BUILD',
        clientId: 'test-client',
      },
      'test-user'
    );

    for (const section of project.technicalFile?.sections || []) {
      expect(section.items.length).toBe(0);
    }
  });
});

// ============================================
// IMPORT/EXPORT ROUNDTRIP TESTS
// ============================================

describe('TechnicalFile - ZIP Export/Import Roundtrip', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();

    // Create a test client
    const { getAdapter } = await import('@/data/persistence');
    await getAdapter().save('clients', {
      id: 'roundtrip-client',
      name: 'Roundtrip Client',
      type: 'INDIVIDUAL',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    });
  });

  test('should preserve technicalFile structure through export/import', async () => {
    const { getAdapter } = await import('@/data/persistence');

    // Create a project with technicalFile containing items
    const projectWithItems: Project = {
      id: 'project-with-items',
      projectNumber: 'PRJ-2025-0001',
      title: 'Project With Technical File Items',
      type: 'NEW_BUILD',
      status: 'DRAFT',
      clientId: 'roundtrip-client',
      configuration: createTestConfiguration(),
      configurationSnapshots: [],
      quotes: [],
      bomSnapshots: [],
      documents: [],
      amendments: [],
      tasks: [],
      technicalFile: {
        sections: TECHNICAL_FILE_SECTION_IDS.map((id, index) => ({
          id,
          title: TECHNICAL_FILE_SECTION_TITLES[id],
          items:
            index === 0
              ? [
                  { kind: 'attachmentRef' as const, attachmentId: 'att-general-001', note: 'General specs' },
                  { kind: 'attachmentRef' as const, attachmentId: 'att-general-002' },
                ]
              : index === 1
              ? [{ kind: 'attachmentRef' as const, attachmentId: 'att-drawings-001', note: 'Hull drawings' }]
              : [],
        })),
      },
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await getAdapter().save('projects', projectWithItems);

    // Export the project
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
    if (!importResult.ok) return;

    // Verify the imported project
    const importedProject = await ProjectRepository.getById('project-with-items');
    expect(importedProject).toBeDefined();
    expect(importedProject?.technicalFile).toBeDefined();
    expect(importedProject?.technicalFile?.sections.length).toBe(10);

    // Verify items were preserved
    const generalSection = importedProject?.technicalFile?.sections.find(
      (s) => s.id === 'general-description'
    );
    expect(generalSection?.items.length).toBe(2);
    expect(generalSection?.items[0].attachmentId).toBe('att-general-001');
    expect(generalSection?.items[0].note).toBe('General specs');

    const drawingsSection = importedProject?.technicalFile?.sections.find(
      (s) => s.id === 'design-drawings'
    );
    expect(drawingsSection?.items.length).toBe(1);
    expect(drawingsSection?.items[0].attachmentId).toBe('att-drawings-001');
  });

  test('should initialize technicalFile for imported project without it (backward compat)', async () => {
    const { getAdapter } = await import('@/data/persistence');

    // Simulate an old project without technicalFile
    const legacyProject = {
      id: 'legacy-project',
      projectNumber: 'PRJ-2024-9999',
      title: 'Legacy Project Without Technical File',
      type: 'NEW_BUILD',
      status: 'DRAFT',
      clientId: 'roundtrip-client',
      configuration: createTestConfiguration(),
      configurationSnapshots: [],
      quotes: [],
      bomSnapshots: [],
      documents: [],
      amendments: [],
      tasks: [],
      // NO technicalFile field
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
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
          id: 'roundtrip-client',
          name: 'Roundtrip Client',
          type: 'INDIVIDUAL',
          createdAt: now(),
          updatedAt: now(),
          version: 0,
        },
      ],
    };

    // Import the legacy project
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

    // Verify the imported project has technicalFile initialized
    const importedProject = await ProjectRepository.getById('legacy-project');
    expect(importedProject).toBeDefined();
    expect(importedProject?.technicalFile).toBeDefined();
    expect(importedProject?.technicalFile?.sections.length).toBe(10);

    // Verify all sections are present
    for (const sectionId of TECHNICAL_FILE_SECTION_IDS) {
      const section = importedProject?.technicalFile?.sections.find((s) => s.id === sectionId);
      expect(section).toBeDefined();
      expect(section?.items.length).toBe(0);
    }
  });
});

// ============================================
// ITEM STRUCTURE TESTS
// ============================================

describe('TechnicalFile - Item Structure', () => {
  test('should support attachmentRef items with note', () => {
    const technicalFile: TechnicalFile = {
      sections: [
        {
          id: 'general-description',
          title: 'General Description',
          items: [
            { kind: 'attachmentRef', attachmentId: 'att-001', note: 'Boat specifications PDF' },
          ],
        },
      ],
    };

    expect(technicalFile.sections[0].items[0].kind).toBe('attachmentRef');
    expect(technicalFile.sections[0].items[0].attachmentId).toBe('att-001');
    expect(technicalFile.sections[0].items[0].note).toBe('Boat specifications PDF');
  });

  test('should support attachmentRef items without note', () => {
    const technicalFile: TechnicalFile = {
      sections: [
        {
          id: 'design-drawings',
          title: 'Design Drawings & Plans',
          items: [{ kind: 'attachmentRef', attachmentId: 'att-002' }],
        },
      ],
    };

    expect(technicalFile.sections[0].items[0].kind).toBe('attachmentRef');
    expect(technicalFile.sections[0].items[0].attachmentId).toBe('att-002');
    expect(technicalFile.sections[0].items[0].note).toBeUndefined();
  });
});

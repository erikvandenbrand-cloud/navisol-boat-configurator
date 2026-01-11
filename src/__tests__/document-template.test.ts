/**
 * Document Template Tests
 * Tests for CE Document Templates: structure, factory functions, project creation, ZIP roundtrip
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import {
  CE_DOCUMENT_TEMPLATE_TYPES,
  CE_DOCUMENT_TEMPLATE_LABELS,
  createDocumentTemplate,
  createAllDocumentTemplates,
  createTemplateVersion,
  ensureDocumentTemplates,
  isTemplateVersionEditable,
  hasApprovedVersion,
  getDraftVersion,
  getApprovedVersion,
  type ProjectDocumentTemplate,
  type ProjectDocumentTemplateVersion,
  type CEDocumentTemplateType,
} from '@/domain/models/document-template';
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
// TEMPLATE TYPE TESTS
// ============================================

describe('DocumentTemplate - Template Types', () => {
  test('should have exactly 4 template types', () => {
    expect(CE_DOCUMENT_TEMPLATE_TYPES.length).toBe(4);
  });

  test('should have correct template type IDs', () => {
    expect(CE_DOCUMENT_TEMPLATE_TYPES).toContain('DOC_DOC');
    expect(CE_DOCUMENT_TEMPLATE_TYPES).toContain('DOC_OWNERS_MANUAL');
    expect(CE_DOCUMENT_TEMPLATE_TYPES).toContain('DOC_CE_MARKING_CERT');
    expect(CE_DOCUMENT_TEMPLATE_TYPES).toContain('DOC_ANNEX_INDEX');
  });

  test('should have labels for all template types', () => {
    for (const type of CE_DOCUMENT_TEMPLATE_TYPES) {
      expect(CE_DOCUMENT_TEMPLATE_LABELS[type]).toBeDefined();
      expect(typeof CE_DOCUMENT_TEMPLATE_LABELS[type]).toBe('string');
      expect(CE_DOCUMENT_TEMPLATE_LABELS[type].length).toBeGreaterThan(0);
    }
  });

  test('should have correct template labels', () => {
    expect(CE_DOCUMENT_TEMPLATE_LABELS.DOC_DOC).toBe('Declaration of Conformity');
    expect(CE_DOCUMENT_TEMPLATE_LABELS.DOC_OWNERS_MANUAL).toBe("Owner's Manual");
    expect(CE_DOCUMENT_TEMPLATE_LABELS.DOC_CE_MARKING_CERT).toBe('CE Marking Certificate');
    expect(CE_DOCUMENT_TEMPLATE_LABELS.DOC_ANNEX_INDEX).toBe('Annex Index');
  });
});

// ============================================
// FACTORY FUNCTION TESTS
// ============================================

describe('DocumentTemplate - createTemplateVersion', () => {
  test('should create a DRAFT version', () => {
    const version = createTemplateVersion('template-001', 'DOC_DOC', 'user-001');

    expect(version.id).toBeDefined();
    expect(version.templateId).toBe('template-001');
    expect(version.versionNumber).toBe(1);
    expect(version.status).toBe('DRAFT');
    expect(version.createdBy).toBe('user-001');
  });

  test('should include default content with placeholders', () => {
    const version = createTemplateVersion('template-001', 'DOC_DOC', 'user-001');

    expect(version.content).toContain('{{MANUFACTURER_NAME}}');
    expect(version.content).toContain('{{BOAT_MODEL}}');
    expect(version.content).toContain('{{CIN}}');
  });

  test('should include image slots for DOC_DOC', () => {
    const version = createTemplateVersion('template-001', 'DOC_DOC', 'user-001');

    expect(version.imageSlots.length).toBeGreaterThan(0);
    expect(version.imageSlots.some((s) => s.key === 'manufacturer_logo')).toBe(true);
    expect(version.imageSlots.some((s) => s.key === 'builders_plate')).toBe(true);
  });

  test('should include required fields', () => {
    const version = createTemplateVersion('template-001', 'DOC_DOC', 'user-001');

    expect(version.requiredFields).toContain('MANUFACTURER_NAME');
    expect(version.requiredFields).toContain('BOAT_MODEL');
    expect(version.requiredFields).toContain('CIN');
  });

  test('should create version with custom version number', () => {
    const version = createTemplateVersion('template-001', 'DOC_DOC', 'user-001', 3);

    expect(version.versionNumber).toBe(3);
  });
});

describe('DocumentTemplate - createDocumentTemplate', () => {
  test('should create a template with initial DRAFT version', () => {
    const template = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');

    expect(template.id).toBeDefined();
    expect(template.projectId).toBe('project-001');
    expect(template.type).toBe('DOC_DOC');
    expect(template.name).toBe('Declaration of Conformity');
    expect(template.versions.length).toBe(1);
    expect(template.versions[0].status).toBe('DRAFT');
  });

  test('should create template for each type with correct name', () => {
    for (const type of CE_DOCUMENT_TEMPLATE_TYPES) {
      const template = createDocumentTemplate('project-001', type, 'user-001');
      expect(template.name).toBe(CE_DOCUMENT_TEMPLATE_LABELS[type]);
    }
  });
});

describe('DocumentTemplate - createAllDocumentTemplates', () => {
  test('should create all 4 templates', () => {
    const templates = createAllDocumentTemplates('project-001', 'user-001');

    expect(templates.length).toBe(4);
  });

  test('should create templates for each type', () => {
    const templates = createAllDocumentTemplates('project-001', 'user-001');
    const types = templates.map((t) => t.type);

    expect(types).toContain('DOC_DOC');
    expect(types).toContain('DOC_OWNERS_MANUAL');
    expect(types).toContain('DOC_CE_MARKING_CERT');
    expect(types).toContain('DOC_ANNEX_INDEX');
  });

  test('should set correct projectId on all templates', () => {
    const templates = createAllDocumentTemplates('project-xyz', 'user-001');

    for (const template of templates) {
      expect(template.projectId).toBe('project-xyz');
    }
  });

  test('should create each template with a DRAFT version', () => {
    const templates = createAllDocumentTemplates('project-001', 'user-001');

    for (const template of templates) {
      expect(template.versions.length).toBe(1);
      expect(template.versions[0].status).toBe('DRAFT');
    }
  });
});

// ============================================
// ENSURE DOCUMENT TEMPLATES TESTS
// ============================================

describe('DocumentTemplate - ensureDocumentTemplates', () => {
  test('should create templates for NEW_BUILD when undefined', () => {
    const result = ensureDocumentTemplates('NEW_BUILD', 'project-001', undefined, 'user-001');

    expect(result.length).toBe(4);
  });

  test('should create templates for NEW_BUILD when empty array', () => {
    const result = ensureDocumentTemplates('NEW_BUILD', 'project-001', [], 'user-001');

    expect(result.length).toBe(4);
  });

  test('should return empty array for REFIT when undefined', () => {
    const result = ensureDocumentTemplates('REFIT', 'project-001', undefined, 'user-001');

    expect(result.length).toBe(0);
  });

  test('should return empty array for MAINTENANCE when undefined', () => {
    const result = ensureDocumentTemplates('MAINTENANCE', 'project-001', undefined, 'user-001');

    expect(result.length).toBe(0);
  });

  test('should preserve existing templates for REFIT', () => {
    const existingTemplate = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    const result = ensureDocumentTemplates('REFIT', 'project-001', [existingTemplate], 'user-001');

    expect(result.length).toBe(1);
    expect(result[0].type).toBe('DOC_DOC');
  });

  test('should add missing templates for NEW_BUILD', () => {
    const existingTemplate = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    const result = ensureDocumentTemplates('NEW_BUILD', 'project-001', [existingTemplate], 'user-001');

    expect(result.length).toBe(4);
    const types = result.map((t) => t.type);
    expect(types).toContain('DOC_DOC');
    expect(types).toContain('DOC_OWNERS_MANUAL');
    expect(types).toContain('DOC_CE_MARKING_CERT');
    expect(types).toContain('DOC_ANNEX_INDEX');
  });

  test('should preserve existing template content when adding missing templates', () => {
    const existingTemplate = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    existingTemplate.versions[0].content = 'Custom content';

    const result = ensureDocumentTemplates('NEW_BUILD', 'project-001', [existingTemplate], 'user-001');

    const docTemplate = result.find((t) => t.type === 'DOC_DOC');
    expect(docTemplate?.versions[0].content).toBe('Custom content');
  });
});

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe('DocumentTemplate - isTemplateVersionEditable', () => {
  test('should return true for DRAFT version', () => {
    const version = createTemplateVersion('template-001', 'DOC_DOC', 'user-001');
    expect(isTemplateVersionEditable(version)).toBe(true);
  });

  test('should return false for APPROVED version', () => {
    const version = createTemplateVersion('template-001', 'DOC_DOC', 'user-001');
    version.status = 'APPROVED';
    expect(isTemplateVersionEditable(version)).toBe(false);
  });
});

describe('DocumentTemplate - hasApprovedVersion', () => {
  test('should return false when no approved version', () => {
    const template = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    expect(hasApprovedVersion(template)).toBe(false);
  });

  test('should return true when has approved version', () => {
    const template = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    template.versions[0].status = 'APPROVED';
    expect(hasApprovedVersion(template)).toBe(true);
  });
});

describe('DocumentTemplate - getDraftVersion', () => {
  test('should return draft version when exists', () => {
    const template = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    const draft = getDraftVersion(template);

    expect(draft).toBeDefined();
    expect(draft?.status).toBe('DRAFT');
  });

  test('should return undefined when no draft version', () => {
    const template = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    template.versions[0].status = 'APPROVED';

    const draft = getDraftVersion(template);
    expect(draft).toBeUndefined();
  });
});

describe('DocumentTemplate - getApprovedVersion', () => {
  test('should return undefined when no approved version', () => {
    const template = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    expect(getApprovedVersion(template)).toBeUndefined();
  });

  test('should return approved version when exists', () => {
    const template = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    template.versions[0].status = 'APPROVED';
    template.currentVersionId = template.versions[0].id;

    const approved = getApprovedVersion(template);
    expect(approved).toBeDefined();
    expect(approved?.status).toBe('APPROVED');
  });

  test('should return version matching currentVersionId', () => {
    const template = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    const version1 = template.versions[0];
    version1.status = 'APPROVED';

    // Add a second version
    const version2 = createTemplateVersion(template.id, 'DOC_DOC', 'user-001', 2);
    version2.status = 'APPROVED';
    template.versions.push(version2);
    template.currentVersionId = version2.id;

    const approved = getApprovedVersion(template);
    expect(approved?.id).toBe(version2.id);
  });
});

// ============================================
// PROJECT CREATION TESTS
// ============================================

describe('DocumentTemplate - Project Creation', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('should initialize documentTemplates for NEW_BUILD project', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test New Build',
        type: 'NEW_BUILD',
        clientId: 'test-client',
      },
      'test-user'
    );

    expect(project.documentTemplates).toBeDefined();
    expect(project.documentTemplates?.length).toBe(4);
  });

  test('should create all 4 template types for NEW_BUILD', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test New Build',
        type: 'NEW_BUILD',
        clientId: 'test-client',
      },
      'test-user'
    );

    const types = project.documentTemplates?.map((t) => t.type) || [];
    expect(types).toContain('DOC_DOC');
    expect(types).toContain('DOC_OWNERS_MANUAL');
    expect(types).toContain('DOC_CE_MARKING_CERT');
    expect(types).toContain('DOC_ANNEX_INDEX');
  });

  test('should NOT initialize documentTemplates for REFIT project', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Refit',
        type: 'REFIT',
        clientId: 'test-client',
      },
      'test-user'
    );

    expect(project.documentTemplates).toBeUndefined();
  });

  test('should NOT initialize documentTemplates for MAINTENANCE project', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Maintenance',
        type: 'MAINTENANCE',
        clientId: 'test-client',
      },
      'test-user'
    );

    expect(project.documentTemplates).toBeUndefined();
  });

  test('should create templates with correct projectId', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test New Build',
        type: 'NEW_BUILD',
        clientId: 'test-client',
      },
      'test-user'
    );

    for (const template of project.documentTemplates || []) {
      expect(template.projectId).toBe(project.id);
    }
  });

  test('should create templates with DRAFT versions', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test New Build',
        type: 'NEW_BUILD',
        clientId: 'test-client',
      },
      'test-user'
    );

    for (const template of project.documentTemplates || []) {
      expect(template.versions.length).toBe(1);
      expect(template.versions[0].status).toBe('DRAFT');
    }
  });

  test('should create templates with default content containing placeholders', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test New Build',
        type: 'NEW_BUILD',
        clientId: 'test-client',
      },
      'test-user'
    );

    const docTemplate = project.documentTemplates?.find((t) => t.type === 'DOC_DOC');
    expect(docTemplate?.versions[0].content).toContain('{{');
  });
});

// ============================================
// ZIP EXPORT/IMPORT ROUNDTRIP TESTS
// ============================================

describe('DocumentTemplate - ZIP Export/Import Roundtrip', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('should preserve documentTemplates through export/import', async () => {
    // Create a NEW_BUILD project with templates
    const project = await ProjectRepository.create(
      {
        title: 'Project With Templates',
        type: 'NEW_BUILD',
        clientId: 'test-client',
      },
      'test-user'
    );

    // Modify a template content
    if (project.documentTemplates) {
      project.documentTemplates[0].versions[0].content = 'Modified template content';
      const { getAdapter } = await import('@/data/persistence');
      await getAdapter().save('projects', project);
    }

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
    const importedProject = await ProjectRepository.getById(project.id);
    expect(importedProject).toBeDefined();
    expect(importedProject?.documentTemplates).toBeDefined();
    expect(importedProject?.documentTemplates?.length).toBe(4);

    // Verify modified content was preserved
    const docTemplate = importedProject?.documentTemplates?.find((t) => t.type === 'DOC_DOC');
    expect(docTemplate?.versions[0].content).toBe('Modified template content');
  });

  test('should initialize documentTemplates for imported NEW_BUILD project without templates (backward compat)', async () => {
    const { getAdapter } = await import('@/data/persistence');

    // Simulate an old NEW_BUILD project without documentTemplates
    const legacyProject = {
      id: 'legacy-new-build',
      projectNumber: 'PRJ-2024-9999',
      title: 'Legacy New Build Without Templates',
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
      // NO documentTemplates field
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
          id: 'test-client',
          name: 'Test Client',
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

    // Verify the imported project has documentTemplates initialized
    const importedProject = await ProjectRepository.getById('legacy-new-build');
    expect(importedProject).toBeDefined();
    expect(importedProject?.documentTemplates).toBeDefined();
    expect(importedProject?.documentTemplates?.length).toBe(4);

    // Verify all template types are present
    const types = importedProject?.documentTemplates?.map((t) => t.type) || [];
    expect(types).toContain('DOC_DOC');
    expect(types).toContain('DOC_OWNERS_MANUAL');
    expect(types).toContain('DOC_CE_MARKING_CERT');
    expect(types).toContain('DOC_ANNEX_INDEX');
  });

  test('should NOT initialize documentTemplates for imported REFIT project without templates', async () => {
    // Simulate an old REFIT project without documentTemplates
    const legacyRefitProject = {
      id: 'legacy-refit',
      projectNumber: 'PRJ-2024-8888',
      title: 'Legacy Refit Without Templates',
      type: 'REFIT',
      status: 'DRAFT',
      clientId: 'test-client',
      configuration: createTestConfiguration(),
      configurationSnapshots: [],
      quotes: [],
      bomSnapshots: [],
      documents: [],
      amendments: [],
      tasks: [],
      // NO documentTemplates field
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

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
      projects: [legacyRefitProject as unknown as Project],
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

    // Verify the imported REFIT project has empty documentTemplates (or undefined-ish)
    const importedProject = await ProjectRepository.getById('legacy-refit');
    expect(importedProject).toBeDefined();
    // For REFIT, ensureDocumentTemplates returns empty array
    expect(importedProject?.documentTemplates?.length || 0).toBe(0);
  });

  test('should preserve image slots through export/import', async () => {
    const { getAdapter } = await import('@/data/persistence');

    // Create a project with a template that has image data
    const project = await ProjectRepository.create(
      {
        title: 'Project With Image Slots',
        type: 'NEW_BUILD',
        clientId: 'test-client',
      },
      'test-user'
    );

    // Add image data to a slot
    if (project.documentTemplates) {
      const docTemplate = project.documentTemplates.find((t) => t.type === 'DOC_DOC');
      if (docTemplate && docTemplate.versions[0].imageSlots.length > 0) {
        docTemplate.versions[0].imageSlots[0].dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS';
        await getAdapter().save('projects', project);
      }
    }

    // Export and import
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

    await clearProjects();

    await ExportImportService.importData(
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

    // Verify image data was preserved
    const importedProject = await ProjectRepository.getById(project.id);
    const docTemplate = importedProject?.documentTemplates?.find((t) => t.type === 'DOC_DOC');
    expect(docTemplate?.versions[0].imageSlots[0].dataUrl).toBe(
      'data:image/png;base64,iVBORw0KGgoAAAANS'
    );
  });
});

// ============================================
// CONTENT PLACEHOLDER TESTS
// ============================================

describe('DocumentTemplate - Content Placeholders', () => {
  test('DOC_DOC should contain text placeholders', () => {
    const version = createTemplateVersion('t1', 'DOC_DOC', 'user');

    expect(version.content).toContain('{{MANUFACTURER_NAME}}');
    expect(version.content).toContain('{{MANUFACTURER_ADDRESS}}');
    expect(version.content).toContain('{{BOAT_MODEL}}');
    expect(version.content).toContain('{{CIN}}');
    expect(version.content).toContain('{{DESIGN_CATEGORY}}');
  });

  test('DOC_DOC should contain image placeholders', () => {
    const version = createTemplateVersion('t1', 'DOC_DOC', 'user');

    expect(version.content).toContain('{{IMAGE:manufacturer_logo}}');
    expect(version.content).toContain('{{IMAGE:builders_plate}}');
  });

  test('DOC_DOC should contain [FIXED] IMCI-required sentences', () => {
    const version = createTemplateVersion('t1', 'DOC_DOC', 'user');

    expect(version.content).toContain('[FIXED]');
    expect(version.content).toContain('This declaration of conformity is issued under the sole responsibility of the manufacturer');
    expect(version.content).toContain('in conformity with the relevant Union harmonisation legislation');
  });

  test('DOC_OWNERS_MANUAL should contain relevant placeholders', () => {
    const version = createTemplateVersion('t1', 'DOC_OWNERS_MANUAL', 'user');

    expect(version.content).toContain('{{BOAT_MODEL}}');
    expect(version.content).toContain('{{CIN}}');
    expect(version.content).toContain('{{IMAGE:boat_photo}}');
  });

  test('DOC_OWNERS_MANUAL should contain section headings', () => {
    const version = createTemplateVersion('t1', 'DOC_OWNERS_MANUAL', 'user');

    expect(version.content).toContain('## 1. INTRODUCTION');
    expect(version.content).toContain('## 2. VESSEL IDENTIFICATION');
    expect(version.content).toContain('## 3. TECHNICAL SPECIFICATIONS');
    expect(version.content).toContain('## 4. GENERAL ARRANGEMENT');
    expect(version.content).toContain('## 5. SAFETY EQUIPMENT');
    expect(version.content).toContain('## 6. PROPULSION SYSTEM');
    expect(version.content).toContain('## 7. ELECTRICAL SYSTEM');
  });

  test('DOC_OWNERS_MANUAL should contain new image slots', () => {
    const version = createTemplateVersion('t1', 'DOC_OWNERS_MANUAL', 'user');

    expect(version.imageSlots.some((s) => s.key === 'builders_plate')).toBe(true);
    expect(version.imageSlots.some((s) => s.key === 'general_arrangement')).toBe(true);
    expect(version.imageSlots.some((s) => s.key === 'electrical_schematic')).toBe(true);
  });

  test('DOC_CE_MARKING_CERT should contain CE-specific placeholders', () => {
    const version = createTemplateVersion('t1', 'DOC_CE_MARKING_CERT', 'user');

    expect(version.content).toContain('{{CERTIFICATE_NUMBER}}');
    expect(version.content).toContain('{{NOTIFIED_BODY_NAME}}');
    expect(version.content).toContain('{{IMAGE:ce_mark}}');
    expect(version.content).toContain('{{CIN}}');
  });

  test('DOC_CE_MARKING_CERT should contain [FIXED] sentence', () => {
    const version = createTemplateVersion('t1', 'DOC_CE_MARKING_CERT', 'user');

    expect(version.content).toContain('[FIXED]');
    expect(version.content).toContain('has been assessed and found to comply with');
  });

  test('DOC_ANNEX_INDEX should contain project and document placeholders', () => {
    const version = createTemplateVersion('t1', 'DOC_ANNEX_INDEX', 'user');

    expect(version.content).toContain('{{PROJECT_TITLE}}');
    expect(version.content).toContain('{{PROJECT_NUMBER}}');
    expect(version.content).toContain('{{BOAT_MODEL}}');
    expect(version.content).toContain('{{CIN}}');
  });

  test('DOC_ANNEX_INDEX should contain image slots', () => {
    const version = createTemplateVersion('t1', 'DOC_ANNEX_INDEX', 'user');

    expect(version.imageSlots.some((s) => s.key === 'general_arrangement')).toBe(true);
    expect(version.imageSlots.some((s) => s.key === 'electrical_schematic')).toBe(true);
  });

  test('DOC_ANNEX_INDEX should contain 12 sections', () => {
    const version = createTemplateVersion('t1', 'DOC_ANNEX_INDEX', 'user');

    expect(version.content).toContain('## Section 1:');
    expect(version.content).toContain('## Section 12:');
  });
});

// ============================================
// VERSION IMMUTABILITY TESTS
// ============================================

describe('DocumentTemplate - Version Immutability', () => {
  test('DRAFT version should be editable', () => {
    const template = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    const draftVersion = template.versions[0];

    expect(draftVersion.status).toBe('DRAFT');
    expect(isTemplateVersionEditable(draftVersion)).toBe(true);
  });

  test('APPROVED version should NOT be editable', () => {
    const template = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');
    template.versions[0].status = 'APPROVED';
    template.versions[0].approvedAt = now();
    template.versions[0].approvedBy = 'approver-001';

    expect(isTemplateVersionEditable(template.versions[0])).toBe(false);
  });

  test('should be able to create new version after approval', () => {
    const template = createDocumentTemplate('project-001', 'DOC_DOC', 'user-001');

    // Approve first version
    template.versions[0].status = 'APPROVED';
    template.currentVersionId = template.versions[0].id;

    // Create new draft version
    const newVersion = createTemplateVersion(template.id, 'DOC_DOC', 'user-001', 2);
    template.versions.push(newVersion);

    expect(template.versions.length).toBe(2);
    expect(getDraftVersion(template)?.versionNumber).toBe(2);
    expect(getApprovedVersion(template)?.versionNumber).toBe(1);
  });
});

/**
 * Owner's Manual AI-Assisted Banner Tests
 * Tests for the AI-assisted draft text banner:
 * - Banner shows for Owner's Manual DRAFT seeded content
 * - Banner NOT shown for DoC/CE Marking Cert/Annex Index
 * - Banner NOT shown when APPROVED/readOnly
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import {
  createOwnerManualTemplateVersion,
  createTemplateVersion,
  createDocumentTemplate,
  createOwnerManualTemplate,
  migrateOwnerManualToBlocks,
  getDraftVersion,
  type ProjectDocumentTemplate,
  type ProjectDocumentTemplateVersion,
} from '@/domain/models/document-template';
import { ProjectRepository } from '@/data/repositories';
import type { Project } from '@/domain/models';
import { now } from '@/domain/models';

// ============================================
// TEST HELPERS
// ============================================

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
// AI-ASSISTED FLAG ON OWNER'S MANUAL SEEDED VERSIONS
// ============================================

describe('Owner\'s Manual AI-Assisted Banner - Model', () => {
  test('createOwnerManualTemplateVersion sets aiAssisted=true for seeded content', () => {
    const version = createOwnerManualTemplateVersion(
      'template-123',
      'test-user',
      undefined, // no project systems
      1
    );

    expect(version.aiAssisted).toBe(true);
    expect(version.status).toBe('DRAFT');
    expect(version.ownerManualBlocks).toBeDefined();
    expect(version.ownerManualBlocks!.length).toBeGreaterThan(0);
  });

  test('createOwnerManualTemplate creates template with aiAssisted DRAFT version', () => {
    const template = createOwnerManualTemplate(
      'project-123',
      'test-user',
      undefined
    );

    expect(template.type).toBe('DOC_OWNERS_MANUAL');
    expect(template.versions.length).toBe(1);

    const draft = getDraftVersion(template);
    expect(draft).toBeDefined();
    expect(draft?.aiAssisted).toBe(true);
    expect(draft?.status).toBe('DRAFT');
  });

  test('migrateOwnerManualToBlocks sets aiAssisted=false for migrated content', () => {
    const legacyContent = '# My Legacy Owner\'s Manual\n\nThis is legacy content.';
    const legacyImageSlots = [
      { key: 'boat_photo', label: 'Boat Photo' },
    ];

    const result = migrateOwnerManualToBlocks(legacyContent, legacyImageSlots, undefined);

    expect(result.aiAssisted).toBe(false);
    expect(result.blocks.length).toBeGreaterThan(0);

    // Should have the legacy_content block
    const legacyBlock = result.blocks.find((b) => b.subchapterId === 'legacy_content');
    expect(legacyBlock).toBeDefined();
    expect(legacyBlock?.content).toBe(legacyContent);
  });

  test('DoC template version does NOT have aiAssisted field set to true', () => {
    const version = createTemplateVersion(
      'template-123',
      'DOC_DOC',
      'test-user',
      1
    );

    // aiAssisted should be undefined or false for non-Owner's Manual templates
    expect(version.aiAssisted).toBeUndefined();
    expect(version.status).toBe('DRAFT');
  });

  test('CE Marking Cert template version does NOT have aiAssisted', () => {
    const version = createTemplateVersion(
      'template-123',
      'DOC_CE_MARKING_CERT',
      'test-user',
      1
    );

    expect(version.aiAssisted).toBeUndefined();
  });

  test('Annex Index template version does NOT have aiAssisted', () => {
    const version = createTemplateVersion(
      'template-123',
      'DOC_ANNEX_INDEX',
      'test-user',
      1
    );

    expect(version.aiAssisted).toBeUndefined();
  });
});

// ============================================
// NEW_BUILD PROJECT CREATES AI-ASSISTED OWNER'S MANUAL
// ============================================

describe('Owner\'s Manual AI-Assisted Banner - Project Creation', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('NEW_BUILD project creates Owner\'s Manual with aiAssisted=true', async () => {
    const project = await ProjectRepository.create({
      title: 'New Boat',
      clientId: 'test-client',
      type: 'NEW_BUILD',
    }, 'test-user');

    expect(project.documentTemplates).toBeDefined();
    expect(project.documentTemplates!.length).toBe(4);

    const ownerManual = project.documentTemplates!.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    expect(ownerManual).toBeDefined();

    const draft = getDraftVersion(ownerManual!);
    expect(draft).toBeDefined();
    expect(draft?.aiAssisted).toBe(true);
    expect(draft?.status).toBe('DRAFT');
  });

  test('NEW_BUILD project other templates do NOT have aiAssisted', async () => {
    const project = await ProjectRepository.create({
      title: 'New Boat',
      clientId: 'test-client',
      type: 'NEW_BUILD',
    }, 'test-user');

    const docDoc = project.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    const ceCert = project.documentTemplates!.find((t) => t.type === 'DOC_CE_MARKING_CERT');
    const annexIndex = project.documentTemplates!.find((t) => t.type === 'DOC_ANNEX_INDEX');

    expect(getDraftVersion(docDoc!)?.aiAssisted).toBeUndefined();
    expect(getDraftVersion(ceCert!)?.aiAssisted).toBeUndefined();
    expect(getDraftVersion(annexIndex!)?.aiAssisted).toBeUndefined();
  });
});

// ============================================
// BANNER DISPLAY LOGIC (UNIT TESTS)
// ============================================

describe('Owner\'s Manual AI-Assisted Banner - Display Logic', () => {
  test('banner should show when aiAssisted=true and readOnly=false', () => {
    // This tests the condition: !readOnly && aiAssisted
    const readOnly = false;
    const aiAssisted = true;
    const shouldShowBanner = !readOnly && aiAssisted;
    expect(shouldShowBanner).toBe(true);
  });

  test('banner should NOT show when aiAssisted=true and readOnly=true', () => {
    const readOnly = true;
    const aiAssisted = true;
    const shouldShowBanner = !readOnly && aiAssisted;
    expect(shouldShowBanner).toBe(false);
  });

  test('banner should NOT show when aiAssisted=false and readOnly=false', () => {
    const readOnly = false;
    const aiAssisted = false;
    const shouldShowBanner = !readOnly && aiAssisted;
    expect(shouldShowBanner).toBe(false);
  });

  test('banner should NOT show when aiAssisted=undefined and readOnly=false', () => {
    const readOnly = false;
    const aiAssisted = undefined;
    const shouldShowBanner = !readOnly && aiAssisted;
    // undefined is falsy, so the banner should not show
    expect(shouldShowBanner).toBeFalsy();
  });

  test('APPROVED version should have readOnly=true (banner hidden)', () => {
    // When a version is APPROVED, the editor is read-only
    // This means the banner should not show
    const version: Partial<ProjectDocumentTemplateVersion> = {
      status: 'APPROVED',
      aiAssisted: true,
    };

    const isEditable = version.status === 'DRAFT';
    const readOnly = !isEditable;
    const shouldShowBanner = !readOnly && version.aiAssisted;

    expect(readOnly).toBe(true);
    expect(shouldShowBanner).toBe(false);
  });

  test('DRAFT version with aiAssisted=true should show banner (readOnly=false)', () => {
    const version: Partial<ProjectDocumentTemplateVersion> = {
      status: 'DRAFT',
      aiAssisted: true,
    };

    const isEditable = version.status === 'DRAFT';
    const readOnly = !isEditable;
    const shouldShowBanner = !readOnly && version.aiAssisted;

    expect(readOnly).toBe(false);
    expect(shouldShowBanner).toBe(true);
  });
});

// ============================================
// ZIP ROUNDTRIP PRESERVES AI-ASSISTED FLAG
// ============================================

describe('Owner\'s Manual AI-Assisted Banner - ZIP Roundtrip', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('ZIP export/import preserves aiAssisted flag on Owner\'s Manual', async () => {
    const { ExportImportService } = await import('@/domain/services/ExportImportService');

    // Create project with aiAssisted Owner's Manual
    const project = await ProjectRepository.create({
      title: 'Boat With AI Manual',
      clientId: 'test-client',
      type: 'NEW_BUILD',
    }, 'test-user');

    const ownerManual = project.documentTemplates!.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    expect(getDraftVersion(ownerManual!)?.aiAssisted).toBe(true);

    // Export
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

    // Verify aiAssisted preserved
    const importedProject = await ProjectRepository.getById(project.id);
    expect(importedProject).toBeDefined();

    const importedOwnerManual = importedProject!.documentTemplates!.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    expect(importedOwnerManual).toBeDefined();
    expect(getDraftVersion(importedOwnerManual!)?.aiAssisted).toBe(true);
  });
});

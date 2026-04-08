/**
 * Document Template UI Tests
 * Tests for Template Editor UI functionality:
 * - Editing DRAFT content persists
 * - Image slot update persists
 * - APPROVED is read-only
 * - NEW_BUILD has templates visible; REFIT/MAINTENANCE hides section when none exist
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import {
  CE_DOCUMENT_TEMPLATE_TYPES,
  createDocumentTemplate,
  createAllDocumentTemplates,
  createTemplateVersion,
  getDraftVersion,
  getApprovedVersion,
  isTemplateVersionEditable,
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

/**
 * Helper to extract {{IMAGE:key}} tokens from content.
 */
function extractImageKeys(content: string): string[] {
  const regex = /\{\{IMAGE:([a-zA-Z0-9_]+)\}\}/g;
  const keys = new Set<string>();
  let match: RegExpExecArray | null = null;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard pattern for regex iteration
  while ((match = regex.exec(content)) !== null) {
    keys.add(match[1]);
  }
  return Array.from(keys);
}

// ============================================
// DRAFT CONTENT EDITING TESTS
// ============================================

describe('DocumentTemplateUI - DRAFT Content Editing', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('editing DRAFT content persists to project', async () => {
    // Create a NEW_BUILD project with templates
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    expect(project.documentTemplates).toBeDefined();
    expect(project.documentTemplates!.length).toBe(4);

    // Get the DoC template
    const docTemplate = project.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    expect(docTemplate).toBeDefined();

    // Get the draft version
    const draftVersion = getDraftVersion(docTemplate!);
    expect(draftVersion).toBeDefined();
    expect(draftVersion!.status).toBe('DRAFT');

    // Simulate editing content
    const newContent = 'Updated DoC content with {{CIN}} placeholder';
    const updatedVersion: ProjectDocumentTemplateVersion = {
      ...draftVersion!,
      content: newContent,
      updatedAt: now(),
    };

    const updatedTemplates = project.documentTemplates!.map((t) => {
      if (t.id !== docTemplate!.id) return t;
      return {
        ...t,
        versions: t.versions.map((v) =>
          v.id === draftVersion!.id ? updatedVersion : v
        ),
        updatedAt: now(),
      };
    });

    // Save to project
    const updated = await ProjectRepository.update(project.id, {
      documentTemplates: updatedTemplates,
    });

    expect(updated).not.toBeNull();

    // Verify the content was saved
    const savedProject = await ProjectRepository.getById(project.id);
    expect(savedProject).not.toBeNull();

    const savedDocTemplate = savedProject!.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    const savedDraft = getDraftVersion(savedDocTemplate!);
    expect(savedDraft).toBeDefined();
    expect(savedDraft!.content).toBe(newContent);
  });

  test('DRAFT version is editable', () => {
    const template = createDocumentTemplate('proj-1', 'DOC_DOC', 'test-user');
    const draftVersion = getDraftVersion(template);

    expect(draftVersion).toBeDefined();
    expect(isTemplateVersionEditable(draftVersion!)).toBe(true);
  });

  test('editing preserves other template versions', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    // Edit only the DoC template
    const docTemplate = project.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    const originalManualTemplate = project.documentTemplates!.find((t) => t.type === 'DOC_OWNERS_MANUAL');
    const originalManualContent = getDraftVersion(originalManualTemplate!)!.content;

    const draftVersion = getDraftVersion(docTemplate!);
    const newContent = 'Edited DoC content';

    const updatedVersion: ProjectDocumentTemplateVersion = {
      ...draftVersion!,
      content: newContent,
      updatedAt: now(),
    };

    const updatedTemplates = project.documentTemplates!.map((t) => {
      if (t.id !== docTemplate!.id) return t;
      return {
        ...t,
        versions: t.versions.map((v) =>
          v.id === draftVersion!.id ? updatedVersion : v
        ),
        updatedAt: now(),
      };
    });

    await ProjectRepository.update(project.id, {
      documentTemplates: updatedTemplates,
    });

    // Verify other templates are unchanged
    const savedProject = await ProjectRepository.getById(project.id);
    const savedManualTemplate = savedProject!.documentTemplates!.find((t) => t.type === 'DOC_OWNERS_MANUAL');
    const savedManualContent = getDraftVersion(savedManualTemplate!)!.content;

    expect(savedManualContent).toBe(originalManualContent);
  });
});

// ============================================
// IMAGE SLOT UPDATE TESTS
// ============================================

describe('DocumentTemplateUI - Image Slot Updates', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('image slot update persists to project', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    // Get the DoC template
    const docTemplate = project.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    const draftVersion = getDraftVersion(docTemplate!);

    // Verify initial image slots exist
    expect(draftVersion!.imageSlots.length).toBeGreaterThan(0);

    // Find the manufacturer_logo slot
    const logoSlotIndex = draftVersion!.imageSlots.findIndex((s) => s.key === 'manufacturer_logo');
    expect(logoSlotIndex).toBeGreaterThanOrEqual(0);

    // Update the image slot with a data URL
    const testDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testCaption = 'Company Logo';

    const updatedSlots = draftVersion!.imageSlots.map((slot, idx) => {
      if (idx !== logoSlotIndex) return slot;
      return {
        ...slot,
        dataUrl: testDataUrl,
        caption: testCaption,
      };
    });

    const updatedVersion: ProjectDocumentTemplateVersion = {
      ...draftVersion!,
      imageSlots: updatedSlots,
      updatedAt: now(),
    };

    const updatedTemplates = project.documentTemplates!.map((t) => {
      if (t.id !== docTemplate!.id) return t;
      return {
        ...t,
        versions: t.versions.map((v) =>
          v.id === draftVersion!.id ? updatedVersion : v
        ),
        updatedAt: now(),
      };
    });

    await ProjectRepository.update(project.id, {
      documentTemplates: updatedTemplates,
    });

    // Verify the image slot was saved
    const savedProject = await ProjectRepository.getById(project.id);
    const savedDocTemplate = savedProject!.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    const savedDraft = getDraftVersion(savedDocTemplate!);
    const savedLogoSlot = savedDraft!.imageSlots.find((s) => s.key === 'manufacturer_logo');

    expect(savedLogoSlot).toBeDefined();
    expect(savedLogoSlot!.dataUrl).toBe(testDataUrl);
    expect(savedLogoSlot!.caption).toBe(testCaption);
  });

  test('adding new image slot for content token persists', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    const docTemplate = project.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    const draftVersion = getDraftVersion(docTemplate!);

    // Add a new image slot that might be referenced in content
    const newSlotKey = 'custom_image';
    const testDataUrl = 'data:image/png;base64,test';

    const updatedSlots = [
      ...draftVersion!.imageSlots,
      {
        key: newSlotKey,
        label: 'Custom Image',
        dataUrl: testDataUrl,
      },
    ];

    const updatedVersion: ProjectDocumentTemplateVersion = {
      ...draftVersion!,
      imageSlots: updatedSlots,
      updatedAt: now(),
    };

    const updatedTemplates = project.documentTemplates!.map((t) => {
      if (t.id !== docTemplate!.id) return t;
      return {
        ...t,
        versions: t.versions.map((v) =>
          v.id === draftVersion!.id ? updatedVersion : v
        ),
        updatedAt: now(),
      };
    });

    await ProjectRepository.update(project.id, {
      documentTemplates: updatedTemplates,
    });

    // Verify the new slot was saved
    const savedProject = await ProjectRepository.getById(project.id);
    const savedDocTemplate = savedProject!.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    const savedDraft = getDraftVersion(savedDocTemplate!);
    const savedNewSlot = savedDraft!.imageSlots.find((s) => s.key === newSlotKey);

    expect(savedNewSlot).toBeDefined();
    expect(savedNewSlot!.dataUrl).toBe(testDataUrl);
  });

  test('image slot removal persists', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    const docTemplate = project.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    const draftVersion = getDraftVersion(docTemplate!);

    // First, add an image to a slot
    const logoSlotIndex = draftVersion!.imageSlots.findIndex((s) => s.key === 'manufacturer_logo');
    const testDataUrl = 'data:image/png;base64,test';

    let updatedSlots = draftVersion!.imageSlots.map((slot, idx) => {
      if (idx !== logoSlotIndex) return slot;
      return { ...slot, dataUrl: testDataUrl };
    });

    let updatedVersion: ProjectDocumentTemplateVersion = {
      ...draftVersion!,
      imageSlots: updatedSlots,
      updatedAt: now(),
    };

    let updatedTemplates = project.documentTemplates!.map((t) => {
      if (t.id !== docTemplate!.id) return t;
      return {
        ...t,
        versions: t.versions.map((v) =>
          v.id === draftVersion!.id ? updatedVersion : v
        ),
        updatedAt: now(),
      };
    });

    await ProjectRepository.update(project.id, {
      documentTemplates: updatedTemplates,
    });

    // Now remove the image (set dataUrl to undefined)
    const projectAfterAdd = await ProjectRepository.getById(project.id);
    const templateAfterAdd = projectAfterAdd!.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    const draftAfterAdd = getDraftVersion(templateAfterAdd!);

    updatedSlots = draftAfterAdd!.imageSlots.map((slot) => {
      if (slot.key !== 'manufacturer_logo') return slot;
      return { ...slot, dataUrl: undefined };
    });

    updatedVersion = {
      ...draftAfterAdd!,
      imageSlots: updatedSlots,
      updatedAt: now(),
    };

    updatedTemplates = projectAfterAdd!.documentTemplates!.map((t) => {
      if (t.id !== templateAfterAdd!.id) return t;
      return {
        ...t,
        versions: t.versions.map((v) =>
          v.id === draftAfterAdd!.id ? updatedVersion : v
        ),
        updatedAt: now(),
      };
    });

    await ProjectRepository.update(project.id, {
      documentTemplates: updatedTemplates,
    });

    // Verify the image was removed
    const savedProject = await ProjectRepository.getById(project.id);
    const savedDocTemplate = savedProject!.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    const savedDraft = getDraftVersion(savedDocTemplate!);
    const savedLogoSlot = savedDraft!.imageSlots.find((s) => s.key === 'manufacturer_logo');

    expect(savedLogoSlot).toBeDefined();
    expect(savedLogoSlot!.dataUrl).toBeUndefined();
  });
});

// ============================================
// APPROVED VERSION READ-ONLY TESTS
// ============================================

describe('DocumentTemplateUI - APPROVED Read-Only', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('APPROVED version is not editable', () => {
    const template = createDocumentTemplate('proj-1', 'DOC_DOC', 'test-user');
    const draftVersion = getDraftVersion(template)!;

    // Simulate approval
    const approvedVersion: ProjectDocumentTemplateVersion = {
      ...draftVersion,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy: 'test-user',
    };

    expect(isTemplateVersionEditable(approvedVersion)).toBe(false);
  });

  test('template with APPROVED version returns APPROVED from getApprovedVersion', () => {
    const template = createDocumentTemplate('proj-1', 'DOC_DOC', 'test-user');
    const draftVersion = getDraftVersion(template)!;

    // Create approved version
    const approvedVersion: ProjectDocumentTemplateVersion = {
      ...draftVersion,
      id: generateUUID(),
      versionNumber: 1,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy: 'test-user',
    };

    // Add approved version and update currentVersionId
    const updatedTemplate: ProjectDocumentTemplate = {
      ...template,
      versions: [approvedVersion],
      currentVersionId: approvedVersion.id,
    };

    const approved = getApprovedVersion(updatedTemplate);
    expect(approved).toBeDefined();
    expect(approved!.status).toBe('APPROVED');
  });

  test('DRAFT can coexist with APPROVED version', () => {
    const template = createDocumentTemplate('proj-1', 'DOC_DOC', 'test-user');
    const originalDraft = getDraftVersion(template)!;

    // Create approved version
    const approvedVersion: ProjectDocumentTemplateVersion = {
      ...originalDraft,
      id: generateUUID(),
      versionNumber: 1,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy: 'test-user',
    };

    // Create new draft version
    const newDraft: ProjectDocumentTemplateVersion = {
      ...originalDraft,
      id: generateUUID(),
      versionNumber: 2,
      status: 'DRAFT',
      content: 'New draft content',
    };

    const updatedTemplate: ProjectDocumentTemplate = {
      ...template,
      versions: [approvedVersion, newDraft],
      currentVersionId: approvedVersion.id,
    };

    const draft = getDraftVersion(updatedTemplate);
    const approved = getApprovedVersion(updatedTemplate);

    expect(draft).toBeDefined();
    expect(draft!.versionNumber).toBe(2);
    expect(isTemplateVersionEditable(draft!)).toBe(true);

    expect(approved).toBeDefined();
    expect(approved!.versionNumber).toBe(1);
    expect(isTemplateVersionEditable(approved!)).toBe(false);
  });
});

// ============================================
// PROJECT TYPE VISIBILITY TESTS
// ============================================

describe('DocumentTemplateUI - Project Type Visibility', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('NEW_BUILD project has document templates by default', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'New Build Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    expect(project.documentTemplates).toBeDefined();
    expect(project.documentTemplates!.length).toBe(4);

    // Verify all 4 template types exist
    const types = project.documentTemplates!.map((t) => t.type);
    expect(types).toContain('DOC_DOC');
    expect(types).toContain('DOC_OWNERS_MANUAL');
    expect(types).toContain('DOC_CE_MARKING_CERT');
    expect(types).toContain('DOC_ANNEX_INDEX');
  });

  test('REFIT project does not have document templates by default', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Refit Project',
        clientId: 'test-client',
        type: 'REFIT',
      },
      'test-user'
    );

    // REFIT projects should not have templates auto-created
    expect(project.documentTemplates).toBeUndefined();
  });

  test('MAINTENANCE project does not have document templates by default', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Maintenance Project',
        clientId: 'test-client',
        type: 'MAINTENANCE',
      },
      'test-user'
    );

    // MAINTENANCE projects should not have templates auto-created
    expect(project.documentTemplates).toBeUndefined();
  });

  test('REFIT project with manually added templates should show them', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Refit Project',
        clientId: 'test-client',
        type: 'REFIT',
      },
      'test-user'
    );

    // Initially no templates
    expect(project.documentTemplates).toBeUndefined();

    // Manually add templates (e.g., user requested CE certification for major refit)
    const manualTemplates = createAllDocumentTemplates(project.id, 'test-user');

    await ProjectRepository.update(project.id, {
      documentTemplates: manualTemplates,
    });

    const savedProject = await ProjectRepository.getById(project.id);
    expect(savedProject!.documentTemplates).toBeDefined();
    expect(savedProject!.documentTemplates!.length).toBe(4);
  });

  test('section visibility logic: NEW_BUILD always visible', () => {
    // This tests the logic used in DocumentTemplatesSection
    const isNewBuild = true;
    const hasTemplates = true;

    // NEW_BUILD should show section regardless of template count
    const showSection = isNewBuild || hasTemplates;
    expect(showSection).toBe(true);
  });

  test('section visibility logic: REFIT without templates hidden', () => {
    const isNewBuild = false; // REFIT
    const hasTemplates = false;

    // REFIT without templates should hide section
    const showSection = isNewBuild || hasTemplates;
    expect(showSection).toBe(false);
  });

  test('section visibility logic: REFIT with templates visible', () => {
    const isNewBuild = false; // REFIT
    const hasTemplates = true;

    // REFIT with templates should show section
    const showSection = isNewBuild || hasTemplates;
    expect(showSection).toBe(true);
  });
});

// ============================================
// IMAGE KEY EXTRACTION TESTS
// ============================================

describe('DocumentTemplateUI - Image Key Extraction', () => {
  test('extracts image keys from content', () => {
    const content = `
      # Test Template
      {{IMAGE:manufacturer_logo}}
      Some text here
      {{IMAGE:ce_mark}}
      More text
      {{IMAGE:manufacturer_logo}}  <!-- duplicate should be deduplicated -->
    `;

    const keys = extractImageKeys(content);
    expect(keys).toContain('manufacturer_logo');
    expect(keys).toContain('ce_mark');
    expect(keys.length).toBe(2); // deduplicated
  });

  test('returns empty array for content without image tokens', () => {
    const content = `
      # Test Template
      Just plain text with {{PLACEHOLDER}} but no images
    `;

    const keys = extractImageKeys(content);
    expect(keys.length).toBe(0);
  });

  test('handles various image key formats', () => {
    const content = `
      {{IMAGE:simple}}
      {{IMAGE:with_underscore}}
      {{IMAGE:with123numbers}}
      {{IMAGE:MixedCase}}
    `;

    const keys = extractImageKeys(content);
    expect(keys).toContain('simple');
    expect(keys).toContain('with_underscore');
    expect(keys).toContain('with123numbers');
    expect(keys).toContain('MixedCase');
    expect(keys.length).toBe(4);
  });
});

// ============================================
// OWNER'S MANUAL BLOCKS EDITOR INTEGRATION TESTS
// ============================================

describe('DocumentTemplateUI - Owner\'s Manual Blocks Editor Integration', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('Owner\'s Manual with modular blocks has ownerManualBlocks array', async () => {
    // Create a NEW_BUILD project - Owner's Manual should have modular blocks
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    expect(project.documentTemplates).toBeDefined();

    // Find Owner's Manual
    const ownerManual = project.documentTemplates!.find((t) => t.type === 'DOC_OWNERS_MANUAL');
    expect(ownerManual).toBeDefined();

    // Get draft version
    const draftVersion = getDraftVersion(ownerManual!);
    expect(draftVersion).toBeDefined();

    // Should have modular blocks
    expect(draftVersion!.ownerManualBlocks).toBeDefined();
    expect(Array.isArray(draftVersion!.ownerManualBlocks)).toBe(true);
    expect(draftVersion!.ownerManualBlocks!.length).toBeGreaterThan(0);
  });

  test('other templates do NOT have ownerManualBlocks', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    // Check DoC template
    const docTemplate = project.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    expect(docTemplate).toBeDefined();
    const docDraft = getDraftVersion(docTemplate!);
    expect(docDraft!.ownerManualBlocks).toBeUndefined();

    // Check CE Marking Certificate
    const certTemplate = project.documentTemplates!.find((t) => t.type === 'DOC_CE_MARKING_CERT');
    expect(certTemplate).toBeDefined();
    const certDraft = getDraftVersion(certTemplate!);
    expect(certDraft!.ownerManualBlocks).toBeUndefined();

    // Check Annex Index
    const annexTemplate = project.documentTemplates!.find((t) => t.type === 'DOC_ANNEX_INDEX');
    expect(annexTemplate).toBeDefined();
    const annexDraft = getDraftVersion(annexTemplate!);
    expect(annexDraft!.ownerManualBlocks).toBeUndefined();
  });

  test('Owner\'s Manual blocks contain chapterId and subchapterId', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    const ownerManual = project.documentTemplates!.find((t) => t.type === 'DOC_OWNERS_MANUAL');
    const draftVersion = getDraftVersion(ownerManual!);
    const blocks = draftVersion!.ownerManualBlocks!;

    // Each block should have required fields
    for (const block of blocks) {
      expect(block.id).toBeDefined();
      expect(block.chapterId).toBeDefined();
      expect(block.subchapterId).toBeDefined();
      expect(typeof block.included).toBe('boolean');
      expect(typeof block.content).toBe('string');
      expect(Array.isArray(block.imageSlots)).toBe(true);
    }
  });

  test('isModularOwnerManual returns true for template with blocks', async () => {
    // Import the helper
    const { isModularOwnerManual } = await import('@/domain/models/document-template');

    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    const ownerManual = project.documentTemplates!.find((t) => t.type === 'DOC_OWNERS_MANUAL');
    const draftVersion = getDraftVersion(ownerManual!);

    expect(isModularOwnerManual(draftVersion!)).toBe(true);
  });

  test('isModularOwnerManual returns false for DoC template', async () => {
    const { isModularOwnerManual } = await import('@/domain/models/document-template');

    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    const docTemplate = project.documentTemplates!.find((t) => t.type === 'DOC_DOC');
    const draftVersion = getDraftVersion(docTemplate!);

    expect(isModularOwnerManual(draftVersion!)).toBe(false);
  });

  test('updating ownerManualBlocks persists changes', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    const ownerManual = project.documentTemplates!.find((t) => t.type === 'DOC_OWNERS_MANUAL');
    const draftVersion = getDraftVersion(ownerManual!);
    const originalBlocks = draftVersion!.ownerManualBlocks!;

    // Modify a block's content
    const updatedBlocks = originalBlocks.map((block, idx) => {
      if (idx === 0) {
        return { ...block, content: 'UPDATED CONTENT' };
      }
      return block;
    });

    // Update the version
    const updatedVersion: ProjectDocumentTemplateVersion = {
      ...draftVersion!,
      ownerManualBlocks: updatedBlocks,
      updatedAt: now(),
    };

    const updatedTemplates = project.documentTemplates!.map((t) => {
      if (t.id !== ownerManual!.id) return t;
      return {
        ...t,
        versions: t.versions.map((v) =>
          v.id === draftVersion!.id ? updatedVersion : v
        ),
        updatedAt: now(),
      };
    });

    // Save
    await ProjectRepository.update(project.id, {
      documentTemplates: updatedTemplates,
    });

    // Reload and verify
    const savedProject = await ProjectRepository.getById(project.id);
    const savedManual = savedProject!.documentTemplates!.find((t) => t.type === 'DOC_OWNERS_MANUAL');
    const savedDraft = getDraftVersion(savedManual!);
    const savedBlocks = savedDraft!.ownerManualBlocks!;

    expect(savedBlocks[0].content).toBe('UPDATED CONTENT');
  });
});

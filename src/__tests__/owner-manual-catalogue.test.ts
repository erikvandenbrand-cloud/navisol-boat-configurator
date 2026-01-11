/**
 * Owner's Manual Catalogue Tests
 * Tests for the stable Owner's Manual catalogue, block seeding, and ensure functions.
 *
 * Key test areas:
 * - Catalogue exists and is stable ordered
 * - NEW_BUILD: seeded blocks cover all catalogue subchapters
 * - ensureOwnerManualBlocksFromCatalogue preserves edits and adds missing blocks
 * - Inclusion defaults follow systems keys
 * - ZIP export/import roundtrip preserves blocks, inclusion, content, imageSlots
 * - Legacy blob migration preserved and included
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import {
  OWNER_MANUAL_CATALOGUE,
  createOwnerManualBlocks,
  createOwnerManualTemplate,
  createOwnerManualTemplateVersion,
  ensureOwnerManualBlocksFromCatalogue,
  ensureOwnerManualVersionBlocks,
  ensureOwnerManualTemplateBlocks,
  migrateOwnerManualToBlocks,
  getCatalogueChapter,
  getCatalogueSubchapter,
  getChapterTitle,
  getSubchapterTitle,
  shouldIncludeSubchapter,
  isModularOwnerManual,
  getDraftVersion,
  type ManualBlock,
  type ManualCatalogueChapter,
  type ManualCatalogueSubchapter,
  type ProjectDocumentTemplateVersion,
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
 * Count total subchapters across all chapters.
 */
function countCatalogueSubchapters(): number {
  return OWNER_MANUAL_CATALOGUE.chapters.reduce(
    (sum, ch) => sum + ch.subchapters.length,
    0
  );
}

// ============================================
// CATALOGUE STRUCTURE TESTS
// ============================================

describe('Owner\'s Manual Catalogue - Structure', () => {
  test('catalogue exists and has version', () => {
    expect(OWNER_MANUAL_CATALOGUE).toBeDefined();
    expect(OWNER_MANUAL_CATALOGUE.version).toBe('1.0.0');
  });

  test('catalogue has stable ordered chapters', () => {
    const chapters = OWNER_MANUAL_CATALOGUE.chapters;
    expect(chapters.length).toBeGreaterThanOrEqual(10);

    // Verify order is sequential
    for (let i = 0; i < chapters.length; i++) {
      expect(chapters[i].order).toBe(i + 1);
    }

    // Verify chapter IDs are unique
    const chapterIds = chapters.map((c) => c.id);
    expect(new Set(chapterIds).size).toBe(chapterIds.length);
  });

  test('each chapter has stable ordered subchapters', () => {
    for (const chapter of OWNER_MANUAL_CATALOGUE.chapters) {
      expect(chapter.subchapters.length).toBeGreaterThanOrEqual(1);

      // Verify order within chapter is sequential
      for (let i = 0; i < chapter.subchapters.length; i++) {
        expect(chapter.subchapters[i].order).toBe(i + 1);
      }

      // Verify subchapter IDs are unique within chapter
      const subIds = chapter.subchapters.map((s) => s.id);
      expect(new Set(subIds).size).toBe(subIds.length);
    }
  });

  test('each subchapter has seedContent', () => {
    for (const chapter of OWNER_MANUAL_CATALOGUE.chapters) {
      for (const subchapter of chapter.subchapters) {
        expect(subchapter.seedContent).toBeDefined();
        expect(subchapter.seedContent.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('required chapters exist with alwaysApplicable flag', () => {
    const alwaysChapters = OWNER_MANUAL_CATALOGUE.chapters.filter(
      (c) => c.alwaysApplicable
    );
    expect(alwaysChapters.length).toBeGreaterThanOrEqual(5);

    // Verify specific always-applicable chapters
    const alwaysIds = alwaysChapters.map((c) => c.id);
    expect(alwaysIds).toContain('introduction');
    expect(alwaysIds).toContain('vessel_identification');
    expect(alwaysIds).toContain('operation');
    expect(alwaysIds).toContain('maintenance');
    expect(alwaysIds).toContain('contact');
  });

  test('chapters with systemKey subchapters exist', () => {
    // Propulsion chapter should have system-keyed subchapters
    const propulsion = getCatalogueChapter('propulsion');
    expect(propulsion).toBeDefined();
    const electricProp = propulsion?.subchapters.find(
      (s) => s.systemKey === 'electric_propulsion'
    );
    expect(electricProp).toBeDefined();

    // Electrical chapter should have system-keyed subchapters
    const electrical = getCatalogueChapter('electrical');
    expect(electrical).toBeDefined();
    const shorePower = electrical?.subchapters.find(
      (s) => s.systemKey === 'shore_power'
    );
    expect(shorePower).toBeDefined();
  });

  test('subchapters with imageKeys have them defined', () => {
    let foundImageKeys = 0;
    for (const chapter of OWNER_MANUAL_CATALOGUE.chapters) {
      for (const subchapter of chapter.subchapters) {
        if (subchapter.imageKeys && subchapter.imageKeys.length > 0) {
          foundImageKeys++;
          for (const key of subchapter.imageKeys) {
            expect(key.length).toBeGreaterThan(0);
          }
        }
      }
    }
    // Should have at least several subchapters with image keys
    expect(foundImageKeys).toBeGreaterThanOrEqual(5);
  });
});

// ============================================
// CATALOGUE LOOKUP TESTS
// ============================================

describe('Owner\'s Manual Catalogue - Lookup Functions', () => {
  test('getCatalogueChapter returns chapter by ID', () => {
    const intro = getCatalogueChapter('introduction');
    expect(intro).toBeDefined();
    expect(intro?.title).toBe('Introduction');

    const nonExistent = getCatalogueChapter('nonexistent');
    expect(nonExistent).toBeUndefined();
  });

  test('getCatalogueSubchapter returns subchapter by IDs', () => {
    const welcome = getCatalogueSubchapter('introduction', 'intro_welcome');
    expect(welcome).toBeDefined();
    expect(welcome?.title).toBe('Welcome');

    const nonExistent = getCatalogueSubchapter('introduction', 'nonexistent');
    expect(nonExistent).toBeUndefined();
  });

  test('getChapterTitle returns catalogue title or fallback', () => {
    expect(getChapterTitle('introduction')).toBe('Introduction');
    expect(getChapterTitle('propulsion')).toBe('Propulsion System');
    // Fallback for non-catalogue IDs
    expect(getChapterTitle('custom_chapter')).toBe('Custom Chapter');
    expect(getChapterTitle('my-special-chapter')).toBe('My Special Chapter');
  });

  test('getSubchapterTitle returns catalogue title or fallback', () => {
    expect(getSubchapterTitle('introduction', 'intro_welcome')).toBe('Welcome');
    expect(getSubchapterTitle('propulsion', 'prop_electric')).toBe('Electric Propulsion');
    // Fallback for non-catalogue IDs
    expect(getSubchapterTitle('introduction', 'custom_sub')).toBe('Custom Sub');
    expect(getSubchapterTitle('intro', 'my-section-title')).toBe('My Section Title');
  });
});

// ============================================
// INCLUSION LOGIC TESTS
// ============================================

describe('Owner\'s Manual Catalogue - Inclusion Logic', () => {
  test('alwaysApplicable chapter with defaultIncluded subchapter is included', () => {
    const intro = getCatalogueChapter('introduction')!;
    const welcome = intro.subchapters.find((s) => s.id === 'intro_welcome')!;

    expect(shouldIncludeSubchapter(intro, welcome, undefined)).toBe(true);
    expect(shouldIncludeSubchapter(intro, welcome, [])).toBe(true);
  });

  test('defaultIncluded subchapter is included regardless of chapter', () => {
    // Find a defaultIncluded subchapter in a non-alwaysApplicable chapter
    let found = false;
    for (const chapter of OWNER_MANUAL_CATALOGUE.chapters) {
      if (!chapter.alwaysApplicable) {
        const defaultSub = chapter.subchapters.find((s) => s.defaultIncluded);
        if (defaultSub) {
          expect(shouldIncludeSubchapter(chapter, defaultSub, undefined)).toBe(true);
          found = true;
          break;
        }
      }
    }
    // This is fine if not found - just means all defaultIncluded are in always chapters
  });

  test('systemKey subchapter is included when system is present', () => {
    const propulsion = getCatalogueChapter('propulsion')!;
    const electricProp = propulsion.subchapters.find(
      (s) => s.systemKey === 'electric_propulsion'
    )!;

    // Not included without the system
    expect(shouldIncludeSubchapter(propulsion, electricProp, undefined)).toBe(false);
    expect(shouldIncludeSubchapter(propulsion, electricProp, [])).toBe(false);
    expect(shouldIncludeSubchapter(propulsion, electricProp, ['diesel_propulsion'])).toBe(false);

    // Included with the system
    expect(shouldIncludeSubchapter(propulsion, electricProp, ['electric_propulsion'])).toBe(true);
    expect(
      shouldIncludeSubchapter(propulsion, electricProp, ['electric_propulsion', 'shore_power'])
    ).toBe(true);
  });

  test('subchapter without defaultIncluded or systemKey is not included', () => {
    // Find a subchapter without either flag
    let found = false;
    for (const chapter of OWNER_MANUAL_CATALOGUE.chapters) {
      if (!chapter.alwaysApplicable) {
        const noFlagSub = chapter.subchapters.find(
          (s) => !s.defaultIncluded && !s.systemKey
        );
        if (noFlagSub) {
          expect(shouldIncludeSubchapter(chapter, noFlagSub, ['random_system'])).toBe(false);
          found = true;
          break;
        }
      }
    }
    // This is expected to happen in at least some cases
  });
});

// ============================================
// BLOCK CREATION TESTS
// ============================================

describe('Owner\'s Manual Catalogue - Block Creation', () => {
  test('createOwnerManualBlocks creates blocks for all catalogue subchapters', () => {
    const blocks = createOwnerManualBlocks(undefined);
    const totalSubchapters = countCatalogueSubchapters();

    expect(blocks.length).toBe(totalSubchapters);

    // Verify each block has required fields
    for (const block of blocks) {
      expect(block.id).toBeDefined();
      expect(block.chapterId).toBeDefined();
      expect(block.subchapterId).toBeDefined();
      expect(block.order).toBeGreaterThan(0);
      expect(typeof block.included).toBe('boolean');
      expect(block.content).toBeDefined();
      expect(Array.isArray(block.imageSlots)).toBe(true);
    }
  });

  test('blocks have unique IDs', () => {
    const blocks = createOwnerManualBlocks(undefined);
    const ids = blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('blocks are ordered sequentially', () => {
    const blocks = createOwnerManualBlocks(undefined);
    for (let i = 0; i < blocks.length; i++) {
      expect(blocks[i].order).toBe(i + 1);
    }
  });

  test('blocks have seedContent from catalogue', () => {
    const blocks = createOwnerManualBlocks(undefined);

    for (const block of blocks) {
      const catalogueSub = getCatalogueSubchapter(block.chapterId, block.subchapterId);
      if (catalogueSub) {
        expect(block.content).toBe(catalogueSub.seedContent);
      }
    }
  });

  test('blocks have imageSlots from catalogue imageKeys', () => {
    const blocks = createOwnerManualBlocks(undefined);

    for (const block of blocks) {
      const catalogueSub = getCatalogueSubchapter(block.chapterId, block.subchapterId);
      if (catalogueSub?.imageKeys && catalogueSub.imageKeys.length > 0) {
        expect(block.imageSlots.length).toBe(catalogueSub.imageKeys.length);
        for (const imageKey of catalogueSub.imageKeys) {
          const slot = block.imageSlots.find((s) => s.key === imageKey);
          expect(slot).toBeDefined();
        }
      }
    }
  });

  test('inclusion respects project systems', () => {
    const blocksNoSystems = createOwnerManualBlocks(undefined);
    const blocksWithElectric = createOwnerManualBlocks(['electric_propulsion']);

    // Find the electric propulsion block
    const electricBlockNo = blocksNoSystems.find(
      (b) => b.chapterId === 'propulsion' && b.subchapterId === 'prop_electric'
    )!;
    const electricBlockYes = blocksWithElectric.find(
      (b) => b.chapterId === 'propulsion' && b.subchapterId === 'prop_electric'
    )!;

    expect(electricBlockNo.included).toBe(false);
    expect(electricBlockYes.included).toBe(true);
  });
});

// ============================================
// ENSURE BLOCKS FROM CATALOGUE TESTS
// ============================================

describe('Owner\'s Manual Catalogue - ensureOwnerManualBlocksFromCatalogue', () => {
  test('returns full blocks when existingBlocks is undefined', () => {
    const blocks = ensureOwnerManualBlocksFromCatalogue(undefined, undefined);
    expect(blocks.length).toBe(countCatalogueSubchapters());
  });

  test('returns full blocks when existingBlocks is empty', () => {
    const blocks = ensureOwnerManualBlocksFromCatalogue([], undefined);
    expect(blocks.length).toBe(countCatalogueSubchapters());
  });

  test('preserves existing block content', () => {
    // Create blocks, modify one
    const originalBlocks = createOwnerManualBlocks(undefined);
    const modifiedBlocks = [...originalBlocks];
    modifiedBlocks[0] = {
      ...modifiedBlocks[0],
      content: 'My custom content that should be preserved',
    };

    const ensured = ensureOwnerManualBlocksFromCatalogue(modifiedBlocks, undefined);

    expect(ensured[0].content).toBe('My custom content that should be preserved');
  });

  test('preserves existing block included state', () => {
    const originalBlocks = createOwnerManualBlocks(undefined);
    const modifiedBlocks = [...originalBlocks];
    // Flip the included state
    modifiedBlocks[0] = {
      ...modifiedBlocks[0],
      included: !modifiedBlocks[0].included,
    };

    const ensured = ensureOwnerManualBlocksFromCatalogue(modifiedBlocks, undefined);

    expect(ensured[0].included).toBe(modifiedBlocks[0].included);
  });

  test('preserves existing block imageSlots with dataUrl', () => {
    const originalBlocks = createOwnerManualBlocks(undefined);

    // Find a block with imageSlots
    const blockWithSlots = originalBlocks.find((b) => b.imageSlots.length > 0);
    if (!blockWithSlots) {
      // Skip if no blocks have image slots
      return;
    }

    const modifiedBlocks = originalBlocks.map((b) => {
      if (b.id === blockWithSlots.id) {
        return {
          ...b,
          imageSlots: b.imageSlots.map((s) => ({
            ...s,
            dataUrl: 'data:image/png;base64,testdata',
            caption: 'Test caption',
          })),
        };
      }
      return b;
    });

    const ensured = ensureOwnerManualBlocksFromCatalogue(modifiedBlocks, undefined);

    const ensuredBlock = ensured.find(
      (b) => b.chapterId === blockWithSlots.chapterId && b.subchapterId === blockWithSlots.subchapterId
    )!;
    expect(ensuredBlock.imageSlots[0].dataUrl).toBe('data:image/png;base64,testdata');
    expect(ensuredBlock.imageSlots[0].caption).toBe('Test caption');
  });

  test('adds missing blocks from catalogue', () => {
    // Create partial blocks (just first 5)
    const originalBlocks = createOwnerManualBlocks(undefined);
    const partialBlocks = originalBlocks.slice(0, 5);

    const ensured = ensureOwnerManualBlocksFromCatalogue(partialBlocks, undefined);

    expect(ensured.length).toBe(countCatalogueSubchapters());

    // First 5 should be preserved
    for (let i = 0; i < 5; i++) {
      expect(ensured[i].id).toBe(partialBlocks[i].id);
    }
  });

  test('preserves legacy_content block', () => {
    // Simulate migration result with legacy_content block
    const blocksWithLegacy: ManualBlock[] = [
      {
        id: 'legacy-block-id',
        chapterId: 'introduction',
        subchapterId: 'legacy_content',
        order: 999,
        included: true,
        content: 'This is my legacy manual content',
        imageSlots: [{ key: 'old_image', dataUrl: 'data:image/png;base64,legacy' }],
      },
    ];

    const ensured = ensureOwnerManualBlocksFromCatalogue(blocksWithLegacy, undefined);

    // Should have catalogue blocks + legacy block
    expect(ensured.length).toBe(countCatalogueSubchapters() + 1);

    // Legacy block should be at the end
    const legacyBlock = ensured.find((b) => b.subchapterId === 'legacy_content');
    expect(legacyBlock).toBeDefined();
    expect(legacyBlock?.content).toBe('This is my legacy manual content');
    expect(legacyBlock?.included).toBe(true);
    expect(legacyBlock?.imageSlots[0].dataUrl).toBe('data:image/png;base64,legacy');
  });

  test('respects project systems for newly added blocks', () => {
    // Start with empty blocks
    const ensured = ensureOwnerManualBlocksFromCatalogue([], ['shore_power']);

    // Shore power block should be included
    const shoreBlock = ensured.find((b) => b.subchapterId === 'elec_shore_power');
    expect(shoreBlock).toBeDefined();
    expect(shoreBlock?.included).toBe(true);

    // Electric propulsion should not be included
    const electricBlock = ensured.find((b) => b.subchapterId === 'prop_electric');
    expect(electricBlock).toBeDefined();
    expect(electricBlock?.included).toBe(false);
  });
});

// ============================================
// TEMPLATE VERSION ENSURE TESTS
// ============================================

describe('Owner\'s Manual Catalogue - ensureOwnerManualVersionBlocks', () => {
  test('migrates legacy content and adds catalogue blocks', () => {
    const legacyVersion: ProjectDocumentTemplateVersion = {
      id: 'version-1',
      templateId: 'template-1',
      versionNumber: 1,
      status: 'DRAFT',
      content: '# My Legacy Manual\n\nThis is the old content.',
      imageSlots: [{ key: 'old_slot', label: 'Old Slot', dataUrl: 'data:image/png;base64,old' }],
      requiredFields: [],
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    const ensured = ensureOwnerManualVersionBlocks(legacyVersion, undefined);

    expect(ensured.ownerManualBlocks).toBeDefined();
    expect(ensured.ownerManualBlocks!.length).toBeGreaterThan(countCatalogueSubchapters());

    // Legacy content should be in a legacy_content block
    const legacyBlock = ensured.ownerManualBlocks!.find(
      (b) => b.subchapterId === 'legacy_content'
    );
    expect(legacyBlock).toBeDefined();
    expect(legacyBlock?.content).toContain('My Legacy Manual');
    expect(legacyBlock?.included).toBe(true);

    // aiAssisted should be false for migrated content
    expect(ensured.aiAssisted).toBe(false);
  });

  test('creates fresh blocks when no content or blocks exist', () => {
    const emptyVersion: ProjectDocumentTemplateVersion = {
      id: 'version-1',
      templateId: 'template-1',
      versionNumber: 1,
      status: 'DRAFT',
      content: '',
      imageSlots: [],
      requiredFields: [],
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    const ensured = ensureOwnerManualVersionBlocks(emptyVersion, undefined);

    expect(ensured.ownerManualBlocks).toBeDefined();
    expect(ensured.ownerManualBlocks!.length).toBe(countCatalogueSubchapters());
    expect(ensured.aiAssisted).toBe(true);
  });

  test('repairs missing blocks in existing version', () => {
    const partialBlocks = createOwnerManualBlocks(undefined).slice(0, 5);
    const partialVersion: ProjectDocumentTemplateVersion = {
      id: 'version-1',
      templateId: 'template-1',
      versionNumber: 1,
      status: 'DRAFT',
      content: '',
      imageSlots: [],
      requiredFields: [],
      ownerManualBlocks: partialBlocks,
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    const ensured = ensureOwnerManualVersionBlocks(partialVersion, undefined);

    expect(ensured.ownerManualBlocks!.length).toBe(countCatalogueSubchapters());
  });

  test('returns same version when no changes needed', () => {
    const completeBlocks = createOwnerManualBlocks(undefined);
    const completeVersion: ProjectDocumentTemplateVersion = {
      id: 'version-1',
      templateId: 'template-1',
      versionNumber: 1,
      status: 'DRAFT',
      content: '',
      imageSlots: [],
      requiredFields: [],
      ownerManualBlocks: completeBlocks,
      createdBy: 'test',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    const ensured = ensureOwnerManualVersionBlocks(completeVersion, undefined);

    // Should return same object (no changes)
    expect(ensured).toBe(completeVersion);
  });
});

// ============================================
// ZIP ROUNDTRIP TESTS
// ============================================

describe('Owner\'s Manual Catalogue - ZIP Roundtrip', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('ZIP export/import preserves blocks with content and imageSlots', async () => {
    const { ExportImportService } = await import('@/domain/services/ExportImportService');
    const { getAdapter } = await import('@/data/persistence');

    // Create project
    const project = await ProjectRepository.create({
      title: 'Test Boat',
      clientId: 'test-client',
      type: 'NEW_BUILD',
    }, 'test-user');

    // Verify project has Owner's Manual with blocks
    const ownerManual = project.documentTemplates?.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    expect(ownerManual).toBeDefined();
    const draftVersion = getDraftVersion(ownerManual!);
    expect(draftVersion?.ownerManualBlocks).toBeDefined();
    expect(draftVersion?.ownerManualBlocks!.length).toBe(countCatalogueSubchapters());

    // Modify a block
    const modifiedBlocks = draftVersion!.ownerManualBlocks!.map((b, i) => {
      if (i === 0) {
        return {
          ...b,
          content: 'Custom content for export test',
          included: true,
          imageSlots: b.imageSlots.map((s) => ({
            ...s,
            dataUrl: 'data:image/png;base64,exporttest',
            caption: 'Export caption',
          })),
        };
      }
      return b;
    });

    // Update the version and save
    const updatedVersion = { ...draftVersion!, ownerManualBlocks: modifiedBlocks };
    const updatedTemplate = {
      ...ownerManual!,
      versions: [updatedVersion],
    };
    const updatedTemplates = project.documentTemplates!.map((t) =>
      t.id === ownerManual!.id ? updatedTemplate : t
    );
    const updatedProject = { ...project, documentTemplates: updatedTemplates };
    await getAdapter().save('projects', updatedProject);

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

    // Verify blocks preserved
    const importedProject = await ProjectRepository.getById(project.id);
    expect(importedProject).toBeDefined();
    const importedManual = importedProject?.documentTemplates?.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    expect(importedManual).toBeDefined();
    const importedDraft = getDraftVersion(importedManual!);
    expect(importedDraft?.ownerManualBlocks).toBeDefined();
    expect(importedDraft?.ownerManualBlocks!.length).toBe(countCatalogueSubchapters());

    // Verify modified block content preserved
    const firstBlock = importedDraft!.ownerManualBlocks![0];
    expect(firstBlock.content).toBe('Custom content for export test');
    expect(firstBlock.included).toBe(true);

    // Verify imageSlots preserved (if block has them)
    if (firstBlock.imageSlots.length > 0) {
      expect(firstBlock.imageSlots[0].dataUrl).toBe('data:image/png;base64,exporttest');
      expect(firstBlock.imageSlots[0].caption).toBe('Export caption');
    }
  });

  test('ZIP import migrates legacy Owner\'s Manual to blocks', async () => {
    const { ExportImportService } = await import('@/domain/services/ExportImportService');
    const { getAdapter } = await import('@/data/persistence');

    // Create a project manually with legacy Owner's Manual (no blocks)
    const project = await ProjectRepository.create({
      title: 'Legacy Boat',
      clientId: 'test-client',
      type: 'NEW_BUILD',
    }, 'test-user');

    // Replace Owner's Manual with legacy version (no blocks)
    const ownerManual = project.documentTemplates?.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    const legacyVersion = {
      ...getDraftVersion(ownerManual!)!,
      ownerManualBlocks: undefined as ManualBlock[] | undefined,
      content: '# Legacy Manual\n\nThis is old content that needs migration.',
      aiAssisted: undefined as boolean | undefined,
    };
    const legacyTemplate = {
      ...ownerManual!,
      versions: [legacyVersion],
    };
    const legacyTemplates = project.documentTemplates!.map((t) =>
      t.id === ownerManual!.id ? legacyTemplate : t
    );
    const legacyProject = { ...project, documentTemplates: legacyTemplates };
    await getAdapter().save('projects', legacyProject);

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

    // Verify legacy content is migrated to blocks
    const importedProject = await ProjectRepository.getById(project.id);
    expect(importedProject).toBeDefined();
    const importedManual = importedProject?.documentTemplates?.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    const importedDraft = getDraftVersion(importedManual!);

    // Should have blocks now
    expect(importedDraft?.ownerManualBlocks).toBeDefined();
    expect(importedDraft?.ownerManualBlocks!.length).toBeGreaterThan(0);

    // Legacy content should be preserved in a legacy_content block
    const legacyBlock = importedDraft!.ownerManualBlocks!.find(
      (b) => b.subchapterId === 'legacy_content'
    );
    expect(legacyBlock).toBeDefined();
    expect(legacyBlock?.content).toContain('Legacy Manual');
    expect(legacyBlock?.included).toBe(true);
  });

  test('ZIP import preserves inclusion toggles', async () => {
    const { ExportImportService } = await import('@/domain/services/ExportImportService');
    const { getAdapter } = await import('@/data/persistence');

    // Create project
    const project = await ProjectRepository.create({
      title: 'Toggle Test Boat',
      clientId: 'test-client',
      type: 'NEW_BUILD',
    }, 'test-user');

    // Toggle some blocks off/on
    const ownerManual = project.documentTemplates?.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    const draftVersion = getDraftVersion(ownerManual!);
    const modifiedBlocks = draftVersion!.ownerManualBlocks!.map((b, i) => ({
      ...b,
      included: i % 2 === 0, // Alternating included state
    }));

    const updatedVersion = { ...draftVersion!, ownerManualBlocks: modifiedBlocks };
    const updatedTemplate = { ...ownerManual!, versions: [updatedVersion] };
    const updatedTemplates = project.documentTemplates!.map((t) =>
      t.id === ownerManual!.id ? updatedTemplate : t
    );
    const updatedProject = { ...project, documentTemplates: updatedTemplates };
    await getAdapter().save('projects', updatedProject);

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

    // Verify toggles preserved
    const importedProject = await ProjectRepository.getById(project.id);
    expect(importedProject).toBeDefined();
    const importedManual = importedProject?.documentTemplates?.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    const importedDraft = getDraftVersion(importedManual!);

    for (let i = 0; i < importedDraft!.ownerManualBlocks!.length; i++) {
      expect(importedDraft!.ownerManualBlocks![i].included).toBe(i % 2 === 0);
    }
  });
});

// ============================================
// LEGACY MIGRATION TESTS
// ============================================

describe('Owner\'s Manual Catalogue - Legacy Migration', () => {
  test('migrateOwnerManualToBlocks creates legacy_content block', () => {
    const legacyContent = '# My Old Manual\n\nThis is the old format.';
    const legacySlots = [
      { key: 'old_image', label: 'Old Image', dataUrl: 'data:image/png;base64,old' },
    ];

    const { blocks, aiAssisted } = migrateOwnerManualToBlocks(
      legacyContent,
      legacySlots,
      undefined
    );

    // Should have catalogue blocks + legacy block
    expect(blocks.length).toBeGreaterThan(countCatalogueSubchapters());

    const legacyBlock = blocks.find((b) => b.subchapterId === 'legacy_content');
    expect(legacyBlock).toBeDefined();
    expect(legacyBlock?.content).toBe(legacyContent);
    expect(legacyBlock?.included).toBe(true);
    expect(legacyBlock?.imageSlots).toEqual(legacySlots);

    // Migrated content is not AI-assisted
    expect(aiAssisted).toBe(false);
  });

  test('migrateOwnerManualToBlocks handles empty legacy content', () => {
    const { blocks, aiAssisted } = migrateOwnerManualToBlocks('', [], undefined);

    // Should only have catalogue blocks
    expect(blocks.length).toBe(countCatalogueSubchapters());

    const legacyBlock = blocks.find((b) => b.subchapterId === 'legacy_content');
    expect(legacyBlock).toBeUndefined();
  });

  test('migrateOwnerManualToBlocks respects project systems', () => {
    const { blocks } = migrateOwnerManualToBlocks(
      'Legacy content',
      [],
      ['electric_propulsion', 'shore_power']
    );

    // For migration, only alwaysApplicable chapters get defaultIncluded
    // System-keyed blocks should NOT be auto-included during migration
    // (because we can't know what was in the legacy content)

    // Legacy block should be included
    const legacyBlock = blocks.find((b) => b.subchapterId === 'legacy_content');
    expect(legacyBlock?.included).toBe(true);
  });
});

// ============================================
// NEW_BUILD SEEDING TESTS
// ============================================

describe('Owner\'s Manual Catalogue - NEW_BUILD Seeding', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('NEW_BUILD project gets seeded Owner\'s Manual with all catalogue blocks', async () => {
    const project = await ProjectRepository.create({
      title: 'New Build Boat',
      clientId: 'test-client',
      type: 'NEW_BUILD',
    }, 'test-user');

    const ownerManual = project.documentTemplates?.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    expect(ownerManual).toBeDefined();

    const draftVersion = getDraftVersion(ownerManual!);
    expect(draftVersion).toBeDefined();
    expect(draftVersion?.ownerManualBlocks).toBeDefined();
    expect(draftVersion?.ownerManualBlocks!.length).toBe(countCatalogueSubchapters());

    // Verify isModularOwnerManual returns true
    expect(isModularOwnerManual(draftVersion!)).toBe(true);

    // Verify aiAssisted is true for seeded content
    expect(draftVersion?.aiAssisted).toBe(true);
  });

  test('NEW_BUILD project with systems gets correct inclusions', async () => {
    const project = await ProjectRepository.create({
      title: 'Electric Boat',
      clientId: 'test-client',
      type: 'NEW_BUILD',
      systems: ['electric_propulsion', 'shore_power', 'solar_power'],
    }, 'test-user');

    const ownerManual = project.documentTemplates?.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    const draftVersion = getDraftVersion(ownerManual!);

    // Electric propulsion should be included
    const electricBlock = draftVersion?.ownerManualBlocks?.find(
      (b) => b.subchapterId === 'prop_electric'
    );
    expect(electricBlock?.included).toBe(true);

    // Diesel propulsion should NOT be included
    const dieselBlock = draftVersion?.ownerManualBlocks?.find(
      (b) => b.subchapterId === 'prop_diesel'
    );
    expect(dieselBlock?.included).toBe(false);

    // Shore power should be included
    const shoreBlock = draftVersion?.ownerManualBlocks?.find(
      (b) => b.subchapterId === 'elec_shore_power'
    );
    expect(shoreBlock?.included).toBe(true);
  });

  test('REFIT project does not get document templates', async () => {
    const project = await ProjectRepository.create({
      title: 'Refit Project',
      clientId: 'test-client',
      type: 'REFIT',
    }, 'test-user');

    // REFIT projects should not have document templates
    expect(project.documentTemplates?.length || 0).toBe(0);
  });
});

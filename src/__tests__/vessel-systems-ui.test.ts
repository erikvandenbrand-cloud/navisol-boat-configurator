/**
 * Vessel Systems UI Tests
 * Tests for project.systems editing:
 * - Adding/removing system keys
 * - Persistence to localStorage
 * - ZIP roundtrip preserves systems
 * - Ensure function preserves user toggles
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import {
  SYSTEM_KEYS,
  createOwnerManualBlocks,
  ensureOwnerManualBlocksFromCatalogue,
  ensureOwnerManualTemplateBlocks,
  getDraftVersion,
  type ManualBlock,
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
// PROJECT.SYSTEMS PERSISTENCE TESTS
// ============================================

describe('VesselSystems - Persistence', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('project can be created with systems array', async () => {
    const project = await ProjectRepository.create({
      title: 'Boat With Systems',
      clientId: 'test-client',
      type: 'NEW_BUILD',
      systems: ['electric_propulsion', 'shore_power'],
    }, 'test-user');

    expect(project.systems).toBeDefined();
    expect(project.systems).toContain('electric_propulsion');
    expect(project.systems).toContain('shore_power');
    expect(project.systems?.length).toBe(2);
  });

  test('project systems can be updated', async () => {
    const project = await ProjectRepository.create({
      title: 'Boat Without Systems',
      clientId: 'test-client',
      type: 'NEW_BUILD',
    }, 'test-user');

    expect(project.systems).toBeUndefined();

    // Update to add systems
    const updated = await ProjectRepository.update(project.id, {
      systems: ['diesel_propulsion', 'fuel_system', 'bilge_pump'],
    });

    expect(updated).not.toBeNull();
    expect(updated?.systems).toBeDefined();
    expect(updated?.systems?.length).toBe(3);
    expect(updated?.systems).toContain('diesel_propulsion');
    expect(updated?.systems).toContain('fuel_system');
    expect(updated?.systems).toContain('bilge_pump');
  });

  test('project systems can include custom keys', async () => {
    const project = await ProjectRepository.create({
      title: 'Boat With Custom System',
      clientId: 'test-client',
      type: 'NEW_BUILD',
      systems: ['electric_propulsion', 'custom_water_maker', 'custom_ice_maker'],
    }, 'test-user');

    expect(project.systems?.length).toBe(3);
    expect(project.systems).toContain('custom_water_maker');
    expect(project.systems).toContain('custom_ice_maker');
  });

  test('removing a system from project.systems persists', async () => {
    const project = await ProjectRepository.create({
      title: 'Boat With Systems',
      clientId: 'test-client',
      type: 'NEW_BUILD',
      systems: ['electric_propulsion', 'shore_power', 'solar_power'],
    }, 'test-user');

    expect(project.systems?.length).toBe(3);

    // Remove shore_power
    const updated = await ProjectRepository.update(project.id, {
      systems: ['electric_propulsion', 'solar_power'],
    });

    expect(updated?.systems?.length).toBe(2);
    expect(updated?.systems).not.toContain('shore_power');
    expect(updated?.systems).toContain('electric_propulsion');
    expect(updated?.systems).toContain('solar_power');
  });

  test('adding a custom system key persists', async () => {
    const project = await ProjectRepository.create({
      title: 'Boat',
      clientId: 'test-client',
      type: 'NEW_BUILD',
      systems: ['electric_propulsion'],
    }, 'test-user');

    const updated = await ProjectRepository.update(project.id, {
      systems: ['electric_propulsion', 'my_custom_system'],
    });

    expect(updated?.systems?.length).toBe(2);
    expect(updated?.systems).toContain('my_custom_system');
  });
});

// ============================================
// SYSTEM_KEYS CONSTANT TESTS
// ============================================

describe('VesselSystems - SYSTEM_KEYS Constant', () => {
  test('SYSTEM_KEYS is defined and non-empty', () => {
    expect(SYSTEM_KEYS).toBeDefined();
    expect(SYSTEM_KEYS.length).toBeGreaterThan(20);
  });

  test('SYSTEM_KEYS contains expected propulsion types', () => {
    expect(SYSTEM_KEYS).toContain('electric_propulsion');
    expect(SYSTEM_KEYS).toContain('diesel_propulsion');
    expect(SYSTEM_KEYS).toContain('outboard_propulsion');
    expect(SYSTEM_KEYS).toContain('inboard_propulsion');
  });

  test('SYSTEM_KEYS contains expected electrical systems', () => {
    expect(SYSTEM_KEYS).toContain('shore_power');
    expect(SYSTEM_KEYS).toContain('solar_power');
    expect(SYSTEM_KEYS).toContain('generator');
  });

  test('SYSTEM_KEYS contains expected safety systems', () => {
    expect(SYSTEM_KEYS).toContain('bilge_pump');
    expect(SYSTEM_KEYS).toContain('fire_extinguishers');
    expect(SYSTEM_KEYS).toContain('navigation_lights');
  });

  test('SYSTEM_KEYS contains expected navigation systems', () => {
    expect(SYSTEM_KEYS).toContain('radar');
    expect(SYSTEM_KEYS).toContain('ais');
    expect(SYSTEM_KEYS).toContain('vhf_radio');
    expect(SYSTEM_KEYS).toContain('chartplotter');
    expect(SYSTEM_KEYS).toContain('depth_sounder');
  });
});

// ============================================
// ZIP ROUNDTRIP TESTS
// ============================================

describe('VesselSystems - ZIP Roundtrip', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('ZIP export/import preserves project.systems', async () => {
    const { ExportImportService } = await import('@/domain/services/ExportImportService');

    // Create project with systems
    const project = await ProjectRepository.create({
      title: 'Boat With Systems',
      clientId: 'test-client',
      type: 'NEW_BUILD',
      systems: ['electric_propulsion', 'shore_power', 'custom_water_maker'],
    }, 'test-user');

    expect(project.systems?.length).toBe(3);

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

    // Verify systems preserved
    const importedProject = await ProjectRepository.getById(project.id);
    expect(importedProject).toBeDefined();
    expect(importedProject?.systems).toBeDefined();
    expect(importedProject?.systems?.length).toBe(3);
    expect(importedProject?.systems).toContain('electric_propulsion');
    expect(importedProject?.systems).toContain('shore_power');
    expect(importedProject?.systems).toContain('custom_water_maker');
  });

  test('ZIP import of project without systems initializes as undefined', async () => {
    const { ExportImportService } = await import('@/domain/services/ExportImportService');

    // Create project without systems
    const project = await ProjectRepository.create({
      title: 'Boat Without Systems',
      clientId: 'test-client',
      type: 'NEW_BUILD',
    }, 'test-user');

    expect(project.systems).toBeUndefined();

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

    // Verify no systems
    const importedProject = await ProjectRepository.getById(project.id);
    expect(importedProject).toBeDefined();
    expect(importedProject?.systems).toBeUndefined();
  });
});

// ============================================
// ENSURE FUNCTION - USER TOGGLE PRESERVATION TESTS
// ============================================

describe('VesselSystems - Ensure Preserves User Toggles', () => {
  test('ensureOwnerManualBlocksFromCatalogue preserves existing block included state', () => {
    // Create blocks with no systems (so system-keyed blocks are included=false by default)
    const originalBlocks = createOwnerManualBlocks(undefined);

    // Find a system-keyed block that should be false by default
    const electricBlock = originalBlocks.find(
      (b) => b.subchapterId === 'prop_electric'
    );
    expect(electricBlock).toBeDefined();
    expect(electricBlock?.included).toBe(false);

    // User manually toggles it to true
    const modifiedBlocks = originalBlocks.map((b) => {
      if (b.subchapterId === 'prop_electric') {
        return { ...b, included: true };
      }
      return b;
    });

    // Now run ensure with systems that include electric_propulsion
    // The function should NOT change the user's toggle
    const ensured = ensureOwnerManualBlocksFromCatalogue(
      modifiedBlocks,
      ['electric_propulsion']
    );

    const ensuredElectric = ensured.find((b) => b.subchapterId === 'prop_electric');
    // Should STILL be true (user's toggle preserved)
    expect(ensuredElectric?.included).toBe(true);
  });

  test('ensureOwnerManualBlocksFromCatalogue preserves user toggle even when system is removed', () => {
    // Create blocks with electric_propulsion system
    const originalBlocks = createOwnerManualBlocks(['electric_propulsion']);

    // Electric block should be included
    const electricBlock = originalBlocks.find(
      (b) => b.subchapterId === 'prop_electric'
    );
    expect(electricBlock?.included).toBe(true);

    // Now user toggles shore_power block to true manually
    const shorePowerBlock = originalBlocks.find((b) => b.subchapterId === 'elec_shore_power');
    expect(shorePowerBlock?.included).toBe(false); // Not in systems, so false

    const modifiedBlocks = originalBlocks.map((b) => {
      if (b.subchapterId === 'elec_shore_power') {
        return { ...b, included: true }; // User manually enabled it
      }
      return b;
    });

    // Run ensure with different systems (NO electric_propulsion)
    // Should NOT change shore_power back to false
    const ensured = ensureOwnerManualBlocksFromCatalogue(
      modifiedBlocks,
      ['diesel_propulsion'] // Different system
    );

    const ensuredShore = ensured.find((b) => b.subchapterId === 'elec_shore_power');
    // User's toggle preserved
    expect(ensuredShore?.included).toBe(true);

    // Electric was also user-set (by initial system), should be preserved
    const ensuredElectric = ensured.find((b) => b.subchapterId === 'prop_electric');
    expect(ensuredElectric?.included).toBe(true);
  });

  test('ensureOwnerManualBlocksFromCatalogue only sets included for NEW blocks', () => {
    // Start with partial blocks (missing some)
    const originalBlocks = createOwnerManualBlocks(['shore_power']);
    // Remove shore power block to simulate missing block
    const partialBlocks = originalBlocks.filter(
      (b) => b.subchapterId !== 'elec_shore_power'
    );

    // Ensure with shore_power system
    const ensured = ensureOwnerManualBlocksFromCatalogue(
      partialBlocks,
      ['shore_power']
    );

    // The shore power block should be created with included=true (because system matches)
    const shoreBlock = ensured.find((b) => b.subchapterId === 'elec_shore_power');
    expect(shoreBlock).toBeDefined();
    expect(shoreBlock?.included).toBe(true);
  });

  test('ensureOwnerManualTemplateBlocks preserves user toggles on template', async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();

    // Create project with no systems
    const project = await ProjectRepository.create({
      title: 'Test Project',
      clientId: 'test-client',
      type: 'NEW_BUILD',
    }, 'test-user');

    const ownerManual = project.documentTemplates?.find(
      (t) => t.type === 'DOC_OWNERS_MANUAL'
    );
    expect(ownerManual).toBeDefined();

    const draftVersion = getDraftVersion(ownerManual!);
    expect(draftVersion?.ownerManualBlocks).toBeDefined();

    // Find the electric propulsion block - should be included=false
    const electricBlock = draftVersion!.ownerManualBlocks!.find(
      (b) => b.subchapterId === 'prop_electric'
    );
    expect(electricBlock?.included).toBe(false);

    // User manually toggles electric to true
    const modifiedBlocks = draftVersion!.ownerManualBlocks!.map((b) => {
      if (b.subchapterId === 'prop_electric') {
        return { ...b, included: true };
      }
      return b;
    });

    const modifiedVersion = {
      ...draftVersion!,
      ownerManualBlocks: modifiedBlocks,
    };

    const modifiedTemplate = {
      ...ownerManual!,
      versions: [modifiedVersion],
    };

    // Now call ensureOwnerManualTemplateBlocks with electric_propulsion system
    const ensuredTemplate = ensureOwnerManualTemplateBlocks(
      modifiedTemplate,
      ['electric_propulsion']
    );

    const ensuredDraft = getDraftVersion(ensuredTemplate);
    const ensuredElectric = ensuredDraft?.ownerManualBlocks?.find(
      (b) => b.subchapterId === 'prop_electric'
    );

    // User toggle should be preserved
    expect(ensuredElectric?.included).toBe(true);
  });

  test('user content edits are preserved when systems change', () => {
    const originalBlocks = createOwnerManualBlocks(['shore_power']);

    // User edits the content of a block
    const modifiedBlocks = originalBlocks.map((b) => {
      if (b.subchapterId === 'elec_shore_power') {
        return { ...b, content: 'My custom shore power content' };
      }
      return b;
    });

    // Change systems - remove shore_power
    const ensured = ensureOwnerManualBlocksFromCatalogue(
      modifiedBlocks,
      ['electric_propulsion'] // Different system
    );

    const ensuredShore = ensured.find((b) => b.subchapterId === 'elec_shore_power');
    // Content should be preserved
    expect(ensuredShore?.content).toBe('My custom shore power content');
  });
});

// ============================================
// REFIT/MAINTENANCE PROJECTS
// ============================================

describe('VesselSystems - Project Type Handling', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('REFIT project can have systems but no Owner\'s Manual templates', async () => {
    const project = await ProjectRepository.create({
      title: 'Refit Project',
      clientId: 'test-client',
      type: 'REFIT',
      systems: ['electric_propulsion'],
    }, 'test-user');

    // Systems should be stored
    expect(project.systems).toBeDefined();
    expect(project.systems).toContain('electric_propulsion');

    // But no document templates
    expect(project.documentTemplates?.length || 0).toBe(0);
  });

  test('MAINTENANCE project can have systems', async () => {
    const project = await ProjectRepository.create({
      title: 'Maintenance Project',
      clientId: 'test-client',
      type: 'MAINTENANCE',
      systems: ['diesel_propulsion', 'fuel_system'],
    }, 'test-user');

    expect(project.systems).toBeDefined();
    expect(project.systems?.length).toBe(2);
  });
});

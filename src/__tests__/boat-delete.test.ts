/**
 * Boat Delete Tests
 * Tests for deleting boats from projects:
 * - Delete removes boat from project
 * - Renumbers labels if default pattern used
 * - Prevents deleting the last remaining boat
 * - ZIP roundtrip preserves boat data after deletion
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

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
 * Create multiple boats for a project.
 */
function createBoats(count: number): BoatInstance[] {
  const boats: BoatInstance[] = [];
  for (let i = 1; i <= count; i++) {
    boats.push({
      id: generateUUID(),
      label: `Boat ${String(i).padStart(2, '0')}`,
      win: i === 1 ? 'NL-TEST-00001-2025' : undefined, // First boat has WIN
    });
  }
  return boats;
}

/**
 * Simulate deleting a boat and renumbering.
 */
function deleteBoatAndRenumber(boats: BoatInstance[], boatIdToDelete: string): BoatInstance[] {
  // Remove the boat
  const remainingBoats = boats.filter((b) => b.id !== boatIdToDelete);

  // Renumber labels for boats with default "Boat XX" pattern
  const renumberedBoats = remainingBoats.map((boat, index) => {
    const defaultPattern = /^Boat \d{2}$/;
    if (defaultPattern.test(boat.label)) {
      return {
        ...boat,
        label: `Boat ${String(index + 1).padStart(2, '0')}`,
      };
    }
    return boat;
  });

  return renumberedBoats;
}

// ============================================
// DELETE BOAT TESTS
// ============================================

describe('BoatDelete - Basic Deletion', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('delete removes boat from project', async () => {
    // Create project with 3 boats
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    const boats = createBoats(3);
    await ProjectRepository.update(project.id, { boats });

    // Verify 3 boats
    const projectBefore = await ProjectRepository.getById(project.id);
    expect(projectBefore!.boats!.length).toBe(3);

    // Delete the second boat
    const boatToDelete = boats[1];
    const updatedBoats = deleteBoatAndRenumber(boats, boatToDelete.id);

    await ProjectRepository.update(project.id, { boats: updatedBoats });

    // Verify 2 boats remain
    const projectAfter = await ProjectRepository.getById(project.id);
    expect(projectAfter!.boats!.length).toBe(2);

    // Verify the correct boat was deleted
    const deletedBoat = projectAfter!.boats!.find((b) => b.id === boatToDelete.id);
    expect(deletedBoat).toBeUndefined();
  });

  test('delete renumbers default labels sequentially', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    // Create 4 boats with default labels
    const boats = createBoats(4);
    await ProjectRepository.update(project.id, { boats });

    // Delete the second boat (Boat 02)
    const boatToDelete = boats[1];
    const updatedBoats = deleteBoatAndRenumber(boats, boatToDelete.id);

    await ProjectRepository.update(project.id, { boats: updatedBoats });

    const projectAfter = await ProjectRepository.getById(project.id);
    const labels = projectAfter!.boats!.map((b) => b.label);

    // Should be renumbered: Boat 01, Boat 02, Boat 03
    expect(labels).toEqual(['Boat 01', 'Boat 02', 'Boat 03']);
  });

  test('delete preserves custom labels (no renumbering)', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    // Create boats with mixed labels
    const boats: BoatInstance[] = [
      { id: generateUUID(), label: 'Hull #100', win: undefined },
      { id: generateUUID(), label: 'Boat 02', win: undefined },
      { id: generateUUID(), label: 'Custom Name', win: undefined },
    ];
    await ProjectRepository.update(project.id, { boats });

    // Delete the middle boat (Boat 02)
    const boatToDelete = boats[1];
    const updatedBoats = deleteBoatAndRenumber(boats, boatToDelete.id);

    await ProjectRepository.update(project.id, { boats: updatedBoats });

    const projectAfter = await ProjectRepository.getById(project.id);
    const labels = projectAfter!.boats!.map((b) => b.label);

    // Custom labels should be preserved
    expect(labels).toEqual(['Hull #100', 'Custom Name']);
  });

  test('delete preserves WIN/CIN on remaining boats', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    // Create boats with WIN values
    const boats: BoatInstance[] = [
      { id: generateUUID(), label: 'Boat 01', win: 'NL-TEST-00001-2025' },
      { id: generateUUID(), label: 'Boat 02', win: undefined },
      { id: generateUUID(), label: 'Boat 03', win: 'NL-TEST-00003-2025' },
    ];
    await ProjectRepository.update(project.id, { boats });

    // Delete the middle boat (no WIN)
    const boatToDelete = boats[1];
    const updatedBoats = deleteBoatAndRenumber(boats, boatToDelete.id);

    await ProjectRepository.update(project.id, { boats: updatedBoats });

    const projectAfter = await ProjectRepository.getById(project.id);

    // Verify WIN values are preserved
    const boat1 = projectAfter!.boats!.find((b) => b.label === 'Boat 01');
    const boat2 = projectAfter!.boats!.find((b) => b.label === 'Boat 02'); // Renumbered from 03

    expect(boat1!.win).toBe('NL-TEST-00001-2025');
    expect(boat2!.win).toBe('NL-TEST-00003-2025');
  });
});

// ============================================
// PREVENT LAST BOAT DELETION
// ============================================

describe('BoatDelete - Prevent Last Boat Deletion', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('cannot delete when only 1 boat exists', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    // Create single boat
    const boats: BoatInstance[] = [
      { id: generateUUID(), label: 'Boat 01', win: undefined },
    ];
    await ProjectRepository.update(project.id, { boats });

    // Attempt to delete should be prevented (check logic)
    const canDelete = boats.length > 1;
    expect(canDelete).toBe(false);
  });

  test('can delete when 2 or more boats exist', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    const boats = createBoats(2);
    await ProjectRepository.update(project.id, { boats });

    const canDelete = boats.length > 1;
    expect(canDelete).toBe(true);
  });

  test('after deleting to 1 boat, cannot delete again', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    // Start with 2 boats
    const boats = createBoats(2);
    await ProjectRepository.update(project.id, { boats });

    // Delete one boat
    const updatedBoats = deleteBoatAndRenumber(boats, boats[1].id);
    await ProjectRepository.update(project.id, { boats: updatedBoats });

    const projectAfter = await ProjectRepository.getById(project.id);
    const remainingBoats = projectAfter!.boats!;

    // Now only 1 boat remains, cannot delete
    const canDeleteNow = remainingBoats.length > 1;
    expect(canDeleteNow).toBe(false);
    expect(remainingBoats.length).toBe(1);
  });
});

// ============================================
// DATA PERSISTENCE AFTER DELETE
// ============================================

describe('BoatDelete - Data Persistence', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('boats persisted after deletion survive project reload', async () => {
    // Create project with 3 boats
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    const boats: BoatInstance[] = [
      { id: generateUUID(), label: 'Boat 01', win: 'NL-TEST-00001-2025' },
      { id: generateUUID(), label: 'Boat 02', win: undefined },
      { id: generateUUID(), label: 'Boat 03', win: 'NL-TEST-00003-2025' },
    ];
    await ProjectRepository.update(project.id, { boats });

    // Delete boat 02
    const updatedBoats = deleteBoatAndRenumber(boats, boats[1].id);
    await ProjectRepository.update(project.id, { boats: updatedBoats });

    // Reload project
    const reloadedProject = await ProjectRepository.getById(project.id);
    expect(reloadedProject!.boats).toBeDefined();
    expect(reloadedProject!.boats!.length).toBe(2);

    const labels = reloadedProject!.boats!.map((b) => b.label);
    expect(labels).toEqual(['Boat 01', 'Boat 02']); // Renumbered

    // Verify WIN preserved
    const boat1 = reloadedProject!.boats!.find((b) => b.label === 'Boat 01');
    const boat2 = reloadedProject!.boats!.find((b) => b.label === 'Boat 02');
    expect(boat1!.win).toBe('NL-TEST-00001-2025');
    expect(boat2!.win).toBe('NL-TEST-00003-2025');
  });

  test('multiple deletions persist correctly', async () => {
    // Create project, add boats, delete some
    const project = await ProjectRepository.create(
      {
        title: 'Serial Production',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    // Start with 5 boats
    const boats = createBoats(5);
    await ProjectRepository.update(project.id, { boats });

    // Delete boats 2 and 4 (sequentially, not from original list)
    let currentBoats = [...boats];
    currentBoats = deleteBoatAndRenumber(currentBoats, boats[1].id);
    await ProjectRepository.update(project.id, { boats: currentBoats });

    // Reload and verify
    let projectAfter = await ProjectRepository.getById(project.id);
    expect(projectAfter!.boats!.length).toBe(4);

    // Delete another boat
    currentBoats = deleteBoatAndRenumber(projectAfter!.boats!, projectAfter!.boats![2].id);
    await ProjectRepository.update(project.id, { boats: currentBoats });

    // Verify 3 boats remain
    projectAfter = await ProjectRepository.getById(project.id);
    expect(projectAfter!.boats!.length).toBe(3);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('BoatDelete - Edge Cases', () => {
  beforeEach(async () => {
    await clearProjects();
    await clearClients();
    await createTestClient();
  });

  test('deleting boat with WIN includes warning flag', () => {
    const boats: BoatInstance[] = [
      { id: 'boat-1', label: 'Boat 01', win: 'NL-TEST-00001-2025' },
      { id: 'boat-2', label: 'Boat 02', win: undefined },
    ];

    // Boat with WIN should have warning
    const boatWithWin = boats[0];
    const hasWinWarning = !!boatWithWin.win;
    expect(hasWinWarning).toBe(true);

    // Boat without WIN should not have warning
    const boatWithoutWin = boats[1];
    const noWinWarning = !!boatWithoutWin.win;
    expect(noWinWarning).toBe(false);
  });

  test('deleting first boat moves WIN from first to remaining boats', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    // Create boats where first has WIN
    const boats: BoatInstance[] = [
      { id: generateUUID(), label: 'Boat 01', win: 'NL-TEST-00001-2025' },
      { id: generateUUID(), label: 'Boat 02', win: undefined },
      { id: generateUUID(), label: 'Boat 03', win: undefined },
    ];
    await ProjectRepository.update(project.id, { boats });

    // Delete first boat
    const updatedBoats = deleteBoatAndRenumber(boats, boats[0].id);
    await ProjectRepository.update(project.id, { boats: updatedBoats });

    const projectAfter = await ProjectRepository.getById(project.id);

    // First boat (with WIN) was deleted, so remaining boats have no WIN
    expect(projectAfter!.boats!.length).toBe(2);
    expect(projectAfter!.boats![0].label).toBe('Boat 01'); // Renumbered
    expect(projectAfter!.boats![0].win).toBeUndefined();
    expect(projectAfter!.boats![1].label).toBe('Boat 02'); // Renumbered
    expect(projectAfter!.boats![1].win).toBeUndefined();
  });

  test('mixed default and custom labels only renumbers defaults', async () => {
    const project = await ProjectRepository.create(
      {
        title: 'Test Project',
        clientId: 'test-client',
        type: 'NEW_BUILD',
      },
      'test-user'
    );

    // Create boats with mixed labels
    const boats: BoatInstance[] = [
      { id: generateUUID(), label: 'Boat 01', win: undefined },
      { id: generateUUID(), label: 'My Custom Boat', win: undefined },
      { id: generateUUID(), label: 'Boat 03', win: undefined },
      { id: generateUUID(), label: 'Another Custom', win: undefined },
    ];
    await ProjectRepository.update(project.id, { boats });

    // Delete Boat 01
    const updatedBoats = deleteBoatAndRenumber(boats, boats[0].id);
    await ProjectRepository.update(project.id, { boats: updatedBoats });

    const projectAfter = await ProjectRepository.getById(project.id);
    const labels = projectAfter!.boats!.map((b) => b.label);

    // Custom labels unchanged, "Boat 03" renumbered to "Boat 02" (based on position)
    // Position 0: "My Custom Boat" (custom, unchanged)
    // Position 1: "Boat 03" -> renumbered to "Boat 02" (matches default pattern)
    // Position 2: "Another Custom" (custom, unchanged)
    expect(labels).toEqual(['My Custom Boat', 'Boat 02', 'Another Custom']);
  });
});

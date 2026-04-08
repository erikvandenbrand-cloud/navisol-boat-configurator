/**
 * WIN Register Service - v4
 * Read-only registry of Watercraft Identification Numbers for NEW_BUILD projects
 * Now lists individual boats (serial production) rather than projects
 */

import type { Project, BoatInstance } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';
import { generateUUID } from '@/domain/models';

// ============================================
// TYPES
// ============================================

export interface WINRegisterEntry {
  // Boat info
  boatId: string;
  boatLabel: string;
  win: string | null; // null if not set

  // Project info
  projectId: string;
  projectNumber: string;
  projectTitle: string;
  boatModel: string | null; // derived from pinned boat model version name
  status: string;
  clientId: string;
  createdAt: string;
}

export interface WINRegisterFilters {
  search?: string; // filters by WIN, boat label, project number, project title, boat model
}

// ============================================
// MIGRATION / BACKWARD COMPATIBILITY
// ============================================

/**
 * Ensure a project has at least one boat instance.
 * Migrates legacy project.win to boats[0].win if needed.
 * Returns the migrated boats array (does NOT persist - caller must save if needed).
 */
export function ensureBoatInstances(project: Project): BoatInstance[] {
  // If project already has boats, use them
  if (project.boats && project.boats.length > 0) {
    // Check if legacy win should be migrated to first boat
    if (project.win && !project.boats[0].win) {
      return [
        { ...project.boats[0], win: project.win },
        ...project.boats.slice(1),
      ];
    }
    return project.boats;
  }

  // Create default Boat 01 for projects without boats
  const defaultBoat: BoatInstance = {
    id: generateUUID(),
    label: 'Boat 01',
    win: project.win || undefined, // Migrate legacy win if present
  };

  return [defaultBoat];
}

/**
 * Get boats for a project with migration applied (read-only, does not persist)
 */
export function getProjectBoats(project: Project): BoatInstance[] {
  return ensureBoatInstances(project);
}

// ============================================
// SELECTOR FUNCTIONS
// ============================================

/**
 * Get all NEW_BUILD boats with WIN data (one row per boat)
 * Sorted by WIN (if set), then by project created date descending for boats without WIN
 */
export async function getWINRegisterEntries(): Promise<WINRegisterEntry[]> {
  const projects = await ProjectRepository.getAll();

  // Filter to NEW_BUILD only and not archived
  const newBuildProjects = projects.filter(
    (p) => p.type === 'NEW_BUILD' && !p.archivedAt
  );

  // Map to WIN register entries (one per boat)
  const entries: WINRegisterEntry[] = [];

  for (const project of newBuildProjects) {
    const boats = getProjectBoats(project);
    const boatModel = deriveBoatModelName(project);

    for (const boat of boats) {
      entries.push({
        boatId: boat.id,
        boatLabel: boat.label,
        win: boat.win || null,
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectTitle: project.title,
        boatModel,
        status: project.status,
        clientId: project.clientId,
        createdAt: project.createdAt,
      });
    }
  }

  // Sort: entries with WIN first (alphabetically), then entries without WIN (by createdAt descending)
  return entries.sort((a, b) => {
    // Both have WIN - sort alphabetically
    if (a.win && b.win) {
      return a.win.localeCompare(b.win);
    }
    // Only a has WIN - a comes first
    if (a.win && !b.win) {
      return -1;
    }
    // Only b has WIN - b comes first
    if (!a.win && b.win) {
      return 1;
    }
    // Neither has WIN - sort by createdAt descending
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Filter WIN register entries by search term
 * Pure function for easy testing
 */
export function filterWINRegisterEntries(
  entries: WINRegisterEntry[],
  filters: WINRegisterFilters
): WINRegisterEntry[] {
  if (!filters.search || filters.search.trim() === '') {
    return entries;
  }

  const searchLower = filters.search.toLowerCase().trim();

  return entries.filter((entry) => {
    const matchesWIN = entry.win?.toLowerCase().includes(searchLower);
    const matchesBoatLabel = entry.boatLabel.toLowerCase().includes(searchLower);
    const matchesProjectNumber = entry.projectNumber.toLowerCase().includes(searchLower);
    const matchesTitle = entry.projectTitle.toLowerCase().includes(searchLower);
    const matchesBoatModel = entry.boatModel?.toLowerCase().includes(searchLower);

    return matchesWIN || matchesBoatLabel || matchesProjectNumber || matchesTitle || matchesBoatModel;
  });
}

/**
 * Get WIN register entries with filtering applied
 */
export async function getFilteredWINRegisterEntries(
  filters: WINRegisterFilters
): Promise<WINRegisterEntry[]> {
  const entries = await getWINRegisterEntries();
  return filterWINRegisterEntries(entries, filters);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Derive boat model name from project configuration
 * Uses first item name from configuration or boatModelVersionId as fallback
 */
function deriveBoatModelName(project: Project): string | null {
  // If there's a pinned boat model version ID, we know a model is configured
  if (project.configuration?.boatModelVersionId) {
    // Try to find the first configuration item (often the base model)
    const firstItem = project.configuration.items[0];
    if (firstItem) {
      return firstItem.name;
    }
    // Fallback to showing the version ID exists
    return 'Model configured';
  }

  return null;
}

/**
 * Get statistics for WIN register
 * Now counts boats instead of projects
 */
export async function getWINStatistics(): Promise<{
  totalNewBuildProjects: number;
  totalBoats: number;
  boatsWithWIN: number;
  boatsWithoutWIN: number;
}> {
  const entries = await getWINRegisterEntries();
  const projects = await ProjectRepository.getAll();
  const newBuildProjects = projects.filter(
    (p) => p.type === 'NEW_BUILD' && !p.archivedAt
  );

  const withWIN = entries.filter((e) => e.win !== null).length;

  return {
    totalNewBuildProjects: newBuildProjects.length,
    totalBoats: entries.length,
    boatsWithWIN: withWIN,
    boatsWithoutWIN: entries.length - withWIN,
  };
}

export const WINRegisterService = {
  getWINRegisterEntries,
  filterWINRegisterEntries,
  getFilteredWINRegisterEntries,
  getWINStatistics,
  ensureBoatInstances,
  getProjectBoats,
};

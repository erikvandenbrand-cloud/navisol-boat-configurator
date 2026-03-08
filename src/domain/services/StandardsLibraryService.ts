/**
 * Standards Library Service - v4
 * Manages the internal Standards Library.
 *
 * Standards are external in origin, but this library holds internal representations.
 * No external synchronization - all data is manually maintained.
 */

import type {
  Standard,
  CreateStandardInput,
  UpdateStandardInput,
} from '@/domain/models/standard';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { StandardsLibraryRepository } from '@/data/repositories/StandardsLibraryRepository';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// SEED DATA - Common CE Standards
// ============================================

const SEED_STANDARDS: CreateStandardInput[] = [
  {
    code: 'EN ISO 12217-1',
    title: 'Stability and buoyancy assessment and categorization - Part 1: Non-sailing boats of hull length ≥ 6 m',
    editionOrYear: '2015',
    isHarmonised: true,
    tags: ['stability', 'buoyancy', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 12217-2',
    title: 'Stability and buoyancy assessment and categorization - Part 2: Sailing boats of hull length ≥ 6 m',
    editionOrYear: '2015',
    isHarmonised: true,
    tags: ['stability', 'buoyancy', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 12217-3',
    title: 'Stability and buoyancy assessment and categorization - Part 3: Boats of hull length < 6 m',
    editionOrYear: '2015',
    isHarmonised: true,
    tags: ['stability', 'buoyancy', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 10087',
    title: 'Craft identification - Coding system',
    editionOrYear: '2019',
    isHarmonised: true,
    tags: ['hull', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 8666',
    title: 'Principal data',
    editionOrYear: '2020',
    isHarmonised: true,
    tags: ['general', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 11812',
    title: 'Watertight and quick-draining cockpits',
    editionOrYear: '2020',
    isHarmonised: true,
    tags: ['hull', 'buoyancy', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 12216',
    title: 'Windows, portlights, hatches, deadlights and doors - Strength and watertightness requirements',
    editionOrYear: '2020',
    isHarmonised: true,
    tags: ['hull', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 14509-1',
    title: 'Airborne sound emitted by powered recreational craft - Part 1: Measurement at operator position',
    editionOrYear: '2008',
    isHarmonised: true,
    tags: ['general', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 14946',
    title: 'Maximum load capacity',
    editionOrYear: '2015',
    isHarmonised: true,
    tags: ['stability', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 10240',
    title: "Owner's manual",
    editionOrYear: '2020',
    isHarmonised: true,
    tags: ['owner-manual', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 10088',
    title: 'Permanently installed fuel systems',
    editionOrYear: '2013',
    isHarmonised: true,
    tags: ['fuel', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 16147',
    title: 'Inboard diesel engines - Engine-mounted fuel and electrical components',
    editionOrYear: '2018',
    isHarmonised: true,
    tags: ['fuel', 'electrical', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 13297',
    title: 'Electrical systems - Alternating current installations',
    editionOrYear: '2014',
    isHarmonised: true,
    tags: ['electrical', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 10133',
    title: 'Electrical systems - Extra-low-voltage DC installations',
    editionOrYear: '2012',
    isHarmonised: true,
    tags: ['electrical', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 9094',
    title: 'Fire protection',
    editionOrYear: '2015',
    isHarmonised: true,
    tags: ['fire', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 10239',
    title: 'Liquefied petroleum gas (LPG) systems',
    editionOrYear: '2017',
    isHarmonised: true,
    tags: ['gas', 'fire', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 8849',
    title: 'Direct-current (DC) bilge pumps',
    editionOrYear: '2020',
    isHarmonised: true,
    tags: ['electrical', 'buoyancy', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 8847',
    title: 'Steering gear - Cable and pulley systems',
    editionOrYear: '2021',
    isHarmonised: true,
    tags: ['steering', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 8848',
    title: 'Steering gear - Remote steering systems',
    editionOrYear: '2020',
    isHarmonised: true,
    tags: ['steering', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
  {
    code: 'EN ISO 15084',
    title: 'Anchoring, mooring and towing - Strong points',
    editionOrYear: '2003',
    isHarmonised: true,
    tags: ['hull', 'doc'],
    sourceNote: 'EU Official Journal harmonised standard',
  },
];

// ============================================
// SERVICE
// ============================================

export const StandardsLibraryService = {
  /**
   * Get all standards from the library
   */
  async getAll(includeArchived = false): Promise<Standard[]> {
    return StandardsLibraryRepository.getAll(includeArchived);
  },

  /**
   * Get a standard by ID
   */
  async getById(id: string): Promise<Standard | null> {
    return StandardsLibraryRepository.getById(id);
  },

  /**
   * Get standards by IDs
   */
  async getByIds(ids: string[]): Promise<Standard[]> {
    return StandardsLibraryRepository.getByIds(ids);
  },

  /**
   * Search standards by code or title
   */
  async search(query: string): Promise<Standard[]> {
    return StandardsLibraryRepository.search(query);
  },

  /**
   * Get standards by tags
   */
  async getByTags(tags: string[]): Promise<Standard[]> {
    return StandardsLibraryRepository.getByTags(tags);
  },

  /**
   * Create a new standard
   */
  async create(
    input: CreateStandardInput,
    context: AuditContext
  ): Promise<Result<Standard, string>> {
    // Check for duplicate code
    const existing = await StandardsLibraryRepository.getAll();
    const duplicate = existing.find(
      (s) => s.code.toLowerCase() === input.code.toLowerCase()
    );
    if (duplicate) {
      return Err(`A standard with code "${input.code}" already exists`);
    }

    const standard: Standard = {
      id: generateUUID(),
      code: input.code.trim(),
      title: input.title.trim(),
      editionOrYear: input.editionOrYear?.trim(),
      sourceNote: input.sourceNote?.trim(),
      tags: input.tags,
      isHarmonised: input.isHarmonised,
      notes: input.notes?.trim(),
      archived: false,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await StandardsLibraryRepository.save(standard);

    await AuditService.log(
      context,
      'CREATE',
      'Standard',
      standard.id,
      `Created library standard: ${standard.code} - ${standard.title}`
    );

    return Ok(standard);
  },

  /**
   * Update an existing standard
   */
  async update(
    id: string,
    input: UpdateStandardInput,
    context: AuditContext
  ): Promise<Result<Standard, string>> {
    const existing = await StandardsLibraryRepository.getById(id);
    if (!existing) {
      return Err('Standard not found');
    }

    // Check for duplicate code if code is being changed
    if (input.code && input.code !== existing.code) {
      const all = await StandardsLibraryRepository.getAll(true);
      const duplicate = all.find(
        (s) => s.id !== id && s.code.toLowerCase() === input.code!.toLowerCase()
      );
      if (duplicate) {
        return Err(`A standard with code "${input.code}" already exists`);
      }
    }

    const updated: Standard = {
      ...existing,
      code: input.code?.trim() ?? existing.code,
      title: input.title?.trim() ?? existing.title,
      editionOrYear: input.editionOrYear?.trim() ?? existing.editionOrYear,
      sourceNote: input.sourceNote?.trim() ?? existing.sourceNote,
      tags: input.tags ?? existing.tags,
      isHarmonised: input.isHarmonised ?? existing.isHarmonised,
      notes: input.notes?.trim() ?? existing.notes,
      archived: input.archived ?? existing.archived,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await StandardsLibraryRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'Standard',
      id,
      `Updated library standard: ${updated.code}`
    );

    return Ok(updated);
  },

  /**
   * Archive a standard (soft delete)
   */
  async archive(id: string, context: AuditContext): Promise<Result<void, string>> {
    const existing = await StandardsLibraryRepository.getById(id);
    if (!existing) {
      return Err('Standard not found');
    }

    const updated: Standard = {
      ...existing,
      archived: true,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await StandardsLibraryRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'Standard',
      id,
      `Archived library standard: ${existing.code}`
    );

    return Ok(undefined);
  },

  /**
   * Unarchive a standard
   */
  async unarchive(id: string, context: AuditContext): Promise<Result<void, string>> {
    const existing = await StandardsLibraryRepository.getById(id);
    if (!existing) {
      return Err('Standard not found');
    }

    const updated: Standard = {
      ...existing,
      archived: false,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await StandardsLibraryRepository.save(updated);

    await AuditService.log(
      context,
      'UPDATE',
      'Standard',
      id,
      `Unarchived library standard: ${existing.code}`
    );

    return Ok(undefined);
  },

  /**
   * Delete a standard permanently
   */
  async delete(id: string, context: AuditContext): Promise<Result<void, string>> {
    const existing = await StandardsLibraryRepository.getById(id);
    if (!existing) {
      return Err('Standard not found');
    }

    await StandardsLibraryRepository.delete(id);

    await AuditService.log(
      context,
      'DELETE',
      'Standard',
      id,
      `Deleted library standard: ${existing.code}`
    );

    return Ok(undefined);
  },

  /**
   * Initialize the library with seed data if empty
   */
  async initializeSeedData(): Promise<void> {
    const count = await StandardsLibraryRepository.count();
    if (count > 0) {
      return; // Already has data
    }

    console.log('Seeding Standards Library with common CE standards...');

    for (const input of SEED_STANDARDS) {
      const standard: Standard = {
        id: generateUUID(),
        code: input.code,
        title: input.title,
        editionOrYear: input.editionOrYear,
        sourceNote: input.sourceNote,
        tags: input.tags,
        isHarmonised: input.isHarmonised,
        archived: false,
        createdAt: now(),
        updatedAt: now(),
        version: 0,
      };
      await StandardsLibraryRepository.save(standard);
    }

    console.log(`Seeded ${SEED_STANDARDS.length} standards into the library.`);
  },

  /**
   * Get count of standards
   */
  async count(): Promise<number> {
    return StandardsLibraryRepository.count();
  },
};

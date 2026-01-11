/**
 * Staff Repository - v4
 * Simple CRUD for global staff list.
 * Stored in LocalStorage alongside other entities.
 */

import type { StaffMember, CreateStaffInput, UpdateStaffInput } from '@/domain/models';
import { generateUUID, now } from '@/domain/models';
import { getAdapter } from '@/data/persistence';

const NAMESPACE = 'staff';

export const StaffRepository = {
  /**
   * Get all staff members (active and inactive)
   */
  async getAll(): Promise<StaffMember[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<StaffMember>(NAMESPACE);
    // Sort by name
    return all.sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Get only active staff members
   */
  async getActive(): Promise<StaffMember[]> {
    const all = await this.getAll();
    return all.filter((s) => s.isActive);
  },

  /**
   * Get a staff member by ID
   */
  async getById(id: string): Promise<StaffMember | null> {
    const adapter = getAdapter();
    return adapter.getById<StaffMember>(NAMESPACE, id);
  },

  /**
   * Find staff member by name (case-insensitive)
   */
  async findByName(name: string): Promise<StaffMember | null> {
    const all = await this.getAll();
    const lowerName = name.toLowerCase().trim();
    return all.find((s) => s.name.toLowerCase() === lowerName) || null;
  },

  /**
   * Create a new staff member
   */
  async create(input: CreateStaffInput): Promise<StaffMember> {
    const adapter = getAdapter();

    const staff: StaffMember = {
      id: generateUUID(),
      name: input.name.trim(),
      label: input.label?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NAMESPACE, staff);
    return staff;
  },

  /**
   * Update an existing staff member
   */
  async update(id: string, input: UpdateStaffInput): Promise<StaffMember | null> {
    const adapter = getAdapter();
    const existing = await this.getById(id);

    if (!existing) return null;

    const updated: StaffMember = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      label: input.label !== undefined ? (input.label?.trim() || undefined) : existing.label,
      notes: input.notes !== undefined ? (input.notes?.trim() || undefined) : existing.notes,
      isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await adapter.save(NAMESPACE, updated);
    return updated;
  },

  /**
   * Delete a staff member (hard delete)
   */
  async delete(id: string): Promise<boolean> {
    const adapter = getAdapter();
    const existing = await this.getById(id);
    if (!existing) return false;

    await adapter.delete(NAMESPACE, id);
    return true;
  },

  /**
   * Deactivate a staff member (soft delete)
   */
  async deactivate(id: string): Promise<StaffMember | null> {
    return this.update(id, { isActive: false });
  },

  /**
   * Reactivate a staff member
   */
  async reactivate(id: string): Promise<StaffMember | null> {
    return this.update(id, { isActive: true });
  },

  /**
   * Count staff members
   */
  async count(): Promise<number> {
    const adapter = getAdapter();
    return adapter.count(NAMESPACE);
  },

  /**
   * Search staff by name or label
   */
  async search(query: string): Promise<StaffMember[]> {
    const all = await this.getAll();
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) return all;

    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.label?.toLowerCase().includes(lowerQuery)
    );
  },
};

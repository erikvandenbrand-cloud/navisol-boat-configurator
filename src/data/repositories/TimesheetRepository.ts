/**
 * Timesheet Repository - v4
 * LocalStorage persistence for timesheet entries
 */

import type { TimesheetEntry, CreateTimesheetEntryInput, UpdateTimesheetEntryInput } from '@/domain/models';
import { generateUUID, now } from '@/domain/models';
import { getAdapter } from '@/data/persistence';

const NAMESPACE = 'timesheets';

export const TimesheetRepository = {
  /**
   * Get all timesheet entries
   */
  async getAll(): Promise<TimesheetEntry[]> {
    const adapter = getAdapter();
    return adapter.getAll<TimesheetEntry>(NAMESPACE);
  },

  /**
   * Get timesheet entry by ID
   */
  async getById(id: string): Promise<TimesheetEntry | null> {
    const adapter = getAdapter();
    return adapter.getById<TimesheetEntry>(NAMESPACE, id);
  },

  /**
   * Get entries for a specific user
   */
  async getByUser(userId: string): Promise<TimesheetEntry[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<TimesheetEntry>(NAMESPACE);
    return all
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  /**
   * Get entries for a specific project
   */
  async getByProject(projectId: string): Promise<TimesheetEntry[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<TimesheetEntry>(NAMESPACE);
    return all
      .filter((e) => e.projectId === projectId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  /**
   * Get entries for a date range (inclusive)
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<TimesheetEntry[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<TimesheetEntry>(NAMESPACE);
    return all
      .filter((e) => {
        const inRange = e.date >= startDate && e.date <= endDate;
        const matchesUser = !userId || e.userId === userId;
        return inRange && matchesUser;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Create a new timesheet entry
   */
  async create(
    input: CreateTimesheetEntryInput,
    userId: string,
    userName: string
  ): Promise<TimesheetEntry> {
    const adapter = getAdapter();
    const timestamp = now();

    const entry: TimesheetEntry = {
      id: generateUUID(),
      userId,
      userName,
      date: input.date,
      hours: input.hours,
      projectId: input.projectId,
      taskId: input.taskId,
      billable: input.billable,
      billingRate: input.billable ? input.billingRate : undefined,
      note: input.note,
      createdAt: timestamp,
      createdBy: userId,
      updatedAt: timestamp,
      version: 1,
    };

    await adapter.save(NAMESPACE, entry);
    return entry;
  },

  /**
   * Update a timesheet entry
   */
  async update(
    id: string,
    updates: UpdateTimesheetEntryInput,
    userId: string
  ): Promise<TimesheetEntry | null> {
    const adapter = getAdapter();
    const existing = await adapter.getById<TimesheetEntry>(NAMESPACE, id);

    if (!existing) return null;

    // If billable is being set to false, clear billingRate
    let billingRate = updates.billingRate ?? existing.billingRate;
    if (updates.billable === false) {
      billingRate = undefined;
    }

    const updated: TimesheetEntry = {
      ...existing,
      ...updates,
      billingRate,
      updatedAt: now(),
      updatedBy: userId,
      version: existing.version + 1,
    };

    await adapter.save(NAMESPACE, updated);
    return updated;
  },

  /**
   * Delete a timesheet entry
   */
  async delete(id: string): Promise<boolean> {
    const adapter = getAdapter();
    await adapter.delete(NAMESPACE, id);
    return true;
  },

  /**
   * Delete all entries (for testing/reset)
   */
  async deleteAll(): Promise<void> {
    const adapter = getAdapter();
    const all = await adapter.getAll<TimesheetEntry>(NAMESPACE);
    for (const entry of all) {
      await adapter.delete(NAMESPACE, entry.id);
    }
  },

  /**
   * Get total hours for a user in a date range
   */
  async getTotalHours(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const entries = await this.getByDateRange(startDate, endDate, userId);
    return entries.reduce((sum, e) => sum + e.hours, 0);
  },

  /**
   * Import entries (for ZIP import)
   */
  async importEntries(entries: TimesheetEntry[]): Promise<number> {
    const adapter = getAdapter();
    let imported = 0;

    for (const entry of entries) {
      const existing = await adapter.getById<TimesheetEntry>(NAMESPACE, entry.id);
      if (!existing) {
        await adapter.save(NAMESPACE, entry);
        imported++;
      } else if (entry.version > existing.version) {
        await adapter.save(NAMESPACE, entry);
        imported++;
      }
    }

    return imported;
  },
};

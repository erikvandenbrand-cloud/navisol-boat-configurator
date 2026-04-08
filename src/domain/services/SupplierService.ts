/**
 * Supplier Service - v4 (Patch 7)
 * Manages suppliers for order items.
 *
 * ============================================
 * GOVERNANCE: INTENT LOCK — SIMPLE MASTER DATA
 * ============================================
 * Suppliers are simple master data with just a name.
 * - No contacts, addresses, or extended info
 * - No automatic linking or suggestions
 * - Only authorized users (ADMIN, OFFICE) can create/delete suppliers
 */

import type { Supplier, CreateSupplierInput } from '@/domain/models/order-item';
import { canEditSupplier } from '@/domain/models/order-item';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { getAdapter } from '@/data/persistence';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { SettingsService } from './SettingsService';

// ============================================
// REPOSITORY
// ============================================

const SUPPLIER_NAMESPACE = 'suppliers';

const SupplierRepository = {
  async getAll(): Promise<Supplier[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<Supplier>(SUPPLIER_NAMESPACE);
    return all.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getById(id: string): Promise<Supplier | null> {
    const adapter = getAdapter();
    return adapter.getById<Supplier>(SUPPLIER_NAMESPACE, id);
  },

  async getByName(name: string): Promise<Supplier | null> {
    const all = await this.getAll();
    const normalized = name.toLowerCase().trim();
    return all.find((s) => s.name.toLowerCase() === normalized) || null;
  },

  async save(supplier: Supplier): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(SUPPLIER_NAMESPACE, supplier);
  },

  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(SUPPLIER_NAMESPACE, id);
  },
};

// ============================================
// SERVICE
// ============================================

export const SupplierService = {
  /**
   * Get all suppliers
   */
  async getAll(): Promise<Supplier[]> {
    return SupplierRepository.getAll();
  },

  /**
   * Get supplier by ID
   */
  async getById(id: string): Promise<Supplier | null> {
    return SupplierRepository.getById(id);
  },

  /**
   * Get supplier by name (case-insensitive)
   */
  async getByName(name: string): Promise<Supplier | null> {
    return SupplierRepository.getByName(name);
  },

  /**
   * Check if user can manage suppliers
   */
  canManageSuppliers(context: AuditContext, userRole: string): boolean {
    return canEditSupplier(userRole);
  },

  /**
   * Create a new supplier.
   * Only authorized users can create suppliers.
   */
  async create(
    input: CreateSupplierInput,
    context: AuditContext,
    userRole: string
  ): Promise<Result<Supplier, string>> {
    // Permission check
    if (!canEditSupplier(userRole)) {
      return Err('You do not have permission to create suppliers');
    }

    // Validate name
    const name = input.name?.trim();
    if (!name) {
      return Err('Supplier name is required');
    }

    // Check for duplicate (case-insensitive)
    const existing = await SupplierRepository.getByName(name);
    if (existing) {
      return Err(`Supplier "${name}" already exists`);
    }

    const supplier: Supplier = {
      id: generateUUID(),
      createdAt: now(),
      updatedAt: now(),
      version: 0,
      name,
    };

    await SupplierRepository.save(supplier);

    await AuditService.log(
      context,
      'CREATE',
      'Supplier',
      supplier.id,
      `Created supplier: ${supplier.name}`
    );

    return Ok(supplier);
  },

  /**
   * Delete a supplier.
   * Only authorized users can delete suppliers.
   */
  async delete(
    id: string,
    context: AuditContext,
    userRole: string
  ): Promise<Result<void, string>> {
    // Permission check
    if (!canEditSupplier(userRole)) {
      return Err('You do not have permission to delete suppliers');
    }

    const existing = await SupplierRepository.getById(id);
    if (!existing) {
      return Err('Supplier not found');
    }

    await SupplierRepository.delete(id);

    await AuditService.log(
      context,
      'DELETE',
      'Supplier',
      id,
      `Deleted supplier: ${existing.name}`
    );

    return Ok(undefined);
  },

  /**
   * Initialize default suppliers - only runs once, even if data is deleted
   */
  async initializeDefaults(context: AuditContext): Promise<void> {
    // Check the persistent initialization flag
    const alreadyInitialized = await SettingsService.hasInitialized('defaultSuppliers');
    if (alreadyInitialized) return;

    // Check if data exists (for backward compatibility)
    const existing = await SupplierRepository.getAll();
    if (existing.length > 0) {
      await SettingsService.markInitialized('defaultSuppliers');
      return;
    }

    // Add some example suppliers
    const defaults = [
      'Torqeedo',
      'Victron Energy',
      'Mastervolt',
      'Garmin',
      'Raymarine',
      'Lewmar',
      'Harken',
      'Vetus',
    ];

    for (const name of defaults) {
      const supplier: Supplier = {
        id: generateUUID(),
        createdAt: now(),
        updatedAt: now(),
        version: 0,
        name,
      };
      await SupplierRepository.save(supplier);
    }

    // Mark as initialized so deleted data won't be re-seeded
    await SettingsService.markInitialized('defaultSuppliers');
  },
};

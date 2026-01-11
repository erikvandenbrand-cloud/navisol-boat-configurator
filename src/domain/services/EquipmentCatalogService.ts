/**
 * Equipment Catalog Service - v4
 * Manages equipment catalog items in the library
 */

import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { getAdapter } from '@/data/persistence';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// TYPES
// ============================================

export interface EquipmentCatalogItem {
  id: string;
  articleNumber: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;

  // Pricing
  listPriceExclVat: number;
  costPrice?: number;

  // Supplier
  supplier?: string;
  supplierArticleNumber?: string;
  leadTimeDays?: number;

  // Flags
  ceRelevant: boolean;
  safetyCritical: boolean;
  isActive: boolean;

  // Unit
  unit: string;

  createdAt: string;
  createdBy: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface CreateEquipmentItemInput {
  articleNumber: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  listPriceExclVat: number;
  costPrice?: number;
  supplier?: string;
  supplierArticleNumber?: string;
  leadTimeDays?: number;
  ceRelevant?: boolean;
  safetyCritical?: boolean;
  unit?: string;
}

export interface UpdateEquipmentItemInput {
  articleNumber?: string;
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  listPriceExclVat?: number;
  costPrice?: number;
  supplier?: string;
  supplierArticleNumber?: string;
  leadTimeDays?: number;
  ceRelevant?: boolean;
  safetyCritical?: boolean;
  unit?: string;
  isActive?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

export const EQUIPMENT_CATEGORIES = [
  'Hull',
  'Propulsion',
  'Navigation',
  'Safety',
  'Comfort',
  'Electronics',
  'Deck Equipment',
  'Interior',
  'Exterior',
  'Electrical',
  'Plumbing',
  'Other',
];

// ============================================
// REPOSITORY
// ============================================

const NAMESPACE = 'library_equipment_catalog';

const EquipmentRepository = {
  async getAll(): Promise<EquipmentCatalogItem[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<EquipmentCatalogItem>(NAMESPACE);
    return all.filter(item => !item.archivedAt).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
  },

  async getById(id: string): Promise<EquipmentCatalogItem | null> {
    const adapter = getAdapter();
    return adapter.getById<EquipmentCatalogItem>(NAMESPACE, id);
  },

  async getByCategory(category: string): Promise<EquipmentCatalogItem[]> {
    const all = await this.getAll();
    return all.filter(item => item.category === category);
  },

  async search(query: string): Promise<EquipmentCatalogItem[]> {
    const all = await this.getAll();
    const lowerQuery = query.toLowerCase();
    return all.filter(
      item =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.articleNumber.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery)
    );
  },

  async save(item: EquipmentCatalogItem): Promise<void> {
    const adapter = getAdapter();
    await adapter.save(NAMESPACE, item);
  },

  async count(): Promise<number> {
    const adapter = getAdapter();
    return adapter.count(NAMESPACE);
  },
};

// ============================================
// SERVICE
// ============================================

export const EquipmentCatalogService = {
  /**
   * Get all active equipment items
   */
  async getAll(): Promise<EquipmentCatalogItem[]> {
    return EquipmentRepository.getAll();
  },

  /**
   * Get equipment item by ID
   */
  async getById(id: string): Promise<EquipmentCatalogItem | null> {
    return EquipmentRepository.getById(id);
  },

  /**
   * Get items by category
   */
  async getByCategory(category: string): Promise<EquipmentCatalogItem[]> {
    return EquipmentRepository.getByCategory(category);
  },

  /**
   * Search equipment items
   */
  async search(query: string): Promise<EquipmentCatalogItem[]> {
    return EquipmentRepository.search(query);
  },

  /**
   * Get category summary (count per category)
   */
  async getCategorySummary(): Promise<{ category: string; count: number }[]> {
    const all = await EquipmentRepository.getAll();
    const counts = new Map<string, number>();

    for (const item of all) {
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * Create a new equipment item
   */
  async create(
    input: CreateEquipmentItemInput,
    context: AuditContext
  ): Promise<Result<EquipmentCatalogItem, string>> {
    // Check for duplicate article number
    const existing = await EquipmentRepository.getAll();
    if (existing.some(item => item.articleNumber === input.articleNumber)) {
      return Err('Article number already exists');
    }

    const item: EquipmentCatalogItem = {
      id: generateUUID(),
      articleNumber: input.articleNumber,
      name: input.name,
      description: input.description,
      category: input.category,
      subcategory: input.subcategory,
      listPriceExclVat: input.listPriceExclVat,
      costPrice: input.costPrice,
      supplier: input.supplier,
      supplierArticleNumber: input.supplierArticleNumber,
      leadTimeDays: input.leadTimeDays,
      ceRelevant: input.ceRelevant || false,
      safetyCritical: input.safetyCritical || false,
      isActive: true,
      unit: input.unit || 'pcs',
      createdAt: now(),
      createdBy: context.userId,
      updatedAt: now(),
    };

    await EquipmentRepository.save(item);

    await AuditService.logCreate(context, 'EquipmentCatalogItem', item.id, {
      articleNumber: input.articleNumber,
      name: input.name,
      category: input.category,
    });

    return Ok(item);
  },

  /**
   * Update an equipment item
   */
  async update(
    id: string,
    updates: UpdateEquipmentItemInput,
    context: AuditContext
  ): Promise<Result<EquipmentCatalogItem, string>> {
    const item = await EquipmentRepository.getById(id);
    if (!item) return Err('Equipment item not found');

    // Check for duplicate article number if changing
    if (updates.articleNumber && updates.articleNumber !== item.articleNumber) {
      const existing = await EquipmentRepository.getAll();
      if (existing.some(i => i.articleNumber === updates.articleNumber && i.id !== id)) {
        return Err('Article number already exists');
      }
    }

    const updated: EquipmentCatalogItem = {
      ...item,
      ...updates,
      updatedAt: now(),
    };

    await EquipmentRepository.save(updated);

    await AuditService.logUpdate(
      context,
      'EquipmentCatalogItem',
      id,
      item as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>
    );

    return Ok(updated);
  },

  /**
   * Archive an equipment item (soft delete)
   */
  async archive(
    id: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const item = await EquipmentRepository.getById(id);
    if (!item) return Err('Equipment item not found');

    const archived: EquipmentCatalogItem = {
      ...item,
      archivedAt: now(),
      updatedAt: now(),
    };

    await EquipmentRepository.save(archived);

    await AuditService.log(
      context,
      'UPDATE',
      'EquipmentCatalogItem',
      id,
      `Archived equipment: ${item.name}`
    );

    return Ok(undefined);
  },

  /**
   * Initialize default equipment if none exist
   */
  async initializeDefaults(context: AuditContext): Promise<void> {
    const count = await EquipmentRepository.count();
    if (count > 0) return;

    const defaults: CreateEquipmentItemInput[] = [
      // Propulsion
      { articleNumber: 'EM-20', name: 'Electric Motor 20kW', category: 'Propulsion', listPriceExclVat: 18500, costPrice: 12000, supplier: 'Torqeedo', ceRelevant: true, safetyCritical: true },
      { articleNumber: 'EM-40', name: 'Electric Motor 40kW', category: 'Propulsion', listPriceExclVat: 35000, costPrice: 24000, supplier: 'Torqeedo', ceRelevant: true, safetyCritical: true },
      { articleNumber: 'BAT-40', name: 'Battery Pack 40kWh', category: 'Propulsion', listPriceExclVat: 28000, costPrice: 19200, supplier: 'Super B', ceRelevant: true, safetyCritical: true },
      { articleNumber: 'BAT-80', name: 'Battery Pack 80kWh', category: 'Propulsion', listPriceExclVat: 45000, costPrice: 38400, supplier: 'Super B', ceRelevant: true, safetyCritical: true },
      { articleNumber: 'CHG-11', name: 'Shore Charger 11kW', category: 'Propulsion', listPriceExclVat: 2800, costPrice: 1800, supplier: 'Victron', ceRelevant: true },
      { articleNumber: 'CHG-22', name: 'Shore Charger 22kW', category: 'Propulsion', listPriceExclVat: 4200, costPrice: 2800, supplier: 'Victron', ceRelevant: true },

      // Navigation
      { articleNumber: 'NAV-AX9', name: 'Raymarine Axiom+ 9" Display', category: 'Navigation', listPriceExclVat: 2800, costPrice: 2200, supplier: 'Raymarine' },
      { articleNumber: 'NAV-AX12', name: 'Raymarine Axiom+ 12" Display', category: 'Navigation', listPriceExclVat: 4200, costPrice: 3400, supplier: 'Raymarine' },
      { articleNumber: 'NAV-VHF', name: 'VHF Radio with DSC', category: 'Navigation', listPriceExclVat: 650, costPrice: 420, supplier: 'Raymarine', safetyCritical: true },
      { articleNumber: 'NAV-AIS', name: 'AIS Transceiver Class B', category: 'Navigation', listPriceExclVat: 1200, costPrice: 850, supplier: 'Raymarine', safetyCritical: true },

      // Safety
      { articleNumber: 'SAF-LJ4', name: 'Life Jacket Set (4 pcs)', category: 'Safety', listPriceExclVat: 480, costPrice: 380, supplier: 'Secumar', ceRelevant: true, safetyCritical: true },
      { articleNumber: 'SAF-LJ6', name: 'Life Jacket Set (6 pcs)', category: 'Safety', listPriceExclVat: 720, costPrice: 570, supplier: 'Secumar', ceRelevant: true, safetyCritical: true },
      { articleNumber: 'SAF-FE2', name: 'Fire Extinguisher 2kg', category: 'Safety', listPriceExclVat: 95, costPrice: 65, supplier: 'Gloria', ceRelevant: true, safetyCritical: true },
      { articleNumber: 'SAF-FAK', name: 'First Aid Kit Marine', category: 'Safety', listPriceExclVat: 85, costPrice: 55, safetyCritical: true },
      { articleNumber: 'SAF-BLG', name: 'Bilge Pump Automatic', category: 'Safety', listPriceExclVat: 280, costPrice: 180, supplier: 'Rule', ceRelevant: true, safetyCritical: true },

      // Comfort
      { articleNumber: 'CMF-FRG', name: 'Refrigerator 65L', category: 'Comfort', listPriceExclVat: 1450, costPrice: 980, supplier: 'Isotherm' },
      { articleNumber: 'CMF-BBQ', name: 'Gas BBQ with Mount', category: 'Comfort', listPriceExclVat: 680, costPrice: 450, supplier: 'Magma' },
      { articleNumber: 'CMF-SND', name: 'Fusion Audio System', category: 'Comfort', listPriceExclVat: 1200, costPrice: 850, supplier: 'Fusion' },
      { articleNumber: 'CMF-SPK', name: 'Cockpit Speakers (pair)', category: 'Comfort', listPriceExclVat: 320, costPrice: 220, supplier: 'JBL' },

      // Deck Equipment
      { articleNumber: 'DEC-ANC', name: 'Anchor Windlass Electric', category: 'Deck Equipment', listPriceExclVat: 2400, costPrice: 1650, supplier: 'Lewmar' },
      { articleNumber: 'DEC-BWS', name: 'Bow Thruster 3kW', category: 'Deck Equipment', listPriceExclVat: 3800, costPrice: 2600, supplier: 'Vetus', ceRelevant: true },
      { articleNumber: 'DEC-SWM', name: 'Swim Platform Teak', category: 'Deck Equipment', listPriceExclVat: 4500, costPrice: 3200, supplier: 'Custom' },
      { articleNumber: 'DEC-SNR', name: 'Sunroof Electric', category: 'Deck Equipment', listPriceExclVat: 6800, costPrice: 4800, supplier: 'Webasto' },

      // Electronics
      { articleNumber: 'ELC-INV', name: 'Inverter 3000W', category: 'Electronics', listPriceExclVat: 1800, costPrice: 1200, supplier: 'Victron' },
      { articleNumber: 'ELC-BMS', name: 'Battery Monitor', category: 'Electronics', listPriceExclVat: 450, costPrice: 320, supplier: 'Victron' },
    ];

    for (const input of defaults) {
      await this.create(input, context);
    }
  },
};

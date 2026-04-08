/**
 * Production Procedure Repository - v4
 * Persistence for production procedures and their versions
 */

import type {
  ProductionProcedure,
  ProductionProcedureVersion,
  TaskSetTemplate,
  CreateProductionProcedureInput,
} from '@/domain/models';
import { generateUUID, now } from '@/domain/models';
import { getAdapter } from '@/data/persistence';

// Namespaces
const NS_PROCEDURES = 'library_production_procedures';
const NS_PROCEDURE_VERSIONS = 'library_production_procedure_versions';

// ============================================
// PRODUCTION PROCEDURE REPOSITORY
// ============================================

export const ProductionProcedureRepository = {
  // ============================================
  // PROCEDURE CRUD
  // ============================================

  async getAll(): Promise<ProductionProcedure[]> {
    const adapter = getAdapter();
    return adapter.getAll<ProductionProcedure>(NS_PROCEDURES);
  },

  async getById(id: string): Promise<ProductionProcedure | null> {
    const adapter = getAdapter();
    return adapter.getById<ProductionProcedure>(NS_PROCEDURES, id);
  },

  async create(input: CreateProductionProcedureInput): Promise<ProductionProcedure> {
    const adapter = getAdapter();

    const procedure: ProductionProcedure = {
      id: generateUUID(),
      name: input.name,
      description: input.description,
      category: input.category,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NS_PROCEDURES, procedure);
    return procedure;
  },

  async update(
    id: string,
    input: Partial<Pick<ProductionProcedure, 'name' | 'description' | 'category' | 'currentVersionId'>>
  ): Promise<ProductionProcedure | null> {
    const adapter = getAdapter();
    const existing = await adapter.getById<ProductionProcedure>(NS_PROCEDURES, id);
    if (!existing) return null;

    const updated: ProductionProcedure = {
      ...existing,
      ...input,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await adapter.save(NS_PROCEDURES, updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const adapter = getAdapter();

    // Delete all versions first
    const versions = await this.getVersions(id);
    for (const version of versions) {
      await adapter.delete(NS_PROCEDURE_VERSIONS, version.id);
    }

    // Delete procedure
    await adapter.delete(NS_PROCEDURES, id);
  },

  // ============================================
  // VERSION MANAGEMENT
  // ============================================

  async getVersions(procedureId: string): Promise<ProductionProcedureVersion[]> {
    const adapter = getAdapter();
    return adapter.query<ProductionProcedureVersion>(NS_PROCEDURE_VERSIONS, {
      where: { procedureId },
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  },

  async getVersion(versionId: string): Promise<ProductionProcedureVersion | null> {
    const adapter = getAdapter();
    return adapter.getById<ProductionProcedureVersion>(NS_PROCEDURE_VERSIONS, versionId);
  },

  async getCurrentVersion(procedureId: string): Promise<ProductionProcedureVersion | null> {
    const procedure = await this.getById(procedureId);
    if (!procedure?.currentVersionId) return null;
    return this.getVersion(procedure.currentVersionId);
  },

  async getApprovedVersions(): Promise<ProductionProcedureVersion[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<ProductionProcedureVersion>(NS_PROCEDURE_VERSIONS);
    return all.filter((v) => v.status === 'APPROVED');
  },

  async createVersion(
    procedureId: string,
    versionLabel: string,
    taskSets: TaskSetTemplate[],
    applicableModelIds: string[],
    createdBy: string
  ): Promise<ProductionProcedureVersion> {
    const adapter = getAdapter();

    const version: ProductionProcedureVersion = {
      id: generateUUID(),
      procedureId,
      versionLabel,
      status: 'DRAFT',
      taskSets,
      applicableModelIds,
      createdBy,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NS_PROCEDURE_VERSIONS, version);
    return version;
  },

  async updateVersion(
    versionId: string,
    updates: Partial<Pick<ProductionProcedureVersion, 'taskSets' | 'applicableModelIds'>>
  ): Promise<ProductionProcedureVersion | null> {
    const adapter = getAdapter();
    const existing = await adapter.getById<ProductionProcedureVersion>(NS_PROCEDURE_VERSIONS, versionId);
    if (!existing) return null;

    if (existing.status !== 'DRAFT') {
      return null; // Cannot update non-draft versions
    }

    const updated: ProductionProcedureVersion = {
      ...existing,
      ...updates,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await adapter.save(NS_PROCEDURE_VERSIONS, updated);
    return updated;
  },

  async approveVersion(versionId: string, approvedBy: string): Promise<ProductionProcedureVersion | null> {
    const adapter = getAdapter();
    const version = await adapter.getById<ProductionProcedureVersion>(NS_PROCEDURE_VERSIONS, versionId);
    if (!version) return null;

    if (version.status !== 'DRAFT') {
      return null;
    }

    const approved: ProductionProcedureVersion = {
      ...version,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy,
      updatedAt: now(),
      version: version.version + 1,
    };

    await adapter.save(NS_PROCEDURE_VERSIONS, approved);

    // Set as current version on procedure
    await this.update(version.procedureId, { currentVersionId: versionId });

    return approved;
  },

  async deprecateVersion(versionId: string): Promise<ProductionProcedureVersion | null> {
    const adapter = getAdapter();
    const version = await adapter.getById<ProductionProcedureVersion>(NS_PROCEDURE_VERSIONS, versionId);
    if (!version) return null;

    const deprecated: ProductionProcedureVersion = {
      ...version,
      status: 'DEPRECATED',
      updatedAt: now(),
      version: version.version + 1,
    };

    await adapter.save(NS_PROCEDURE_VERSIONS, deprecated);
    return deprecated;
  },
};

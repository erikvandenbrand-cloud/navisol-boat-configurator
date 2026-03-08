/**
 * Library Repository - v4
 * Persistence for Library entities (boat models, catalogs, templates)
 */

import type {
  LibraryBoatModel,
  BoatModelVersion,
  LibraryCatalog,
  CatalogVersion,
  CatalogItem,
  LibraryDocumentTemplate,
  TemplateVersion,
  LibraryProcedure,
  ProcedureVersion,
  VersionStatus,
} from '@/domain/models';
import { generateUUID, now } from '@/domain/models';
import { getAdapter } from '@/data/persistence';

// Namespaces
const NS_BOAT_MODELS = 'library_boat_models';
const NS_BOAT_MODEL_VERSIONS = 'library_boat_model_versions';
const NS_CATALOGS = 'library_catalogs';
const NS_CATALOG_VERSIONS = 'library_catalog_versions';
const NS_TEMPLATES = 'library_templates';
const NS_TEMPLATE_VERSIONS = 'library_template_versions';

// ============================================
// BOAT MODELS
// ============================================

export const BoatModelRepository = {
  async getAll(): Promise<LibraryBoatModel[]> {
    const adapter = getAdapter();
    return adapter.getAll<LibraryBoatModel>(NS_BOAT_MODELS);
  },

  async getById(id: string): Promise<LibraryBoatModel | null> {
    const adapter = getAdapter();
    return adapter.getById<LibraryBoatModel>(NS_BOAT_MODELS, id);
  },

  async create(input: {
    name: string;
    range: string;
    description?: string;
    imageUrl?: string;
  }): Promise<LibraryBoatModel> {
    const adapter = getAdapter();

    const model: LibraryBoatModel = {
      id: generateUUID(),
      name: input.name,
      range: input.range,
      description: input.description,
      imageUrl: input.imageUrl,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NS_BOAT_MODELS, model);
    return model;
  },

  async update(id: string, input: Partial<LibraryBoatModel>): Promise<LibraryBoatModel | null> {
    const adapter = getAdapter();
    const existing = await adapter.getById<LibraryBoatModel>(NS_BOAT_MODELS, id);
    if (!existing) return null;

    const updated: LibraryBoatModel = {
      ...existing,
      ...input,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await adapter.save(NS_BOAT_MODELS, updated);
    return updated;
  },

  async getVersions(modelId: string): Promise<BoatModelVersion[]> {
    const adapter = getAdapter();
    return adapter.query<BoatModelVersion>(NS_BOAT_MODEL_VERSIONS, {
      where: { modelId },
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  },

  async getVersion(versionId: string): Promise<BoatModelVersion | null> {
    const adapter = getAdapter();
    return adapter.getById<BoatModelVersion>(NS_BOAT_MODEL_VERSIONS, versionId);
  },

  async getCurrentVersion(modelId: string): Promise<BoatModelVersion | null> {
    const model = await this.getById(modelId);
    if (!model?.currentVersionId) return null;
    return this.getVersion(model.currentVersionId);
  },

  async createVersion(
    modelId: string,
    input: Omit<BoatModelVersion, 'id' | 'modelId' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<BoatModelVersion> {
    const adapter = getAdapter();

    const version: BoatModelVersion = {
      id: generateUUID(),
      modelId,
      ...input,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NS_BOAT_MODEL_VERSIONS, version);

    // If this is the first approved version, set as current
    if (input.status === 'APPROVED') {
      await this.update(modelId, { currentVersionId: version.id });
    }

    return version;
  },

  async approveVersion(versionId: string, approvedBy: string): Promise<BoatModelVersion | null> {
    const adapter = getAdapter();
    const version = await adapter.getById<BoatModelVersion>(NS_BOAT_MODEL_VERSIONS, versionId);
    if (!version) return null;

    const approved: BoatModelVersion = {
      ...version,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy,
      updatedAt: now(),
      version: version.version + 1,
    };

    await adapter.save(NS_BOAT_MODEL_VERSIONS, approved);

    // Set as current version
    await this.update(version.modelId, { currentVersionId: versionId });

    return approved;
  },

  async deprecateVersion(versionId: string): Promise<BoatModelVersion | null> {
    const adapter = getAdapter();
    const version = await adapter.getById<BoatModelVersion>(NS_BOAT_MODEL_VERSIONS, versionId);
    if (!version) return null;

    const deprecated: BoatModelVersion = {
      ...version,
      status: 'DEPRECATED',
      updatedAt: now(),
      version: version.version + 1,
    };

    await adapter.save(NS_BOAT_MODEL_VERSIONS, deprecated);
    return deprecated;
  },
};

// ============================================
// CATALOGS
// ============================================

export const CatalogRepository = {
  async getAll(): Promise<LibraryCatalog[]> {
    const adapter = getAdapter();
    return adapter.getAll<LibraryCatalog>(NS_CATALOGS);
  },

  async getById(id: string): Promise<LibraryCatalog | null> {
    const adapter = getAdapter();
    return adapter.getById<LibraryCatalog>(NS_CATALOGS, id);
  },

  async create(input: { name: string; description?: string }): Promise<LibraryCatalog> {
    const adapter = getAdapter();

    const catalog: LibraryCatalog = {
      id: generateUUID(),
      name: input.name,
      description: input.description,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NS_CATALOGS, catalog);
    return catalog;
  },

  async getVersions(catalogId: string): Promise<CatalogVersion[]> {
    const adapter = getAdapter();
    return adapter.query<CatalogVersion>(NS_CATALOG_VERSIONS, {
      where: { catalogId },
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  },

  async getVersion(versionId: string): Promise<CatalogVersion | null> {
    const adapter = getAdapter();
    return adapter.getById<CatalogVersion>(NS_CATALOG_VERSIONS, versionId);
  },

  async getCurrentVersion(catalogId: string): Promise<CatalogVersion | null> {
    const catalog = await this.getById(catalogId);
    if (!catalog?.currentVersionId) return null;
    return this.getVersion(catalog.currentVersionId);
  },

  async createVersion(
    catalogId: string,
    versionLabel: string,
    items: CatalogItem[],
    createdBy: string
  ): Promise<CatalogVersion> {
    const adapter = getAdapter();

    const version: CatalogVersion = {
      id: generateUUID(),
      catalogId,
      versionLabel,
      status: 'DRAFT',
      items,
      createdBy,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NS_CATALOG_VERSIONS, version);
    return version;
  },

  async approveVersion(versionId: string, approvedBy: string): Promise<CatalogVersion | null> {
    const adapter = getAdapter();
    const version = await adapter.getById<CatalogVersion>(NS_CATALOG_VERSIONS, versionId);
    if (!version) return null;

    // Deprecate current version
    const catalog = await this.getById(version.catalogId);
    if (catalog?.currentVersionId) {
      const currentVersion = await this.getVersion(catalog.currentVersionId);
      if (currentVersion) {
        await adapter.save(NS_CATALOG_VERSIONS, {
          ...currentVersion,
          status: 'DEPRECATED' as VersionStatus,
          updatedAt: now(),
          version: currentVersion.version + 1,
        });
      }
    }

    // Approve new version
    const approved: CatalogVersion = {
      ...version,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy,
      updatedAt: now(),
      version: version.version + 1,
    };

    await adapter.save(NS_CATALOG_VERSIONS, approved);

    // Update catalog
    await adapter.save(NS_CATALOGS, {
      ...catalog!,
      currentVersionId: versionId,
      updatedAt: now(),
    });

    return approved;
  },
};

// ============================================
// DOCUMENT TEMPLATES
// ============================================

export const TemplateRepository = {
  async getAll(): Promise<LibraryDocumentTemplate[]> {
    const adapter = getAdapter();
    return adapter.getAll<LibraryDocumentTemplate>(NS_TEMPLATES);
  },

  async getById(id: string): Promise<LibraryDocumentTemplate | null> {
    const adapter = getAdapter();
    return adapter.getById<LibraryDocumentTemplate>(NS_TEMPLATES, id);
  },

  async create(input: {
    type: string;
    name: string;
    description?: string;
  }): Promise<LibraryDocumentTemplate> {
    const adapter = getAdapter();

    const template: LibraryDocumentTemplate = {
      id: generateUUID(),
      type: input.type as LibraryDocumentTemplate['type'],
      name: input.name,
      description: input.description,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NS_TEMPLATES, template);
    return template;
  },

  async getVersions(templateId: string): Promise<TemplateVersion[]> {
    const adapter = getAdapter();
    return adapter.query<TemplateVersion>(NS_TEMPLATE_VERSIONS, {
      where: { templateId },
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  },

  async getVersion(versionId: string): Promise<TemplateVersion | null> {
    const adapter = getAdapter();
    return adapter.getById<TemplateVersion>(NS_TEMPLATE_VERSIONS, versionId);
  },

  async getCurrentVersion(templateId: string): Promise<TemplateVersion | null> {
    const template = await this.getById(templateId);
    if (!template?.currentVersionId) return null;
    return this.getVersion(template.currentVersionId);
  },

  async createVersion(
    templateId: string,
    versionLabel: string,
    content: string,
    requiredFields: string[],
    createdBy: string
  ): Promise<TemplateVersion> {
    const adapter = getAdapter();

    const version: TemplateVersion = {
      id: generateUUID(),
      templateId,
      versionLabel,
      status: 'DRAFT',
      content,
      requiredFields,
      createdBy,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NS_TEMPLATE_VERSIONS, version);
    return version;
  },

  async approveVersion(versionId: string, approvedBy: string): Promise<TemplateVersion | null> {
    const adapter = getAdapter();
    const version = await adapter.getById<TemplateVersion>(NS_TEMPLATE_VERSIONS, versionId);
    if (!version) return null;

    const approved: TemplateVersion = {
      ...version,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy,
      updatedAt: now(),
      version: version.version + 1,
    };

    await adapter.save(NS_TEMPLATE_VERSIONS, approved);

    // Update template
    const template = await this.getById(version.templateId);
    if (template) {
      await adapter.save(NS_TEMPLATES, {
        ...template,
        currentVersionId: versionId,
        updatedAt: now(),
      });
    }

    return approved;
  },
};

// ============================================
// PROCEDURES
// ============================================

const NS_PROCEDURES = 'library_procedures';
const NS_PROCEDURE_VERSIONS = 'library_procedure_versions';

export const ProcedureRepository = {
  async getAll(): Promise<LibraryProcedure[]> {
    const adapter = getAdapter();
    return adapter.getAll<LibraryProcedure>(NS_PROCEDURES);
  },

  async getById(id: string): Promise<LibraryProcedure | null> {
    const adapter = getAdapter();
    return adapter.getById<LibraryProcedure>(NS_PROCEDURES, id);
  },

  async create(input: {
    category: string;
    title: string;
    description?: string;
  }): Promise<LibraryProcedure> {
    const adapter = getAdapter();

    const procedure: LibraryProcedure = {
      id: generateUUID(),
      category: input.category,
      title: input.title,
      description: input.description,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NS_PROCEDURES, procedure);
    return procedure;
  },

  async update(id: string, input: Partial<LibraryProcedure>): Promise<LibraryProcedure | null> {
    const adapter = getAdapter();
    const existing = await adapter.getById<LibraryProcedure>(NS_PROCEDURES, id);
    if (!existing) return null;

    const updated: LibraryProcedure = {
      ...existing,
      ...input,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await adapter.save(NS_PROCEDURES, updated);
    return updated;
  },

  async getVersions(procedureId: string): Promise<ProcedureVersion[]> {
    const adapter = getAdapter();
    return adapter.query<ProcedureVersion>(NS_PROCEDURE_VERSIONS, {
      where: { procedureId },
      orderBy: { field: 'createdAt', direction: 'desc' },
    });
  },

  async getVersion(versionId: string): Promise<ProcedureVersion | null> {
    const adapter = getAdapter();
    return adapter.getById<ProcedureVersion>(NS_PROCEDURE_VERSIONS, versionId);
  },

  async getCurrentVersion(procedureId: string): Promise<ProcedureVersion | null> {
    const procedure = await this.getById(procedureId);
    if (!procedure?.currentVersionId) return null;
    return this.getVersion(procedure.currentVersionId);
  },

  async createVersion(
    procedureId: string,
    versionLabel: string,
    content: string,
    applicableModelIds: string[],
    createdBy: string
  ): Promise<ProcedureVersion> {
    const adapter = getAdapter();

    const version: ProcedureVersion = {
      id: generateUUID(),
      procedureId,
      versionLabel,
      status: 'DRAFT',
      content,
      applicableModelIds,
      createdBy,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NS_PROCEDURE_VERSIONS, version);
    return version;
  },

  async approveVersion(versionId: string, approvedBy: string): Promise<ProcedureVersion | null> {
    const adapter = getAdapter();
    const version = await adapter.getById<ProcedureVersion>(NS_PROCEDURE_VERSIONS, versionId);
    if (!version) return null;

    const approved: ProcedureVersion = {
      ...version,
      status: 'APPROVED',
      approvedAt: now(),
      approvedBy,
      updatedAt: now(),
      version: version.version + 1,
    };

    await adapter.save(NS_PROCEDURE_VERSIONS, approved);

    // Update procedure
    const procedure = await this.getById(version.procedureId);
    if (procedure) {
      await adapter.save(NS_PROCEDURES, {
        ...procedure,
        currentVersionId: versionId,
        updatedAt: now(),
      });
    }

    return approved;
  },

  async delete(id: string): Promise<void> {
    const adapter = getAdapter();
    await adapter.delete(NS_PROCEDURES, id);
  },
};

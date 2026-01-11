/**
 * Export/Import Service - v4
 * Handles data export to ZIP and import with validation
 */

import type { Project, Client, User } from '@/domain/models';
import type { AuditEntry } from '@/domain/models/audit';
import {
  generateUUID,
  now,
  Result,
  Ok,
  Err,
  ensureTechnicalFile,
  ensureDocumentTemplates,
  isModularOwnerManual,
  migrateOwnerManualToBlocks,
  ensureOwnerManualBlocksFromCatalogue,
  type ProjectDocumentTemplate,
  type ProjectDocumentTemplateVersion,
} from '@/domain/models';
import { getAdapter } from '@/data/persistence';
import { ProjectRepository, ClientRepository } from '@/data/repositories';
import {
  ArticleRepository,
  ArticleVersionRepository,
  KitRepository,
  KitVersionRepository,
  CategoryRepository,
  SubcategoryRepository,
} from '@/data/repositories/LibraryV4Repository';
import {
  TemplateRepository,
  ProcedureRepository,
  BoatModelRepository,
  CatalogRepository,
} from '@/data/repositories/LibraryRepository';
import { ProductionProcedureRepository } from '@/data/repositories/ProductionProcedureRepository';
import { TimesheetRepository } from '@/data/repositories/TimesheetRepository';
import type { Entity, TimesheetEntry } from '@/domain/models';
import { AuditService } from '@/domain/audit/AuditService';
import type { AuditContext } from '@/domain/audit/AuditService';

// ============================================
// TYPES
// ============================================

export const EXPORT_VERSION = '1.0.0';
export const APP_VERSION = '4.0.0';

export interface ExportManifest {
  version: string;
  appVersion: string;
  exportedAt: string;
  exportedBy: string;
  counts: {
    projects: number;
    clients: number;
    users: number;
    articles: number;
    articleVersions: number;
    kits: number;
    kitVersions: number;
    categories: number;
    subcategories: number;
    templates: number;
    procedures: number;
    boatModels: number;
    equipmentItems: number;
    productionProcedures: number;
    productionProcedureVersions: number;
    auditEntries: number;
    timesheets: number;
  };
  options: ExportOptions;
}

export interface ExportOptions {
  includeProjects: boolean;
  includeClients: boolean;
  includeUsers: boolean;
  includeUserPasswords: boolean;
  includeLibrary: boolean;
  includeAuditLog: boolean;
  includeDocuments: boolean;
  includeTimesheets?: boolean; // Optional for backward compatibility
}

export interface ExportData {
  manifest: ExportManifest;
  projects?: Project[];
  clients?: Client[];
  users?: Omit<User, 'passwordHash'>[] | User[];
  library?: {
    categories: unknown[];
    subcategories: unknown[];
    articles: unknown[];
    articleVersions: unknown[];
    kits: unknown[];
    kitVersions: unknown[];
    templates: unknown[];
    templateVersions: unknown[];
    procedures: unknown[];
    procedureVersions: unknown[];
    boatModels: unknown[];
    boatModelVersions: unknown[];
    equipmentItems: unknown[];
    productionProcedures: unknown[];
    productionProcedureVersions: unknown[];
  };
  auditEntries?: AuditEntry[];
  timesheets?: TimesheetEntry[];
}

export interface ImportPreview {
  manifest: ExportManifest;
  counts: {
    projects: { new: number; existing: number; conflicts: number };
    clients: { new: number; existing: number; conflicts: number };
    users: { new: number; existing: number; conflicts: number };
    library: { new: number; existing: number; conflicts: number };
    auditEntries: { new: number; existing: number };
  };
  conflicts: ImportConflict[];
  warnings: string[];
  isCompatible: boolean;
}

export interface ImportConflict {
  type: 'project' | 'client' | 'user' | 'article' | 'kit' | 'category';
  id: string;
  name: string;
  reason: string;
  localVersion: number;
  importVersion: number;
  isPinned: boolean;
}

export type ImportMode = 'merge' | 'replace';

export interface ImportOptions {
  mode: ImportMode;
  skipConflicts: boolean;
  importProjects: boolean;
  importClients: boolean;
  importUsers: boolean;
  importLibrary: boolean;
  importAuditLog: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: {
    projects: number;
    clients: number;
    users: number;
    libraryItems: number;
    auditEntries: number;
  };
  skipped: {
    conflicts: number;
    pinnedItems: number;
  };
  errors: string[];
}

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Migrate legacy Owner's Manual templates to modular block structure.
 * Called during import if an Owner's Manual exists but lacks ownerManualBlocks.
 * Also ensures all catalogue blocks are present (repairs missing blocks).
 */
function migrateOwnerManualTemplates(
  templates: ProjectDocumentTemplate[] | undefined,
  projectSystems: string[] | undefined
): ProjectDocumentTemplate[] | undefined {
  if (!templates) return templates;

  return templates.map((template) => {
    // Only migrate Owner's Manual templates
    if (template.type !== 'DOC_OWNERS_MANUAL') {
      return template;
    }

    // Migrate each version that needs migration
    const migratedVersions = template.versions.map((version) => {
      // Skip if APPROVED - don't migrate approved versions to preserve integrity
      if (version.status === 'APPROVED') {
        return version;
      }

      // If already has modular blocks, ensure all catalogue blocks are present
      if (isModularOwnerManual(version)) {
        const ensuredBlocks = ensureOwnerManualBlocksFromCatalogue(
          version.ownerManualBlocks,
          projectSystems
        );
        // Only update if blocks changed
        if (ensuredBlocks.length !== version.ownerManualBlocks!.length) {
          return {
            ...version,
            ownerManualBlocks: ensuredBlocks,
          };
        }
        return version;
      }

      // Migrate DRAFT versions with legacy content to modular blocks
      if (version.content && version.content.trim().length > 0) {
        const { blocks, aiAssisted } = migrateOwnerManualToBlocks(
          version.content,
          version.imageSlots,
          projectSystems
        );

        // Ensure all catalogue blocks are present
        const ensuredBlocks = ensureOwnerManualBlocksFromCatalogue(blocks, projectSystems);

        return {
          ...version,
          ownerManualBlocks: ensuredBlocks,
          aiAssisted,
          // Keep legacy content for reference but blocks take precedence
        };
      }

      // No content and no blocks - create fresh from catalogue
      const freshBlocks = ensureOwnerManualBlocksFromCatalogue(undefined, projectSystems);
      return {
        ...version,
        ownerManualBlocks: freshBlocks,
        aiAssisted: true,
      };
    });

    return {
      ...template,
      versions: migratedVersions,
    };
  });
}

// ============================================
// EXPORT SERVICE
// ============================================

export const ExportImportService = {
  /**
   * Export all data to a structured object
   */
  async exportData(
    options: ExportOptions,
    context: AuditContext
  ): Promise<Result<ExportData, string>> {
    try {
      const exportData: ExportData = {
        manifest: {
          version: EXPORT_VERSION,
          appVersion: APP_VERSION,
          exportedAt: now(),
          exportedBy: context.userName,
          counts: {
            projects: 0,
            clients: 0,
            users: 0,
            articles: 0,
            articleVersions: 0,
            kits: 0,
            kitVersions: 0,
            categories: 0,
            subcategories: 0,
            templates: 0,
            procedures: 0,
            boatModels: 0,
            equipmentItems: 0,
            productionProcedures: 0,
            productionProcedureVersions: 0,
            auditEntries: 0,
            timesheets: 0,
          },
          options,
        },
      };

      // Export projects
      if (options.includeProjects) {
        const projects = await ProjectRepository.getAll();
        exportData.projects = projects;
        exportData.manifest.counts.projects = projects.length;
      }

      // Export clients
      if (options.includeClients) {
        const clients = await ClientRepository.getAll();
        exportData.clients = clients;
        exportData.manifest.counts.clients = clients.length;
      }

      // Export users
      if (options.includeUsers) {
        const adapter = getAdapter();
        const users = await adapter.getAll<User>('users');

        if (options.includeUserPasswords) {
          exportData.users = users;
        } else {
          // Strip password hashes
          exportData.users = users.map(({ passwordHash, ...user }) => user) as Omit<User, 'passwordHash'>[];
        }
        exportData.manifest.counts.users = users.length;
      }

      // Export library
      if (options.includeLibrary) {
        const categories = await CategoryRepository.getAll();
        const subcategories = await SubcategoryRepository.getAll();
        const articles = await ArticleRepository.getAll();
        const articleVersions = await ArticleVersionRepository.getAll();
        const kits = await KitRepository.getAll();
        const kitVersions = await KitVersionRepository.getAll();
        const templates = await TemplateRepository.getAll();
        const procedures = await ProcedureRepository.getAll();
        const boatModels = await BoatModelRepository.getAll();
        const equipmentItems = await CatalogRepository.getAll();

        // Get template and procedure versions
        const templateVersions: unknown[] = [];
        for (const template of templates) {
          const versions = await TemplateRepository.getVersions(template.id);
          templateVersions.push(...versions);
        }

        const procedureVersions: unknown[] = [];
        for (const procedure of procedures) {
          const versions = await ProcedureRepository.getVersions(procedure.id);
          procedureVersions.push(...versions);
        }

        // Get boat model versions
        const boatModelVersions: unknown[] = [];
        for (const model of boatModels) {
          const versions = await BoatModelRepository.getVersions(model.id);
          boatModelVersions.push(...versions);
        }

        // Get production procedures and versions
        const productionProcedures = await ProductionProcedureRepository.getAll();
        const productionProcedureVersions: unknown[] = [];
        for (const procedure of productionProcedures) {
          const versions = await ProductionProcedureRepository.getVersions(procedure.id);
          productionProcedureVersions.push(...versions);
        }

        exportData.library = {
          categories,
          subcategories,
          articles,
          articleVersions,
          kits,
          kitVersions,
          templates,
          templateVersions,
          procedures,
          procedureVersions,
          boatModels,
          boatModelVersions,
          equipmentItems,
          productionProcedures,
          productionProcedureVersions,
        };

        exportData.manifest.counts.categories = categories.length;
        exportData.manifest.counts.subcategories = subcategories.length;
        exportData.manifest.counts.articles = articles.length;
        exportData.manifest.counts.articleVersions = articleVersions.length;
        exportData.manifest.counts.kits = kits.length;
        exportData.manifest.counts.kitVersions = kitVersions.length;
        exportData.manifest.counts.templates = templates.length;
        exportData.manifest.counts.procedures = procedures.length;
        exportData.manifest.counts.boatModels = boatModels.length;
        exportData.manifest.counts.equipmentItems = equipmentItems.length;
        exportData.manifest.counts.productionProcedures = productionProcedures.length;
        exportData.manifest.counts.productionProcedureVersions = productionProcedureVersions.length;
      }

      // Export audit log
      if (options.includeAuditLog) {
        const auditEntries = await AuditService.getAll();
        exportData.auditEntries = auditEntries;
        exportData.manifest.counts.auditEntries = auditEntries.length;
      }

      // Export timesheets
      if (options.includeTimesheets) {
        const timesheets = await TimesheetRepository.getAll();
        exportData.timesheets = timesheets;
        exportData.manifest.counts.timesheets = timesheets.length;
      }

      // Log the export
      await AuditService.log(
        context,
        'CREATE',
        'Export',
        generateUUID(),
        `Exported data: ${exportData.manifest.counts.projects} projects, ${exportData.manifest.counts.clients} clients, ${exportData.manifest.counts.users} users`
      );

      return Ok(exportData);
    } catch (error) {
      return Err(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Create a downloadable ZIP file from export data
   * Uses browser's JSZip library
   */
  async createExportZip(exportData: ExportData): Promise<Blob> {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add manifest
    zip.file('manifest.json', JSON.stringify(exportData.manifest, null, 2));

    // Add data files
    if (exportData.projects) {
      zip.file('projects.json', JSON.stringify(exportData.projects, null, 2));
    }
    if (exportData.clients) {
      zip.file('clients.json', JSON.stringify(exportData.clients, null, 2));
    }
    if (exportData.users) {
      zip.file('users.json', JSON.stringify(exportData.users, null, 2));
    }
    if (exportData.library) {
      zip.file('library.json', JSON.stringify(exportData.library, null, 2));
    }
    if (exportData.auditEntries) {
      zip.file('audit_entries.json', JSON.stringify(exportData.auditEntries, null, 2));
    }
    if (exportData.timesheets) {
      zip.file('timesheets.json', JSON.stringify(exportData.timesheets, null, 2));
    }

    // Generate the ZIP
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  },

  /**
   * Parse and validate an import file
   */
  async parseImportFile(file: File): Promise<Result<ExportData, string>> {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);

      // Check for manifest
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) {
        return Err('Invalid export file: missing manifest.json');
      }

      const manifestContent = await manifestFile.async('string');
      const manifest: ExportManifest = JSON.parse(manifestContent);

      // Validate version compatibility
      if (!manifest.version || !manifest.appVersion) {
        return Err('Invalid manifest: missing version information');
      }

      const exportData: ExportData = { manifest };

      // Parse projects
      const projectsFile = zip.file('projects.json');
      if (projectsFile) {
        const content = await projectsFile.async('string');
        exportData.projects = JSON.parse(content);
      }

      // Parse clients
      const clientsFile = zip.file('clients.json');
      if (clientsFile) {
        const content = await clientsFile.async('string');
        exportData.clients = JSON.parse(content);
      }

      // Parse users
      const usersFile = zip.file('users.json');
      if (usersFile) {
        const content = await usersFile.async('string');
        exportData.users = JSON.parse(content);
      }

      // Parse library
      const libraryFile = zip.file('library.json');
      if (libraryFile) {
        const content = await libraryFile.async('string');
        exportData.library = JSON.parse(content);
      }

      // Parse audit entries
      const auditFile = zip.file('audit_entries.json');
      if (auditFile) {
        const content = await auditFile.async('string');
        exportData.auditEntries = JSON.parse(content);
      }

      // Parse timesheets (optional for backward compatibility)
      const timesheetsFile = zip.file('timesheets.json');
      if (timesheetsFile) {
        const content = await timesheetsFile.async('string');
        exportData.timesheets = JSON.parse(content);
      }

      return Ok(exportData);
    } catch (error) {
      return Err(`Failed to parse import file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Preview an import - show counts and conflicts without applying changes
   */
  async previewImport(exportData: ExportData): Promise<Result<ImportPreview, string>> {
    try {
      const preview: ImportPreview = {
        manifest: exportData.manifest,
        counts: {
          projects: { new: 0, existing: 0, conflicts: 0 },
          clients: { new: 0, existing: 0, conflicts: 0 },
          users: { new: 0, existing: 0, conflicts: 0 },
          library: { new: 0, existing: 0, conflicts: 0 },
          auditEntries: { new: 0, existing: 0 },
        },
        conflicts: [],
        warnings: [],
        isCompatible: true,
      };

      // Check version compatibility
      const [exportMajor] = exportData.manifest.version.split('.');
      const [appMajor] = EXPORT_VERSION.split('.');
      if (exportMajor !== appMajor) {
        preview.warnings.push(`Export version ${exportData.manifest.version} may not be fully compatible with current version ${EXPORT_VERSION}`);
      }

      // Check projects
      if (exportData.projects) {
        for (const project of exportData.projects) {
          const existing = await ProjectRepository.getById(project.id);
          if (existing) {
            preview.counts.projects.existing++;

            // Check for version conflicts
            if (existing.version > project.version) {
              preview.counts.projects.conflicts++;

              // Check if project is pinned (has library pins or frozen config)
              const isPinned = !!existing.libraryPins || existing.configuration.isFrozen;

              preview.conflicts.push({
                type: 'project',
                id: project.id,
                name: project.title,
                reason: `Local version ${existing.version} is newer than import version ${project.version}`,
                localVersion: existing.version,
                importVersion: project.version,
                isPinned,
              });
            }
          } else {
            preview.counts.projects.new++;
          }
        }
      }

      // Check clients
      if (exportData.clients) {
        for (const client of exportData.clients) {
          const existing = await ClientRepository.getById(client.id);
          if (existing) {
            preview.counts.clients.existing++;
            if (existing.version > client.version) {
              preview.counts.clients.conflicts++;
              preview.conflicts.push({
                type: 'client',
                id: client.id,
                name: client.name,
                reason: `Local version ${existing.version} is newer than import version ${client.version}`,
                localVersion: existing.version,
                importVersion: client.version,
                isPinned: false,
              });
            }
          } else {
            preview.counts.clients.new++;
          }
        }
      }

      // Check users
      if (exportData.users) {
        const adapter = getAdapter();
        for (const user of exportData.users) {
          const existing = await adapter.getById<User>('users', user.id);
          if (existing) {
            preview.counts.users.existing++;
            if (existing.version > (user.version || 0)) {
              preview.counts.users.conflicts++;
              preview.conflicts.push({
                type: 'user',
                id: user.id,
                name: user.name,
                reason: `Local version ${existing.version} is newer than import version ${user.version || 0}`,
                localVersion: existing.version,
                importVersion: user.version || 0,
                isPinned: false,
              });
            }
          } else {
            preview.counts.users.new++;
          }
        }
      }

      // Check library items
      if (exportData.library) {
        // Check articles
        for (const article of exportData.library.articles || []) {
          const existing = await ArticleRepository.getById((article as { id: string }).id);
          if (existing) {
            preview.counts.library.existing++;
          } else {
            preview.counts.library.new++;
          }
        }

        // Check kits
        for (const kit of exportData.library.kits || []) {
          const existing = await KitRepository.getById((kit as { id: string }).id);
          if (existing) {
            preview.counts.library.existing++;
          } else {
            preview.counts.library.new++;
          }
        }
      }

      // Check audit entries
      if (exportData.auditEntries) {
        const existingEntries = await AuditService.getAll();
        const existingIds = new Set(existingEntries.map(e => e.id));

        for (const entry of exportData.auditEntries) {
          if (existingIds.has(entry.id)) {
            preview.counts.auditEntries.existing++;
          } else {
            preview.counts.auditEntries.new++;
          }
        }
      }

      // Add warning if there are pinned conflicts
      const pinnedConflicts = preview.conflicts.filter(c => c.isPinned);
      if (pinnedConflicts.length > 0) {
        preview.warnings.push(
          `${pinnedConflicts.length} item(s) have pinned/frozen data and will not be overwritten`
        );
      }

      return Ok(preview);
    } catch (error) {
      return Err(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Import data with the specified options
   */
  async importData(
    exportData: ExportData,
    options: ImportOptions,
    context: AuditContext
  ): Promise<Result<ImportResult, string>> {
    const result: ImportResult = {
      success: true,
      imported: {
        projects: 0,
        clients: 0,
        users: 0,
        libraryItems: 0,
        auditEntries: 0,
      },
      skipped: {
        conflicts: 0,
        pinnedItems: 0,
      },
      errors: [],
    };

    try {
      const adapter = getAdapter();

      // Import clients first (projects depend on them)
      if (options.importClients && exportData.clients) {
        for (const client of exportData.clients) {
          try {
            const existing = await ClientRepository.getById(client.id);

            if (existing) {
              if (options.mode === 'replace' && !options.skipConflicts) {
                // Replace - only if import version is newer or equal
                if (client.version >= existing.version) {
                  await adapter.save('clients', client);
                  result.imported.clients++;
                } else {
                  result.skipped.conflicts++;
                }
              } else if (options.mode === 'merge') {
                // Merge - skip existing
                result.skipped.conflicts++;
              }
            } else {
              // New client
              await adapter.save('clients', client);
              result.imported.clients++;
            }
          } catch (error) {
            result.errors.push(`Failed to import client ${client.name}: ${error}`);
          }
        }
      }

      // Import projects
      if (options.importProjects && exportData.projects) {
        for (const project of exportData.projects) {
          try {
            const existing = await ProjectRepository.getById(project.id);

            if (existing) {
              // Check if pinned/frozen - never overwrite
              const isPinned = !!existing.libraryPins || existing.configuration.isFrozen;

              if (isPinned) {
                result.skipped.pinnedItems++;
                continue;
              }

              if (options.mode === 'replace' && !options.skipConflicts) {
                if (project.version >= existing.version) {
                  // Ensure backward compatibility: initialize technicalFile and documentTemplates if missing
                  // Also migrate legacy Owner's Manual to modular block structure
                  const ensuredTemplates = ensureDocumentTemplates(
                    project.type,
                    project.id,
                    project.documentTemplates,
                    'system',
                    project.systems
                  );
                  const migratedProject: Project = {
                    ...project,
                    technicalFile: ensureTechnicalFile(project.technicalFile),
                    documentTemplates: migrateOwnerManualTemplates(ensuredTemplates, project.systems),
                  };
                  await adapter.save('projects', migratedProject);
                  result.imported.projects++;
                } else {
                  result.skipped.conflicts++;
                }
              } else if (options.mode === 'merge') {
                result.skipped.conflicts++;
              }
            } else {
              // New project - verify client exists
              const client = await ClientRepository.getById(project.clientId);
              if (client) {
                // Ensure backward compatibility: initialize technicalFile and documentTemplates if missing
                // Also migrate legacy Owner's Manual to modular block structure
                const ensuredTemplates = ensureDocumentTemplates(
                  project.type,
                  project.id,
                  project.documentTemplates,
                  'system',
                  project.systems
                );
                const migratedProject: Project = {
                  ...project,
                  technicalFile: ensureTechnicalFile(project.technicalFile),
                  documentTemplates: migrateOwnerManualTemplates(ensuredTemplates, project.systems),
                };
                await adapter.save('projects', migratedProject);
                result.imported.projects++;
              } else {
                result.errors.push(`Skipped project ${project.title}: client not found`);
              }
            }
          } catch (error) {
            result.errors.push(`Failed to import project ${project.title}: ${error}`);
          }
        }
      }

      // Import users
      if (options.importUsers && exportData.users) {
        for (const user of exportData.users) {
          try {
            const existing = await adapter.getById<User>('users', user.id);

            if (existing) {
              if (options.mode === 'replace' && !options.skipConflicts) {
                if ((user.version || 0) >= existing.version) {
                  // Preserve password hash if not in import
                  const userToSave = 'passwordHash' in user
                    ? user
                    : { ...user, passwordHash: existing.passwordHash };
                  await adapter.save('users', userToSave);
                  result.imported.users++;
                } else {
                  result.skipped.conflicts++;
                }
              } else if (options.mode === 'merge') {
                result.skipped.conflicts++;
              }
            } else {
              // New user - need password hash
              if ('passwordHash' in user && user.passwordHash) {
                await adapter.save('users', user);
                result.imported.users++;
              } else {
                result.errors.push(`Skipped user ${user.name}: no password hash in import`);
              }
            }
          } catch (error) {
            result.errors.push(`Failed to import user ${user.name}: ${error}`);
          }
        }
      }

      // Import library
      if (options.importLibrary && exportData.library) {
        // Import categories
        for (const category of exportData.library.categories || []) {
          try {
            const cat = category as Entity;
            const existing = await CategoryRepository.getById(cat.id);
            if (!existing || options.mode === 'replace') {
              await adapter.save('library_categories', cat);
              result.imported.libraryItems++;
            }
          } catch (error) {
            result.errors.push(`Failed to import category: ${error}`);
          }
        }

        // Import subcategories
        for (const subcategory of exportData.library.subcategories || []) {
          try {
            const sub = subcategory as Entity;
            const existing = await SubcategoryRepository.getById(sub.id);
            if (!existing || options.mode === 'replace') {
              await adapter.save('library_subcategories', sub);
              result.imported.libraryItems++;
            }
          } catch (error) {
            result.errors.push(`Failed to import subcategory: ${error}`);
          }
        }

        // Import articles
        for (const article of exportData.library.articles || []) {
          try {
            const art = article as Entity;
            const existing = await ArticleRepository.getById(art.id);
            if (!existing || options.mode === 'replace') {
              await adapter.save('library_articles', art);
              result.imported.libraryItems++;
            }
          } catch (error) {
            result.errors.push(`Failed to import article: ${error}`);
          }
        }

        // Import article versions
        for (const version of exportData.library.articleVersions || []) {
          try {
            const ver = version as Entity;
            const existing = await ArticleVersionRepository.getById(ver.id);
            if (!existing || options.mode === 'replace') {
              await adapter.save('library_article_versions', ver);
              result.imported.libraryItems++;
            }
          } catch (error) {
            result.errors.push(`Failed to import article version: ${error}`);
          }
        }

        // Import kits
        for (const kit of exportData.library.kits || []) {
          try {
            const k = kit as Entity;
            const existing = await KitRepository.getById(k.id);
            if (!existing || options.mode === 'replace') {
              await adapter.save('library_kits', k);
              result.imported.libraryItems++;
            }
          } catch (error) {
            result.errors.push(`Failed to import kit: ${error}`);
          }
        }

        // Import kit versions
        for (const version of exportData.library.kitVersions || []) {
          try {
            const ver = version as Entity;
            const existing = await KitVersionRepository.getById(ver.id);
            if (!existing || options.mode === 'replace') {
              await adapter.save('library_kit_versions', ver);
              result.imported.libraryItems++;
            }
          } catch (error) {
            result.errors.push(`Failed to import kit version: ${error}`);
          }
        }

        // Import templates
        for (const template of exportData.library.templates || []) {
          try {
            await adapter.save('library_templates', template as Entity);
            result.imported.libraryItems++;
          } catch (error) {
            result.errors.push(`Failed to import template: ${error}`);
          }
        }

        // Import template versions
        for (const version of exportData.library.templateVersions || []) {
          try {
            await adapter.save('library_template_versions', version as Entity);
            result.imported.libraryItems++;
          } catch (error) {
            result.errors.push(`Failed to import template version: ${error}`);
          }
        }

        // Import procedures
        for (const procedure of exportData.library.procedures || []) {
          try {
            await adapter.save('library_procedures', procedure as Entity);
            result.imported.libraryItems++;
          } catch (error) {
            result.errors.push(`Failed to import procedure: ${error}`);
          }
        }

        // Import procedure versions
        for (const version of exportData.library.procedureVersions || []) {
          try {
            await adapter.save('library_procedure_versions', version as Entity);
            result.imported.libraryItems++;
          } catch (error) {
            result.errors.push(`Failed to import procedure version: ${error}`);
          }
        }

        // Import boat models
        for (const model of exportData.library.boatModels || []) {
          try {
            await adapter.save('library_boat_models', model as Entity);
            result.imported.libraryItems++;
          } catch (error) {
            result.errors.push(`Failed to import boat model: ${error}`);
          }
        }

        // Import boat model versions
        for (const version of exportData.library.boatModelVersions || []) {
          try {
            await adapter.save('library_boat_model_versions', version as Entity);
            result.imported.libraryItems++;
          } catch (error) {
            result.errors.push(`Failed to import boat model version: ${error}`);
          }
        }

        // Import equipment items
        for (const item of exportData.library.equipmentItems || []) {
          try {
            await adapter.save('library_equipment_catalog', item as Entity);
            result.imported.libraryItems++;
          } catch (error) {
            result.errors.push(`Failed to import equipment item: ${error}`);
          }
        }

        // Import production procedures
        for (const procedure of exportData.library.productionProcedures || []) {
          try {
            const proc = procedure as Entity;
            const existing = await ProductionProcedureRepository.getById(proc.id);
            if (!existing || options.mode === 'replace') {
              await adapter.save('library_production_procedures', proc);
              result.imported.libraryItems++;
            }
          } catch (error) {
            result.errors.push(`Failed to import production procedure: ${error}`);
          }
        }

        // Import production procedure versions
        for (const version of exportData.library.productionProcedureVersions || []) {
          try {
            const ver = version as Entity;
            const existing = await ProductionProcedureRepository.getVersion(ver.id);
            if (!existing || options.mode === 'replace') {
              await adapter.save('library_production_procedure_versions', ver);
              result.imported.libraryItems++;
            }
          } catch (error) {
            result.errors.push(`Failed to import production procedure version: ${error}`);
          }
        }
      }

      // Import audit log (always merge - never replace audit history)
      if (options.importAuditLog && exportData.auditEntries) {
        const existingEntries = await AuditService.getAll();
        const existingIds = new Set(existingEntries.map(e => e.id));

        for (const entry of exportData.auditEntries) {
          if (!existingIds.has(entry.id)) {
            try {
              await adapter.save('audit', entry);
              result.imported.auditEntries++;
            } catch (error) {
              result.errors.push(`Failed to import audit entry: ${error}`);
            }
          }
        }
      }

      // Import timesheets (merge - never replace existing entries)
      if (exportData.timesheets && exportData.timesheets.length > 0) {
        const imported = await TimesheetRepository.importEntries(exportData.timesheets);
        // Count is tracked in the import report even though we don't have a dedicated counter
        // Just log any failures silently for backward compatibility
      }

      // Log the import
      await AuditService.log(
        context,
        'CREATE',
        'Import',
        generateUUID(),
        `Imported data: ${result.imported.projects} projects, ${result.imported.clients} clients, ${result.imported.users} users, ${result.imported.libraryItems} library items`
      );

      result.success = result.errors.length === 0;
      return Ok(result);
    } catch (error) {
      result.success = false;
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return Ok(result);
    }
  },

  /**
   * Validate export data structure
   */
  validateExportData(data: unknown): Result<ExportData, string> {
    if (!data || typeof data !== 'object') {
      return Err('Invalid export data: not an object');
    }

    const exportData = data as ExportData;

    if (!exportData.manifest) {
      return Err('Invalid export data: missing manifest');
    }

    if (!exportData.manifest.version) {
      return Err('Invalid export data: missing version in manifest');
    }

    if (!exportData.manifest.exportedAt) {
      return Err('Invalid export data: missing exportedAt in manifest');
    }

    return Ok(exportData);
  },

  /**
   * Get default export options
   */
  getDefaultExportOptions(): ExportOptions {
    return {
      includeProjects: true,
      includeClients: true,
      includeUsers: true,
      includeUserPasswords: false,
      includeLibrary: true,
      includeAuditLog: true,
      includeDocuments: false,
    };
  },

  /**
   * Get default import options
   */
  getDefaultImportOptions(): ImportOptions {
    return {
      mode: 'merge',
      skipConflicts: true,
      importProjects: true,
      importClients: true,
      importUsers: true,
      importLibrary: true,
      importAuditLog: true,
    };
  },
};

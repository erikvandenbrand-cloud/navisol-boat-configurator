/**
 * Domain Models - v4
 * Export all models from a single entry point
 */

export * from './common';
export * from './client';
export * from './library';
export * from './library-v4';
export * from './project';
export type { AppliedStandard, PlanningTaskStatus, PlanningTask, PlanningResource, ProjectPlanning } from './project';
export * from './task';
export * from './audit';
export * from './user';
export * from './production';
export * from './compliance';
export * from './production-procedure';
export * from './timesheet';
export * from './technical-file';
export * from './document-template';

// Document Template exports
export type {
  CEDocumentTemplateType,
  DocumentTemplateVersionStatus,
  DocumentTemplateImageSlot,
  ProjectDocumentTemplateVersion,
  ProjectDocumentTemplate,
  ManualCatalogueSubchapter,
  ManualCatalogueChapter,
  ManualCatalogue,
  ManualBlock,
} from './document-template';

export {
  CE_DOCUMENT_TEMPLATE_TYPES,
  CE_DOCUMENT_TEMPLATE_LABELS,
  SYSTEM_KEYS,
  OWNER_MANUAL_CATALOGUE,
  createTemplateVersion,
  createDocumentTemplate,
  createAllDocumentTemplates,
  ensureDocumentTemplates,
  isTemplateVersionEditable,
  hasApprovedVersion,
  getDraftVersion,
  getApprovedVersion,
  createOwnerManualBlocks,
  createOwnerManualTemplateVersion,
  createOwnerManualTemplate,
  migrateOwnerManualToBlocks,
  isModularOwnerManual,
  getManualBlock,
  getChapterBlocks,
  getIncludedBlocks,
  getCatalogueChapter,
  getCatalogueSubchapter,
  shouldIncludeSubchapter,
  getChapterTitle,
  getSubchapterTitle,
  ensureOwnerManualBlocksFromCatalogue,
  ensureOwnerManualVersionBlocks,
  ensureOwnerManualTemplateBlocks,
} from './document-template';

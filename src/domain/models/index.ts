/**
 * Domain Models - v4
 * Export all models from a single entry point
 */

export * from './common';
export * from './client';
export * from './library';
export * from './library-v4';
export * from './project';
export type {
  AppliedStandard,
  PlanningTask,
  PlanningResource,
  ProjectPlanning,
  VesselIdentity,
  VesselIdentityInit,
  ComplianceDeclarations,
  TechnicalReference,
  StandardTag,
} from './project';
export { STANDARD_TAGS, STANDARD_TAG_LABELS } from './project';
export * from './task';
// Re-export unified task types explicitly
export type {
  WorkItem,
  WorkItemKind,
  WorkItemStatus,
  CreateWorkItemInput,
  PlanningTaskStatus,
  PlanningSummary,
} from './task';
export {
  isPlanningItem,
  isProductionItem,
  normalizeStatus,
  getEffectiveEndDate as getWorkItemEffectiveEndDate,
  getPrimaryAssignee,
  hasValidDateRange,
} from './task';
export * from './audit';
export * from './user';
export * from './production';
export * from './compliance';
export * from './production-procedure';
export * from './timesheet';
export * from './technical-file';
export type {
  TechnicalFileSectionId,
  TechnicalFileAttachmentRef,
  TechnicalFileGeneratedArtifact,
  TechnicalFileInputRef,
  TechnicalFileItem,
  TechnicalFileSection,
  TechnicalFile,
  ComplianceInputRefType,
} from './technical-file';
export {
  TECHNICAL_FILE_SECTION_IDS,
  TECHNICAL_FILE_SECTION_TITLES,
  TECHNICAL_FILE_SECTION_DESCRIPTIONS,
  OUTPUT_TO_SECTION_MAPPING,
  createEmptyTechnicalFile,
  ensureTechnicalFile,
  getSectionItemCounts,
  getTechnicalFileCounts,
  findSection,
} from './technical-file';
export * from './document-template';
/**
 * @deprecated Staff concept removed in v323 — use User instead.
 * Export maintained for backward compatibility of existing code.
 */
export * from './staff';
export * from './equipment-list';
export * from './work-instruction';
export * from './standard';
export * from './order-item';
export * from './customer-offer';
export * from './offer-template';

// Customer Offer exports (v325 - Sales Track)
export type {
  CustomerOffer,
  CustomerOfferBlock,
  CustomerOfferBlockType,
  CustomerOfferStatus,
  EquipmentGroup,
  PricingSnapshot,
  CustomerOfferImage,
  GenerateCustomerOfferInput,
  UpdateCustomerOfferBlockInput,
} from './customer-offer';

// Order Item exports
export type {
  OrderItem,
  OrderItemStatus,
  CreateOrderItemInput,
  UpdateOrderItemInput,
  OrderItemFilters,
} from './order-item';
export {
  ORDER_ITEM_STATUS_LABELS,
  ORDER_ITEM_STATUS_COLORS,
} from './order-item';

// Standard Library exports
export type {
  Standard,
  CreateStandardInput,
  UpdateStandardInput,
  AppliedStandardOrigin,
  AppliedStandardWithOrigin,
} from './standard';

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

// Offer Template exports
export type {
  OfferTemplate,
  OfferTemplateBlock,
  OfferTemplateVariable,
  ProjectOffer,
  ProjectOfferBlock,
  CreateOfferTemplateInput,
  UpdateOfferTemplateInput,
  ReapplyMode,
  ReapplyTemplateInput,
  OfferVariableContext,
} from './offer-template';

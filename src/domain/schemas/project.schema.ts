/**
 * Project Zod Schemas - v4
 */

import { z } from 'zod';

export const ProjectTypeSchema = z.enum(['NEW_BUILD', 'REFIT', 'MAINTENANCE']);

export const ProjectStatusSchema = z.enum([
  'DRAFT',
  'QUOTED',
  'OFFER_SENT',
  'ORDER_CONFIRMED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'CLOSED',
]);

export const PropulsionTypeSchema = z.enum(['Electric', 'Hybrid', 'Diesel', 'Outboard']);

export const QuoteStatusSchema = z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED']);

export const DocumentStatusSchema = z.enum(['DRAFT', 'FINAL', 'SUPERSEDED', 'ARCHIVED']);

export const AmendmentTypeSchema = z.enum([
  'EQUIPMENT_ADD',
  'EQUIPMENT_REMOVE',
  'EQUIPMENT_CHANGE',
  'SCOPE_CHANGE',
  'PRICE_ADJUSTMENT',
  'SPECIFICATION_CHANGE',
]);

export const ConfigurationItemSchema = z.object({
  id: z.string().min(1),
  catalogItemId: z.string().optional(),
  catalogVersionId: z.string().optional(),
  isCustom: z.boolean(),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  articleNumber: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  unitPriceExclVat: z.number().min(0),
  lineTotalExclVat: z.number().min(0),
  isIncluded: z.boolean(),
  ceRelevant: z.boolean(),
  safetyCritical: z.boolean(),
  sortOrder: z.number().int(),
});

export const ProjectConfigurationSchema = z.object({
  boatModelVersionId: z.string().optional(),
  propulsionType: PropulsionTypeSchema,
  items: z.array(ConfigurationItemSchema),
  subtotalExclVat: z.number(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountAmount: z.number().optional(),
  totalExclVat: z.number(),
  vatRate: z.number(),
  vatAmount: z.number(),
  totalInclVat: z.number(),
  isFrozen: z.boolean(),
  frozenAt: z.string().optional(),
  frozenBy: z.string().optional(),
  lastModifiedAt: z.string(),
  lastModifiedBy: z.string(),
});

export const CreateProjectInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: ProjectTypeSchema,
  clientId: z.string().min(1, 'Client is required'),
  boatModelVersionId: z.string().optional(),
  propulsionType: PropulsionTypeSchema.optional(),
});

export const AddConfigurationItemInputSchema = z.object({
  catalogItemId: z.string().optional(),
  catalogVersionId: z.string().optional(),
  isCustom: z.boolean(),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  articleNumber: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  quantity: z.number().min(1),
  unit: z.string().min(1),
  unitPriceExclVat: z.number().min(0),
  ceRelevant: z.boolean().optional(),
  safetyCritical: z.boolean().optional(),
});

export type ProjectStatusSchemaType = z.infer<typeof ProjectStatusSchema>;
export type CreateProjectInputSchemaType = z.infer<typeof CreateProjectInputSchema>;

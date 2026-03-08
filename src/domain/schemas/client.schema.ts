/**
 * Client Zod Schemas - v4
 */

import { z } from 'zod';

export const ClientTypeSchema = z.enum(['company', 'private']);
export const ClientStatusSchema = z.enum(['active', 'prospect', 'inactive']);

export const ClientSchema = z.object({
  id: z.string().min(1),
  clientNumber: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  type: ClientTypeSchema,

  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),

  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().min(1, 'Country is required'),

  vatNumber: z.string().optional(),
  kvkNumber: z.string().optional(),
  contactPerson: z.string().optional(),

  status: ClientStatusSchema,

  archivedAt: z.string().optional(),
  archivedBy: z.string().optional(),
  archiveReason: z.string().optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().min(0),
});

export const CreateClientInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: ClientTypeSchema,
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().min(1, 'Country is required').default('Netherlands'),
  vatNumber: z.string().optional(),
  kvkNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  status: ClientStatusSchema.default('active'),
});

export const UpdateClientInputSchema = CreateClientInputSchema.partial();

export type ClientSchemaType = z.infer<typeof ClientSchema>;
export type CreateClientInputSchemaType = z.infer<typeof CreateClientInputSchema>;
export type UpdateClientInputSchemaType = z.infer<typeof UpdateClientInputSchema>;

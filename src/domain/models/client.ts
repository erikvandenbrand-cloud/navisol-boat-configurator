/**
 * Client Model - v4
 */

import type { Entity, Archivable } from './common';

export type ClientType = 'company' | 'private';
export type ClientStatus = 'active' | 'prospect' | 'inactive';

export interface Client extends Entity, Archivable {
  clientNumber: string;
  name: string;
  type: ClientType;

  // Contact
  email?: string;
  phone?: string;

  // Address
  street?: string;
  postalCode?: string;
  city?: string;
  country: string;

  // Business (for companies)
  vatNumber?: string;
  kvkNumber?: string;
  contactPerson?: string;

  // Status
  status: ClientStatus;
}

export interface CreateClientInput {
  name: string;
  type: ClientType;
  email?: string;
  phone?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country: string;
  vatNumber?: string;
  kvkNumber?: string;
  contactPerson?: string;
  status?: ClientStatus;
}

export interface UpdateClientInput {
  name?: string;
  type?: ClientType;
  email?: string;
  phone?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  vatNumber?: string;
  kvkNumber?: string;
  contactPerson?: string;
  status?: ClientStatus;
}

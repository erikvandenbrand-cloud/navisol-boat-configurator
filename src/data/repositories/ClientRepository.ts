/**
 * Client Repository - v4
 */

import type { Client, CreateClientInput, UpdateClientInput } from '@/domain/models';
import { generateUUID, generateNumber, now } from '@/domain/models';
import { getAdapter } from '@/data/persistence';
import type { QueryFilter } from '@/data/persistence';

const NAMESPACE = 'clients';

// Track sequence number
let clientSequence = 0;

async function getNextSequence(): Promise<number> {
  const adapter = getAdapter();
  const clients = await adapter.getAll<Client>(NAMESPACE);

  if (clients.length === 0) {
    clientSequence = 1;
  } else {
    // Extract max sequence from existing client numbers
    const maxSeq = clients.reduce((max, client) => {
      const match = client.clientNumber.match(/CLI-\d{4}-(\d{4})/);
      if (match) {
        const seq = parseInt(match[1], 10);
        return seq > max ? seq : max;
      }
      return max;
    }, 0);
    clientSequence = maxSeq + 1;
  }

  return clientSequence++;
}

export const ClientRepository = {
  async getById(id: string): Promise<Client | null> {
    const adapter = getAdapter();
    return adapter.getById<Client>(NAMESPACE, id);
  },

  async getAll(): Promise<Client[]> {
    const adapter = getAdapter();
    return adapter.getAll<Client>(NAMESPACE);
  },

  async getActive(): Promise<Client[]> {
    const adapter = getAdapter();
    return adapter.query<Client>(NAMESPACE, {
      where: { status: 'active', archivedAt: undefined },
      orderBy: { field: 'name', direction: 'asc' },
    });
  },

  async query(filter: QueryFilter): Promise<Client[]> {
    const adapter = getAdapter();
    return adapter.query<Client>(NAMESPACE, filter);
  },

  async create(input: CreateClientInput): Promise<Client> {
    const adapter = getAdapter();
    const seq = await getNextSequence();

    const client: Client = {
      id: generateUUID(),
      clientNumber: generateNumber('CLI', seq),
      name: input.name,
      type: input.type,
      email: input.email,
      phone: input.phone,
      street: input.street,
      postalCode: input.postalCode,
      city: input.city,
      country: input.country,
      vatNumber: input.vatNumber,
      kvkNumber: input.kvkNumber,
      contactPerson: input.contactPerson,
      status: input.status || 'active',
      createdAt: now(),
      updatedAt: now(),
      version: 0,
    };

    await adapter.save(NAMESPACE, client);
    return client;
  },

  async update(id: string, input: UpdateClientInput): Promise<Client | null> {
    const adapter = getAdapter();
    const existing = await adapter.getById<Client>(NAMESPACE, id);

    if (!existing) return null;

    const updated: Client = {
      ...existing,
      ...input,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await adapter.save(NAMESPACE, updated);
    return updated;
  },

  async archive(id: string, userId: string, reason: string): Promise<Client | null> {
    const adapter = getAdapter();
    const existing = await adapter.getById<Client>(NAMESPACE, id);

    if (!existing) return null;

    const archived: Client = {
      ...existing,
      status: 'inactive',
      archivedAt: now(),
      archivedBy: userId,
      archiveReason: reason,
      updatedAt: now(),
      version: existing.version + 1,
    };

    await adapter.save(NAMESPACE, archived);
    return archived;
  },

  async count(): Promise<number> {
    const adapter = getAdapter();
    return adapter.count(NAMESPACE);
  },

  async search(query: string): Promise<Client[]> {
    const adapter = getAdapter();
    const all = await adapter.getAll<Client>(NAMESPACE);

    const lowerQuery = query.toLowerCase();
    return all.filter(
      (client) =>
        client.name.toLowerCase().includes(lowerQuery) ||
        client.email?.toLowerCase().includes(lowerQuery) ||
        client.clientNumber.toLowerCase().includes(lowerQuery)
    );
  },
};

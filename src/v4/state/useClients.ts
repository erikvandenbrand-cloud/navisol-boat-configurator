/**
 * Clients State Hook - v4
 * UI state management for clients
 */

import { useState, useEffect, useCallback } from 'react';
import type { Client, ClientStatus } from '@/domain/models';
import { ClientRepository } from '@/data/repositories';

interface UseClientsOptions {
  status?: ClientStatus;
  includeArchived?: boolean;
}

interface UseClientsReturn {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useClients(options: UseClientsOptions = {}): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result: Client[];

      if (options.status) {
        result = await ClientRepository.query({
          where: { status: options.status },
          orderBy: { field: 'name', direction: 'asc' },
        });
      } else {
        result = await ClientRepository.getAll();
      }

      // Filter archived if needed
      if (!options.includeArchived) {
        result = result.filter((c) => !c.archivedAt);
      }

      // Sort by name
      result.sort((a, b) => a.name.localeCompare(b.name));

      setClients(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  }, [options.status, options.includeArchived]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    clients,
    isLoading,
    error,
    refresh: load,
  };
}

interface UseClientReturn {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useClient(clientId: string | null): UseClientReturn {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) {
      setClient(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await ClientRepository.getById(clientId);
      setClient(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load client');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    client,
    isLoading,
    error,
    refresh: load,
  };
}

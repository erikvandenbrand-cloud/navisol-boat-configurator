/**
 * Audit State Hook - v4
 * UI state management for audit logs
 */

import { useState, useEffect, useCallback } from 'react';
import type { AuditEntry } from '@/domain/models';
import { AuditRepository } from '@/data/repositories';

interface UseAuditOptions {
  entityType?: string;
  entityId?: string;
  limit?: number;
}

interface UseAuditReturn {
  entries: AuditEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAudit(options: UseAuditOptions = {}): UseAuditReturn {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result: AuditEntry[];

      if (options.entityType && options.entityId) {
        result = await AuditRepository.getByEntity(options.entityType, options.entityId);
      } else {
        result = await AuditRepository.getRecent(options.limit || 50);
      }

      setEntries(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setIsLoading(false);
    }
  }, [options.entityType, options.entityId, options.limit]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    entries,
    isLoading,
    error,
    refresh: load,
  };
}

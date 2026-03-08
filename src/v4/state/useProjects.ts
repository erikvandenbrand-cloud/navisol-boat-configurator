/**
 * Projects State Hook - v4
 * UI state management for projects
 */

import { useState, useEffect, useCallback } from 'react';
import type { Project, ProjectStatus } from '@/domain/models';
import { ProjectRepository } from '@/data/repositories';

interface UseProjectsOptions {
  status?: ProjectStatus;
  clientId?: string;
  includeArchived?: boolean;
}

interface UseProjectsReturn {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result: Project[];

      if (options.status) {
        result = await ProjectRepository.getByStatus(options.status);
      } else if (options.clientId) {
        result = await ProjectRepository.getByClient(options.clientId);
      } else {
        result = await ProjectRepository.getAll();
      }

      // Filter archived if needed
      if (!options.includeArchived) {
        result = result.filter((p) => !p.archivedAt);
      }

      // Sort by creation date, newest first
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setProjects(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [options.status, options.clientId, options.includeArchived]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    projects,
    isLoading,
    error,
    refresh: load,
  };
}

interface UseProjectReturn {
  project: Project | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProject(projectId: string | null): UseProjectReturn {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await ProjectRepository.getById(projectId);
      setProject(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    project,
    isLoading,
    error,
    refresh: load,
  };
}

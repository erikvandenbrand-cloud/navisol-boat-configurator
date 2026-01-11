/**
 * Resource Planner Tests
 * Minimal tests for the Resource Planner multi-project view
 */

import { describe, it, expect } from 'bun:test';
import type { Project, PlanningTask, PlanningResource } from '@/domain/models';
import { generateUUID, now } from '@/domain/models';

// ============================================
// TEST HELPERS
// ============================================

function createTestProject(overrides: Partial<Project> = {}): Project {
  return {
    id: generateUUID(),
    projectNumber: 'PRJ-TEST-001',
    title: 'Test Project',
    type: 'NEW_BUILD',
    status: 'IN_PRODUCTION',
    clientId: 'client-123',
    configuration: {
      propulsionType: 'OUTBOARD',
      items: [],
      subtotalExclVat: 0,
      totalExclVat: 0,
      vatRate: 21,
      vatAmount: 0,
      totalInclVat: 0,
      isFrozen: false,
      lastModifiedAt: now(),
      lastModifiedBy: 'test-user',
    },
    configurationSnapshots: [],
    quotes: [],
    bomSnapshots: [],
    documents: [],
    amendments: [],
    tasks: [],
    createdAt: now(),
    createdBy: 'test-user',
    updatedAt: now(),
    version: 0,
    ...overrides,
  };
}

// ============================================
// RESOURCE AGGREGATION LOGIC TESTS
// ============================================

describe('Resource Planner Aggregation Logic', () => {
  describe('Resource name normalization', () => {
    it('should normalize resources by exact name match across projects', () => {
      const project1 = createTestProject({
        id: 'project-1',
        title: 'Project 1',
        planning: {
          resources: [{ id: 'res-1a', name: 'John Smith', role: 'Technician' }],
          tasks: [
            {
              id: 'task-1',
              title: 'Task A',
              startDate: '2025-01-13',
              endDate: '2025-01-17',
              assigneeResourceIds: ['res-1a'],
            },
          ],
        },
      });

      const project2 = createTestProject({
        id: 'project-2',
        title: 'Project 2',
        planning: {
          resources: [{ id: 'res-2a', name: 'John Smith', role: 'Lead' }], // Same name, different ID
          tasks: [
            {
              id: 'task-2',
              title: 'Task B',
              startDate: '2025-01-14',
              endDate: '2025-01-18',
              assigneeResourceIds: ['res-2a'],
            },
          ],
        },
      });

      // Simulate aggregation logic
      const projects = [project1, project2];
      const resourceMap = new Map<string, { projectId: string; task: PlanningTask }[]>();

      for (const project of projects) {
        const projectResources = project.planning?.resources || [];
        const projectTasks = project.planning?.tasks || [];

        const idToName = new Map<string, string>();
        for (const res of projectResources) {
          idToName.set(res.id, res.name);
        }

        for (const task of projectTasks) {
          const firstAssigneeId = task.assigneeResourceIds?.[0];
          if (firstAssigneeId) {
            const resourceName = idToName.get(firstAssigneeId);
            if (resourceName) {
              if (!resourceMap.has(resourceName)) {
                resourceMap.set(resourceName, []);
              }
              resourceMap.get(resourceName)!.push({ projectId: project.id, task });
            }
          }
        }
      }

      // Both tasks should be grouped under 'John Smith'
      expect(resourceMap.has('John Smith')).toBe(true);
      expect(resourceMap.get('John Smith')?.length).toBe(2);
    });

    it('should keep different resource names separate', () => {
      const project = createTestProject({
        planning: {
          resources: [
            { id: 'res-1', name: 'John Smith' },
            { id: 'res-2', name: 'Jane Doe' },
          ],
          tasks: [
            {
              id: 'task-1',
              title: 'Task A',
              startDate: '2025-01-13',
              endDate: '2025-01-17',
              assigneeResourceIds: ['res-1'],
            },
            {
              id: 'task-2',
              title: 'Task B',
              startDate: '2025-01-14',
              endDate: '2025-01-18',
              assigneeResourceIds: ['res-2'],
            },
          ],
        },
      });

      const projectResources = project.planning?.resources || [];
      const projectTasks = project.planning?.tasks || [];
      const resourceMap = new Map<string, PlanningTask[]>();

      const idToName = new Map<string, string>();
      for (const res of projectResources) {
        idToName.set(res.id, res.name);
      }

      for (const task of projectTasks) {
        const firstAssigneeId = task.assigneeResourceIds?.[0];
        if (firstAssigneeId) {
          const resourceName = idToName.get(firstAssigneeId);
          if (resourceName) {
            if (!resourceMap.has(resourceName)) {
              resourceMap.set(resourceName, []);
            }
            resourceMap.get(resourceName)!.push(task);
          }
        }
      }

      expect(resourceMap.size).toBe(2);
      expect(resourceMap.has('John Smith')).toBe(true);
      expect(resourceMap.has('Jane Doe')).toBe(true);
    });
  });

  describe('Unassigned tasks handling', () => {
    it('should track unassigned tasks separately', () => {
      const project = createTestProject({
        planning: {
          resources: [{ id: 'res-1', name: 'John Smith' }],
          tasks: [
            {
              id: 'task-1',
              title: 'Assigned Task',
              startDate: '2025-01-13',
              endDate: '2025-01-17',
              assigneeResourceIds: ['res-1'],
            },
            {
              id: 'task-2',
              title: 'Unassigned Task',
              startDate: '2025-01-14',
              endDate: '2025-01-18',
              assigneeResourceIds: [], // No assignees
            },
          ],
        },
      });

      const projectResources = project.planning?.resources || [];
      const projectTasks = project.planning?.tasks || [];
      const assignedMap = new Map<string, PlanningTask[]>();
      const unassignedTasks: PlanningTask[] = [];

      const idToName = new Map<string, string>();
      for (const res of projectResources) {
        idToName.set(res.id, res.name);
      }

      for (const task of projectTasks) {
        const firstAssigneeId = task.assigneeResourceIds?.[0];
        if (firstAssigneeId) {
          const resourceName = idToName.get(firstAssigneeId);
          if (resourceName) {
            if (!assignedMap.has(resourceName)) {
              assignedMap.set(resourceName, []);
            }
            assignedMap.get(resourceName)!.push(task);
          } else {
            unassignedTasks.push(task);
          }
        } else {
          unassignedTasks.push(task);
        }
      }

      expect(assignedMap.get('John Smith')?.length).toBe(1);
      expect(unassignedTasks.length).toBe(1);
      expect(unassignedTasks[0].title).toBe('Unassigned Task');
    });
  });

  describe('First assignee logic', () => {
    it('should use first assignee for task categorization', () => {
      const project = createTestProject({
        planning: {
          resources: [
            { id: 'res-1', name: 'John Smith' },
            { id: 'res-2', name: 'Jane Doe' },
          ],
          tasks: [
            {
              id: 'task-1',
              title: 'Multi-assignee Task',
              startDate: '2025-01-13',
              endDate: '2025-01-17',
              assigneeResourceIds: ['res-1', 'res-2'], // John is first
            },
          ],
        },
      });

      const projectResources = project.planning?.resources || [];
      const projectTasks = project.planning?.tasks || [];
      const resourceMap = new Map<string, PlanningTask[]>();

      const idToName = new Map<string, string>();
      for (const res of projectResources) {
        idToName.set(res.id, res.name);
      }

      for (const task of projectTasks) {
        const firstAssigneeId = task.assigneeResourceIds?.[0]; // First assignee only
        if (firstAssigneeId) {
          const resourceName = idToName.get(firstAssigneeId);
          if (resourceName) {
            if (!resourceMap.has(resourceName)) {
              resourceMap.set(resourceName, []);
            }
            resourceMap.get(resourceName)!.push(task);
          }
        }
      }

      // Task should only appear under John Smith (first assignee)
      expect(resourceMap.get('John Smith')?.length).toBe(1);
      expect(resourceMap.has('Jane Doe')).toBe(false);
    });
  });
});

// ============================================
// WEEK OVERLAP DETECTION TESTS
// ============================================

describe('Task Week Overlap Detection', () => {
  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function parseDate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
  }

  function taskOverlapsWeek(
    taskStart: string,
    taskEnd: string,
    weekStart: Date,
    weekEnd: Date
  ): boolean {
    const start = parseDate(taskStart);
    const end = parseDate(taskEnd);
    return start <= weekEnd && end >= weekStart;
  }

  it('should detect task fully within week', () => {
    const weekStart = new Date('2025-01-13T00:00:00'); // Monday
    const weekEnd = new Date('2025-01-19T00:00:00'); // Sunday

    expect(taskOverlapsWeek('2025-01-14', '2025-01-16', weekStart, weekEnd)).toBe(true);
  });

  it('should detect task spanning entire week', () => {
    const weekStart = new Date('2025-01-13T00:00:00');
    const weekEnd = new Date('2025-01-19T00:00:00');

    expect(taskOverlapsWeek('2025-01-10', '2025-01-25', weekStart, weekEnd)).toBe(true);
  });

  it('should detect task starting before and ending during week', () => {
    const weekStart = new Date('2025-01-13T00:00:00');
    const weekEnd = new Date('2025-01-19T00:00:00');

    expect(taskOverlapsWeek('2025-01-10', '2025-01-15', weekStart, weekEnd)).toBe(true);
  });

  it('should detect task starting during and ending after week', () => {
    const weekStart = new Date('2025-01-13T00:00:00');
    const weekEnd = new Date('2025-01-19T00:00:00');

    expect(taskOverlapsWeek('2025-01-17', '2025-01-25', weekStart, weekEnd)).toBe(true);
  });

  it('should NOT detect task completely before week', () => {
    const weekStart = new Date('2025-01-13T00:00:00');
    const weekEnd = new Date('2025-01-19T00:00:00');

    expect(taskOverlapsWeek('2025-01-01', '2025-01-10', weekStart, weekEnd)).toBe(false);
  });

  it('should NOT detect task completely after week', () => {
    const weekStart = new Date('2025-01-13T00:00:00');
    const weekEnd = new Date('2025-01-19T00:00:00');

    expect(taskOverlapsWeek('2025-01-25', '2025-01-30', weekStart, weekEnd)).toBe(false);
  });

  it('should detect task ending on week start date (boundary)', () => {
    const weekStart = new Date('2025-01-13T00:00:00');
    const weekEnd = new Date('2025-01-19T00:00:00');

    expect(taskOverlapsWeek('2025-01-10', '2025-01-13', weekStart, weekEnd)).toBe(true);
  });

  it('should detect task starting on week end date (boundary)', () => {
    const weekStart = new Date('2025-01-13T00:00:00');
    const weekEnd = new Date('2025-01-19T00:00:00');

    expect(taskOverlapsWeek('2025-01-19', '2025-01-25', weekStart, weekEnd)).toBe(true);
  });
});

// ============================================
// EFFECTIVE END DATE CALCULATION TESTS
// ============================================

describe('Effective End Date Calculation', () => {
  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function formatDateISO(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function parseDate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
  }

  function getEffectiveEndDate(task: { startDate?: string; endDate?: string; durationDays?: number }): string | undefined {
    if (task.endDate) return task.endDate;
    if (task.startDate && task.durationDays && task.durationDays > 0) {
      const start = parseDate(task.startDate);
      const end = addDays(start, task.durationDays - 1);
      return formatDateISO(end);
    }
    return undefined;
  }

  it('should return endDate if present', () => {
    const task = { startDate: '2025-01-13', endDate: '2025-01-20', durationDays: 5 };
    expect(getEffectiveEndDate(task)).toBe('2025-01-20');
  });

  it('should calculate end date from duration if endDate missing', () => {
    const task = { startDate: '2025-01-13', durationDays: 5 };
    // 5 days from Jan 13 = Jan 13 + 4 days = Jan 17
    expect(getEffectiveEndDate(task)).toBe('2025-01-17');
  });

  it('should return undefined if no endDate and no valid duration', () => {
    const task = { startDate: '2025-01-13' };
    expect(getEffectiveEndDate(task)).toBeUndefined();
  });

  it('should return undefined if no startDate', () => {
    const task = { durationDays: 5 };
    expect(getEffectiveEndDate(task)).toBeUndefined();
  });

  it('should handle single day duration (1 day)', () => {
    const task = { startDate: '2025-01-13', durationDays: 1 };
    expect(getEffectiveEndDate(task)).toBe('2025-01-13'); // Same day
  });
});

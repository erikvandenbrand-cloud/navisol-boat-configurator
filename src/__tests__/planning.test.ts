/**
 * Planning Tests (Prod.P3.1)
 * Tests for Planning data model structure and persistence
 */

import { describe, it, expect } from 'bun:test';
import type { Project, PlanningTask, PlanningResource, ProjectPlanning } from '@/domain/models';
import { generateUUID, now } from '@/domain/models';

// ============================================
// TEST HELPERS
// ============================================

function createTestProject(overrides: Partial<Project> = {}): Project {
  return {
    id: generateUUID(),
    projectNumber: 'P-TEST-001',
    title: 'Test Boat Project',
    type: 'NEW_BUILD',
    status: 'DRAFT',
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
    isArchived: false,
    createdAt: now(),
    createdBy: 'test-user',
    updatedAt: now(),
    version: 0,
    ...overrides,
  };
}

function createTestPlanningTask(overrides: Partial<PlanningTask> = {}): PlanningTask {
  return {
    id: generateUUID(),
    title: 'Test Planning Task',
    startDate: '2025-01-15',
    endDate: '2025-01-20',
    durationDays: 5,
    status: 'TODO',
    assigneeResourceIds: [],
    dependsOnTaskIds: [],
    notes: 'Test notes',
    ...overrides,
  };
}

function createTestPlanningResource(overrides: Partial<PlanningResource> = {}): PlanningResource {
  return {
    id: generateUUID(),
    name: 'Test Resource',
    role: 'Technician',
    capacityPct: 100,
    notes: 'Test resource notes',
    ...overrides,
  };
}

// ============================================
// MODEL STRUCTURE TESTS
// ============================================

describe('Planning Model Structure', () => {
  describe('PlanningTask interface', () => {
    it('should have required id and title fields', () => {
      const task = createTestPlanningTask();
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Planning Task');
    });

    it('should have optional startDate and endDate fields', () => {
      const task = createTestPlanningTask({ startDate: undefined, endDate: undefined });
      expect(task.startDate).toBeUndefined();
      expect(task.endDate).toBeUndefined();
    });

    it('should have optional durationDays field', () => {
      const task = createTestPlanningTask({ durationDays: undefined });
      expect(task.durationDays).toBeUndefined();
    });

    it('should have optional status field with valid values', () => {
      const statuses = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
      for (const status of statuses) {
        const task = createTestPlanningTask({ status });
        expect(task.status).toBe(status);
      }
    });

    it('should have optional assigneeResourceIds array', () => {
      const task = createTestPlanningTask({ assigneeResourceIds: ['res-1', 'res-2'] });
      expect(task.assigneeResourceIds).toEqual(['res-1', 'res-2']);
    });

    it('should have optional dependsOnTaskIds array', () => {
      const task = createTestPlanningTask({ dependsOnTaskIds: ['task-1', 'task-2'] });
      expect(task.dependsOnTaskIds).toEqual(['task-1', 'task-2']);
    });

    it('should have optional notes field', () => {
      const task = createTestPlanningTask({ notes: undefined });
      expect(task.notes).toBeUndefined();
    });

    it('should support minimal task with only id and title', () => {
      const task: PlanningTask = { id: 'task-min', title: 'Minimal Task' };
      expect(task.id).toBe('task-min');
      expect(task.title).toBe('Minimal Task');
      expect(task.startDate).toBeUndefined();
      expect(task.status).toBeUndefined();
    });
  });

  describe('PlanningResource interface', () => {
    it('should have required id and name fields', () => {
      const resource = createTestPlanningResource();
      expect(resource.id).toBeDefined();
      expect(resource.name).toBe('Test Resource');
    });

    it('should have optional role field', () => {
      const resource = createTestPlanningResource({ role: undefined });
      expect(resource.role).toBeUndefined();
    });

    it('should have optional capacityPct field', () => {
      const resource = createTestPlanningResource({ capacityPct: 50 });
      expect(resource.capacityPct).toBe(50);
    });

    it('should have optional notes field', () => {
      const resource = createTestPlanningResource({ notes: undefined });
      expect(resource.notes).toBeUndefined();
    });

    it('should support minimal resource with only id and name', () => {
      const resource: PlanningResource = { id: 'res-min', name: 'Minimal Resource' };
      expect(resource.id).toBe('res-min');
      expect(resource.name).toBe('Minimal Resource');
      expect(resource.role).toBeUndefined();
      expect(resource.capacityPct).toBeUndefined();
    });
  });

  describe('ProjectPlanning interface', () => {
    it('should have optional tasks array', () => {
      const planning: ProjectPlanning = { tasks: [] };
      expect(planning.tasks).toEqual([]);
    });

    it('should have optional resources array', () => {
      const planning: ProjectPlanning = { resources: [] };
      expect(planning.resources).toEqual([]);
    });

    it('should support empty planning object', () => {
      const planning: ProjectPlanning = {};
      expect(planning.tasks).toBeUndefined();
      expect(planning.resources).toBeUndefined();
    });
  });
});

// ============================================
// PROJECT WITH PLANNING TESTS
// ============================================

describe('Project with planning field', () => {
  it('should have optional planning field', () => {
    const project = createTestProject();
    expect(project.planning).toBeUndefined();
  });

  it('should allow empty planning object', () => {
    const project = createTestProject({ planning: {} });
    expect(project.planning).toEqual({});
  });

  it('should store planning with tasks', () => {
    const tasks: PlanningTask[] = [
      createTestPlanningTask({ id: 'task-1', title: 'Task 1' }),
      createTestPlanningTask({ id: 'task-2', title: 'Task 2' }),
    ];
    const project = createTestProject({ planning: { tasks } });
    expect(project.planning?.tasks?.length).toBe(2);
  });

  it('should store planning with resources', () => {
    const resources: PlanningResource[] = [
      createTestPlanningResource({ id: 'res-1', name: 'Resource 1' }),
      createTestPlanningResource({ id: 'res-2', name: 'Resource 2' }),
    ];
    const project = createTestProject({ planning: { resources } });
    expect(project.planning?.resources?.length).toBe(2);
  });

  it('should store planning with both tasks and resources', () => {
    const planning: ProjectPlanning = {
      tasks: [createTestPlanningTask()],
      resources: [createTestPlanningResource()],
    };
    const project = createTestProject({ planning });
    expect(project.planning?.tasks?.length).toBe(1);
    expect(project.planning?.resources?.length).toBe(1);
  });
});

// ============================================
// SERIALIZATION TESTS (for ZIP roundtrip)
// ============================================

describe('Planning Serialization (ZIP roundtrip)', () => {
  it('should serialize planning to JSON correctly', () => {
    const planning: ProjectPlanning = {
      tasks: [
        {
          id: 'task-1',
          title: 'Hull Assembly',
          startDate: '2025-01-15',
          endDate: '2025-01-25',
          durationDays: 10,
          status: 'IN_PROGRESS',
          assigneeResourceIds: ['res-1'],
          dependsOnTaskIds: [],
          notes: 'Start with frames',
        },
      ],
      resources: [
        {
          id: 'res-1',
          name: 'John Smith',
          role: 'Lead Technician',
          capacityPct: 100,
          notes: 'Full-time',
        },
      ],
    };
    const project = createTestProject({ planning });

    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;

    expect(parsed.planning?.tasks?.length).toBe(1);
    expect(parsed.planning?.tasks?.[0].title).toBe('Hull Assembly');
    expect(parsed.planning?.tasks?.[0].status).toBe('IN_PROGRESS');
    expect(parsed.planning?.tasks?.[0].assigneeResourceIds).toEqual(['res-1']);
    expect(parsed.planning?.resources?.length).toBe(1);
    expect(parsed.planning?.resources?.[0].name).toBe('John Smith');
    expect(parsed.planning?.resources?.[0].capacityPct).toBe(100);
  });

  it('should handle undefined optional fields in serialization', () => {
    const planning: ProjectPlanning = {
      tasks: [{ id: 'task-min', title: 'Minimal Task' }],
      resources: [{ id: 'res-min', name: 'Minimal Resource' }],
    };
    const project = createTestProject({ planning });

    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;

    expect(parsed.planning?.tasks?.[0].title).toBe('Minimal Task');
    expect(parsed.planning?.tasks?.[0].startDate).toBeUndefined();
    expect(parsed.planning?.tasks?.[0].status).toBeUndefined();
    expect(parsed.planning?.resources?.[0].name).toBe('Minimal Resource');
    expect(parsed.planning?.resources?.[0].role).toBeUndefined();
  });

  it('should preserve empty arrays in serialization', () => {
    const planning: ProjectPlanning = { tasks: [], resources: [] };
    const project = createTestProject({ planning });

    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;

    expect(parsed.planning?.tasks).toEqual([]);
    expect(parsed.planning?.resources).toEqual([]);
  });

  it('should preserve empty planning object in serialization', () => {
    const project = createTestProject({ planning: {} });

    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;

    expect(parsed.planning).toEqual({});
  });
});

// ============================================
// LEGACY IMPORT SAFETY TESTS
// ============================================

describe('Planning Legacy Import Safety', () => {
  it('should handle missing planning field in deserialization', () => {
    const project = createTestProject();
    delete (project as Partial<Project>).planning;

    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;

    expect(parsed.planning).toBeUndefined();
  });

  it('should safely access planning on legacy project without field', () => {
    const legacyProject = createTestProject();
    // Simulate legacy project without planning field
    const legacyJson = JSON.stringify(legacyProject);
    const parsed = JSON.parse(legacyJson) as Project;

    // Safe access patterns should not throw
    const tasks = parsed.planning?.tasks || [];
    const resources = parsed.planning?.resources || [];

    expect(tasks).toEqual([]);
    expect(resources).toEqual([]);
  });

  it('should handle null planning field gracefully', () => {
    const project = createTestProject();
    // Simulate corrupted data with null
    const json = JSON.stringify(project).replace('"planning":undefined', '"planning":null');
    const parsed = JSON.parse(json) as Project;

    // Optional chaining should handle null
    const tasks = parsed.planning?.tasks || [];
    expect(tasks).toEqual([]);
  });

  it('should handle partial planning object (only tasks)', () => {
    const planning: ProjectPlanning = {
      tasks: [createTestPlanningTask()],
      // resources intentionally omitted
    };
    const project = createTestProject({ planning });

    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;

    expect(parsed.planning?.tasks?.length).toBe(1);
    expect(parsed.planning?.resources).toBeUndefined();
  });

  it('should handle partial planning object (only resources)', () => {
    const planning: ProjectPlanning = {
      // tasks intentionally omitted
      resources: [createTestPlanningResource()],
    };
    const project = createTestProject({ planning });

    const json = JSON.stringify(project);
    const parsed = JSON.parse(json) as Project;

    expect(parsed.planning?.tasks).toBeUndefined();
    expect(parsed.planning?.resources?.length).toBe(1);
  });
});

// ============================================
// DATA OPERATIONS TESTS
// ============================================

describe('Planning Data Operations', () => {
  it('should add task to empty tasks list', () => {
    const project = createTestProject({ planning: { tasks: [] } });
    const newTask = createTestPlanningTask({ id: 'new-task', title: 'New Task' });

    const updatedTasks = [...(project.planning?.tasks || []), newTask];
    expect(updatedTasks.length).toBe(1);
    expect(updatedTasks[0].title).toBe('New Task');
  });

  it('should add resource to existing resources list', () => {
    const existingResource = createTestPlanningResource({ id: 'res-1', name: 'Existing' });
    const project = createTestProject({ planning: { resources: [existingResource] } });
    const newResource = createTestPlanningResource({ id: 'res-2', name: 'New Resource' });

    const updatedResources = [...(project.planning?.resources || []), newResource];
    expect(updatedResources.length).toBe(2);
  });

  it('should remove task from list', () => {
    const tasks: PlanningTask[] = [
      createTestPlanningTask({ id: 'task-1', title: 'Task 1' }),
      createTestPlanningTask({ id: 'task-2', title: 'Task 2' }),
      createTestPlanningTask({ id: 'task-3', title: 'Task 3' }),
    ];
    const project = createTestProject({ planning: { tasks } });

    const filtered = (project.planning?.tasks || []).filter(t => t.id !== 'task-2');
    expect(filtered.length).toBe(2);
    expect(filtered.find(t => t.id === 'task-2')).toBeUndefined();
  });

  it('should update existing task', () => {
    const tasks: PlanningTask[] = [
      createTestPlanningTask({ id: 'task-1', status: 'TODO' }),
    ];
    const project = createTestProject({ planning: { tasks } });

    const updated = (project.planning?.tasks || []).map(t =>
      t.id === 'task-1' ? { ...t, status: 'DONE' as const, notes: 'Completed' } : t
    );

    expect(updated[0].status).toBe('DONE');
    expect(updated[0].notes).toBe('Completed');
  });

  it('should find resource by id', () => {
    const resources: PlanningResource[] = [
      createTestPlanningResource({ id: 'res-1', name: 'Resource 1' }),
      createTestPlanningResource({ id: 'res-2', name: 'Resource 2' }),
    ];
    const project = createTestProject({ planning: { resources } });

    const found = (project.planning?.resources || []).find(r => r.id === 'res-2');
    expect(found?.name).toBe('Resource 2');
  });

  it('should link task to resources via assigneeResourceIds', () => {
    const resources: PlanningResource[] = [
      createTestPlanningResource({ id: 'res-1', name: 'John' }),
      createTestPlanningResource({ id: 'res-2', name: 'Jane' }),
    ];
    const tasks: PlanningTask[] = [
      createTestPlanningTask({ id: 'task-1', assigneeResourceIds: ['res-1', 'res-2'] }),
    ];
    const project = createTestProject({ planning: { tasks, resources } });

    const task = project.planning?.tasks?.[0];
    const assignees = (task?.assigneeResourceIds || []).map(resId =>
      project.planning?.resources?.find(r => r.id === resId)
    );

    expect(assignees.length).toBe(2);
    expect(assignees[0]?.name).toBe('John');
    expect(assignees[1]?.name).toBe('Jane');
  });

  it('should link task dependencies via dependsOnTaskIds', () => {
    const tasks: PlanningTask[] = [
      createTestPlanningTask({ id: 'task-1', title: 'Prerequisite' }),
      createTestPlanningTask({ id: 'task-2', title: 'Dependent', dependsOnTaskIds: ['task-1'] }),
    ];
    const project = createTestProject({ planning: { tasks } });

    const dependentTask = project.planning?.tasks?.find(t => t.id === 'task-2');
    const dependencies = (dependentTask?.dependsOnTaskIds || []).map(depId =>
      project.planning?.tasks?.find(t => t.id === depId)
    );

    expect(dependencies.length).toBe(1);
    expect(dependencies[0]?.title).toBe('Prerequisite');
  });
});

// ============================================
// PROJECT TYPE COMPATIBILITY TESTS
// ============================================

describe('Planning Project Type Compatibility', () => {
  it('should allow planning for NEW_BUILD projects', () => {
    const project = createTestProject({
      type: 'NEW_BUILD',
      planning: { tasks: [createTestPlanningTask()] },
    });
    expect(project.type).toBe('NEW_BUILD');
    expect(project.planning?.tasks?.length).toBe(1);
  });

  it('should allow planning for REFIT projects', () => {
    const project = createTestProject({
      type: 'REFIT',
      planning: { tasks: [createTestPlanningTask()] },
    });
    expect(project.type).toBe('REFIT');
    expect(project.planning?.tasks?.length).toBe(1);
  });

  it('should allow planning for MAINTENANCE projects', () => {
    const project = createTestProject({
      type: 'MAINTENANCE',
      planning: { tasks: [createTestPlanningTask()] },
    });
    expect(project.type).toBe('MAINTENANCE');
    expect(project.planning?.tasks?.length).toBe(1);
  });
});

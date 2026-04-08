/**
 * Planning CRUD Tests (Prod.P3.2)
 * Tests for Planning tab CRUD data operations
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
    projectNumber: 'P-CRUD-TEST-001',
    title: 'CRUD Test Project',
    type: 'NEW_BUILD',
    status: 'DRAFT',
    clientId: 'client-crud-test',
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
// TASK CRUD OPERATIONS
// ============================================

describe('Planning Task CRUD Operations', () => {
  describe('Add Task', () => {
    it('should add task to empty planning', () => {
      const project = createTestProject();
      const newTask = createTestPlanningTask({ id: 'task-add-1', title: 'New Task' });

      const updatedPlanning: ProjectPlanning = {
        tasks: [newTask],
        resources: project.planning?.resources || [],
      };

      expect(updatedPlanning.tasks?.length).toBe(1);
      expect(updatedPlanning.tasks?.[0].title).toBe('New Task');
    });

    it('should add task to existing tasks list', () => {
      const existingTask = createTestPlanningTask({ id: 'task-1', title: 'Existing' });
      const project = createTestProject({
        planning: { tasks: [existingTask], resources: [] },
      });
      const newTask = createTestPlanningTask({ id: 'task-2', title: 'New Task' });

      const updatedTasks = [...(project.planning?.tasks || []), newTask];

      expect(updatedTasks.length).toBe(2);
      expect(updatedTasks[1].title).toBe('New Task');
    });

    it('should preserve task assigneeResourceIds on add', () => {
      const task = createTestPlanningTask({
        id: 'task-assign',
        assigneeResourceIds: ['res-1', 'res-2'],
      });

      const planning: ProjectPlanning = { tasks: [task], resources: [] };

      expect(planning.tasks?.[0].assigneeResourceIds).toEqual(['res-1', 'res-2']);
    });

    it('should preserve task dependsOnTaskIds on add', () => {
      const task = createTestPlanningTask({
        id: 'task-dep',
        dependsOnTaskIds: ['task-1', 'task-2'],
      });

      const planning: ProjectPlanning = { tasks: [task], resources: [] };

      expect(planning.tasks?.[0].dependsOnTaskIds).toEqual(['task-1', 'task-2']);
    });
  });

  describe('Update Task', () => {
    it('should update task title', () => {
      const task = createTestPlanningTask({ id: 'task-upd', title: 'Original' });
      const project = createTestProject({
        planning: { tasks: [task], resources: [] },
      });

      const updatedTasks = (project.planning?.tasks || []).map((t) =>
        t.id === 'task-upd' ? { ...t, title: 'Updated Title' } : t
      );

      expect(updatedTasks[0].title).toBe('Updated Title');
    });

    it('should update task status', () => {
      const task = createTestPlanningTask({ id: 'task-status', status: 'TODO' });
      const project = createTestProject({
        planning: { tasks: [task], resources: [] },
      });

      const updatedTasks = (project.planning?.tasks || []).map((t) =>
        t.id === 'task-status' ? { ...t, status: 'IN_PROGRESS' as const } : t
      );

      expect(updatedTasks[0].status).toBe('IN_PROGRESS');
    });

    it('should update task dates', () => {
      const task = createTestPlanningTask({
        id: 'task-dates',
        startDate: '2025-01-01',
        endDate: '2025-01-05',
      });
      const project = createTestProject({
        planning: { tasks: [task], resources: [] },
      });

      const updatedTasks = (project.planning?.tasks || []).map((t) =>
        t.id === 'task-dates'
          ? { ...t, startDate: '2025-02-01', endDate: '2025-02-10' }
          : t
      );

      expect(updatedTasks[0].startDate).toBe('2025-02-01');
      expect(updatedTasks[0].endDate).toBe('2025-02-10');
    });

    it('should update task assignees', () => {
      const task = createTestPlanningTask({
        id: 'task-assignees',
        assigneeResourceIds: ['res-1'],
      });
      const project = createTestProject({
        planning: { tasks: [task], resources: [] },
      });

      const updatedTasks = (project.planning?.tasks || []).map((t) =>
        t.id === 'task-assignees'
          ? { ...t, assigneeResourceIds: ['res-1', 'res-2', 'res-3'] }
          : t
      );

      expect(updatedTasks[0].assigneeResourceIds).toEqual(['res-1', 'res-2', 'res-3']);
    });

    it('should update task dependencies', () => {
      const task = createTestPlanningTask({
        id: 'task-deps',
        dependsOnTaskIds: ['task-1'],
      });
      const project = createTestProject({
        planning: { tasks: [task], resources: [] },
      });

      const updatedTasks = (project.planning?.tasks || []).map((t) =>
        t.id === 'task-deps'
          ? { ...t, dependsOnTaskIds: ['task-1', 'task-2'] }
          : t
      );

      expect(updatedTasks[0].dependsOnTaskIds).toEqual(['task-1', 'task-2']);
    });
  });

  describe('Delete Task', () => {
    it('should delete task from list', () => {
      const task1 = createTestPlanningTask({ id: 'task-del-1', title: 'Task 1' });
      const task2 = createTestPlanningTask({ id: 'task-del-2', title: 'Task 2' });
      const project = createTestProject({
        planning: { tasks: [task1, task2], resources: [] },
      });

      const updatedTasks = (project.planning?.tasks || []).filter(
        (t) => t.id !== 'task-del-1'
      );

      expect(updatedTasks.length).toBe(1);
      expect(updatedTasks[0].id).toBe('task-del-2');
    });

    it('should clean up dependencies when task deleted', () => {
      const task1 = createTestPlanningTask({ id: 'task-prereq' });
      const task2 = createTestPlanningTask({
        id: 'task-dependent',
        dependsOnTaskIds: ['task-prereq'],
      });
      const project = createTestProject({
        planning: { tasks: [task1, task2], resources: [] },
      });

      const deletedTaskId = 'task-prereq';
      const remainingTasks = (project.planning?.tasks || []).filter(
        (t) => t.id !== deletedTaskId
      );
      const cleanedTasks = remainingTasks.map((t) => ({
        ...t,
        dependsOnTaskIds: t.dependsOnTaskIds?.filter((id) => id !== deletedTaskId),
      }));

      expect(cleanedTasks.length).toBe(1);
      expect(cleanedTasks[0].dependsOnTaskIds).toEqual([]);
    });
  });
});

// ============================================
// RESOURCE CRUD OPERATIONS
// ============================================

describe('Planning Resource CRUD Operations', () => {
  describe('Add Resource', () => {
    it('should add resource to empty planning', () => {
      const project = createTestProject();
      const newResource = createTestPlanningResource({ id: 'res-add-1', name: 'New Resource' });

      const updatedPlanning: ProjectPlanning = {
        tasks: project.planning?.tasks || [],
        resources: [newResource],
      };

      expect(updatedPlanning.resources?.length).toBe(1);
      expect(updatedPlanning.resources?.[0].name).toBe('New Resource');
    });

    it('should add resource to existing resources list', () => {
      const existingResource = createTestPlanningResource({ id: 'res-1', name: 'Existing' });
      const project = createTestProject({
        planning: { tasks: [], resources: [existingResource] },
      });
      const newResource = createTestPlanningResource({ id: 'res-2', name: 'New Resource' });

      const updatedResources = [...(project.planning?.resources || []), newResource];

      expect(updatedResources.length).toBe(2);
      expect(updatedResources[1].name).toBe('New Resource');
    });

    it('should preserve resource capacityPct on add', () => {
      const resource = createTestPlanningResource({
        id: 'res-cap',
        capacityPct: 75,
      });

      const planning: ProjectPlanning = { tasks: [], resources: [resource] };

      expect(planning.resources?.[0].capacityPct).toBe(75);
    });
  });

  describe('Update Resource', () => {
    it('should update resource name', () => {
      const resource = createTestPlanningResource({ id: 'res-upd', name: 'Original' });
      const project = createTestProject({
        planning: { tasks: [], resources: [resource] },
      });

      const updatedResources = (project.planning?.resources || []).map((r) =>
        r.id === 'res-upd' ? { ...r, name: 'Updated Name' } : r
      );

      expect(updatedResources[0].name).toBe('Updated Name');
    });

    it('should update resource role', () => {
      const resource = createTestPlanningResource({ id: 'res-role', role: 'Junior' });
      const project = createTestProject({
        planning: { tasks: [], resources: [resource] },
      });

      const updatedResources = (project.planning?.resources || []).map((r) =>
        r.id === 'res-role' ? { ...r, role: 'Senior Technician' } : r
      );

      expect(updatedResources[0].role).toBe('Senior Technician');
    });

    it('should update resource capacity', () => {
      const resource = createTestPlanningResource({ id: 'res-cap-upd', capacityPct: 100 });
      const project = createTestProject({
        planning: { tasks: [], resources: [resource] },
      });

      const updatedResources = (project.planning?.resources || []).map((r) =>
        r.id === 'res-cap-upd' ? { ...r, capacityPct: 50 } : r
      );

      expect(updatedResources[0].capacityPct).toBe(50);
    });
  });

  describe('Delete Resource', () => {
    it('should delete resource from list', () => {
      const res1 = createTestPlanningResource({ id: 'res-del-1', name: 'Res 1' });
      const res2 = createTestPlanningResource({ id: 'res-del-2', name: 'Res 2' });
      const project = createTestProject({
        planning: { tasks: [], resources: [res1, res2] },
      });

      const updatedResources = (project.planning?.resources || []).filter(
        (r) => r.id !== 'res-del-1'
      );

      expect(updatedResources.length).toBe(1);
      expect(updatedResources[0].id).toBe('res-del-2');
    });

    it('should clean up assignees when resource deleted', () => {
      const resource = createTestPlanningResource({ id: 'res-to-delete' });
      const task = createTestPlanningTask({
        id: 'task-with-assignee',
        assigneeResourceIds: ['res-to-delete'],
      });
      const project = createTestProject({
        planning: { tasks: [task], resources: [resource] },
      });

      const deletedResourceId = 'res-to-delete';
      const remainingResources = (project.planning?.resources || []).filter(
        (r) => r.id !== deletedResourceId
      );
      const cleanedTasks = (project.planning?.tasks || []).map((t) => ({
        ...t,
        assigneeResourceIds: t.assigneeResourceIds?.filter((id) => id !== deletedResourceId),
      }));

      expect(remainingResources.length).toBe(0);
      expect(cleanedTasks[0].assigneeResourceIds).toEqual([]);
    });
  });
});

// ============================================
// READ-ONLY BEHAVIOR TESTS
// ============================================

describe('Planning Read-Only Behavior', () => {
  it('should identify CLOSED project status', () => {
    const project = createTestProject({ status: 'CLOSED' });
    const isReadOnly = project.status === 'CLOSED';
    expect(isReadOnly).toBe(true);
  });

  it('should identify DRAFT project as editable', () => {
    const project = createTestProject({ status: 'DRAFT' });
    const isReadOnly = project.status === 'CLOSED';
    expect(isReadOnly).toBe(false);
  });

  it('should identify IN_PRODUCTION project as editable', () => {
    const project = createTestProject({ status: 'IN_PRODUCTION' });
    const isReadOnly = project.status === 'CLOSED';
    expect(isReadOnly).toBe(false);
  });

  it('should allow reading planning data for CLOSED project', () => {
    const task = createTestPlanningTask({ title: 'Closed Task' });
    const resource = createTestPlanningResource({ name: 'Closed Resource' });
    const project = createTestProject({
      status: 'CLOSED',
      planning: { tasks: [task], resources: [resource] },
    });

    // Reading should work regardless of status
    expect(project.planning?.tasks?.length).toBe(1);
    expect(project.planning?.tasks?.[0].title).toBe('Closed Task');
    expect(project.planning?.resources?.length).toBe(1);
    expect(project.planning?.resources?.[0].name).toBe('Closed Resource');
  });
});

// ============================================
// SERIALIZATION ROUNDTRIP TESTS
// ============================================

describe('Planning CRUD Serialization', () => {
  it('should preserve all task fields through JSON roundtrip', () => {
    const task = createTestPlanningTask({
      id: 'task-serial',
      title: 'Serialization Test',
      startDate: '2025-03-01',
      endDate: '2025-03-15',
      durationDays: 14,
      status: 'IN_PROGRESS',
      assigneeResourceIds: ['res-1', 'res-2'],
      dependsOnTaskIds: ['task-0'],
      notes: 'Test notes for serialization',
    });

    const serialized = JSON.stringify(task);
    const deserialized = JSON.parse(serialized) as PlanningTask;

    expect(deserialized.id).toBe('task-serial');
    expect(deserialized.title).toBe('Serialization Test');
    expect(deserialized.startDate).toBe('2025-03-01');
    expect(deserialized.endDate).toBe('2025-03-15');
    expect(deserialized.durationDays).toBe(14);
    expect(deserialized.status).toBe('IN_PROGRESS');
    expect(deserialized.assigneeResourceIds).toEqual(['res-1', 'res-2']);
    expect(deserialized.dependsOnTaskIds).toEqual(['task-0']);
    expect(deserialized.notes).toBe('Test notes for serialization');
  });

  it('should preserve all resource fields through JSON roundtrip', () => {
    const resource = createTestPlanningResource({
      id: 'res-serial',
      name: 'Serialization Resource',
      role: 'Lead Engineer',
      capacityPct: 80,
      notes: 'Resource notes',
    });

    const serialized = JSON.stringify(resource);
    const deserialized = JSON.parse(serialized) as PlanningResource;

    expect(deserialized.id).toBe('res-serial');
    expect(deserialized.name).toBe('Serialization Resource');
    expect(deserialized.role).toBe('Lead Engineer');
    expect(deserialized.capacityPct).toBe(80);
    expect(deserialized.notes).toBe('Resource notes');
  });

  it('should preserve planning with tasks and resources through project serialization', () => {
    const task = createTestPlanningTask({ id: 'task-proj-serial' });
    const resource = createTestPlanningResource({ id: 'res-proj-serial' });
    const project = createTestProject({
      planning: { tasks: [task], resources: [resource] },
    });

    const serialized = JSON.stringify(project);
    const deserialized = JSON.parse(serialized) as Project;

    expect(deserialized.planning?.tasks?.length).toBe(1);
    expect(deserialized.planning?.tasks?.[0].id).toBe('task-proj-serial');
    expect(deserialized.planning?.resources?.length).toBe(1);
    expect(deserialized.planning?.resources?.[0].id).toBe('res-proj-serial');
  });
});

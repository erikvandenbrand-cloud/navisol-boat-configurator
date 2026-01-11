/**
 * Bulk Task Assignment Tests
 * Tests for assigning multiple tasks to production stages at once
 */

import { describe, test, expect } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import { ProductionService } from '@/domain/services/ProductionService';
import { TaskService } from '@/domain/services/TaskService';
import type { Project, CreateTaskInput } from '@/domain/models';
import { generateUUID, now, DEFAULT_PRODUCTION_STAGES } from '@/domain/models';

const testContext = {
  userId: 'test-user',
  userName: 'Test User',
};

// Create a mock project with production stages
async function createTestProjectWithStages(): Promise<{ project: Project; stages: string[] }> {
  const projectId = generateUUID();
  const project: Project = {
    id: projectId,
    projectNumber: `TEST-${projectId.slice(0, 6)}`,
    title: 'Test Project',
    type: 'NEW_BUILD',
    status: 'IN_PRODUCTION',
    clientId: 'test-client',
    configuration: {
      propulsionType: 'Electric',
      items: [],
      subtotalExclVat: 0,
      totalExclVat: 0,
      vatRate: 21,
      vatAmount: 0,
      totalInclVat: 0,
      isFrozen: true,
      frozenAt: now(),
      frozenBy: 'test',
      lastModifiedAt: now(),
      lastModifiedBy: 'test',
    },
    configurationSnapshots: [],
    quotes: [],
    bomSnapshots: [],
    documents: [],
    amendments: [],
    tasks: [],
    createdBy: 'test',
    createdAt: now(),
    updatedAt: now(),
    version: 0,
    isArchived: false,
  };

  // Save project
  const { getAdapter } = await import('@/data/persistence');
  await getAdapter().save('projects', project);

  // Initialize stages
  const result = await ProductionService.initializeStages(projectId, testContext);
  if (!result.ok) throw new Error('Failed to initialize stages');

  const stageIds = result.value.map((s) => s.id);

  return { project: { ...project, productionStages: result.value }, stages: stageIds };
}

// ============================================
// BULK ASSIGN TESTS
// ============================================

describe('Bulk Task Assignment - Basic', () => {
  test('should bulk assign multiple tasks to a stage', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create 3 unassigned tasks
    const task1 = await TaskService.createTask(project.id, { title: 'Task 1', category: 'HULL' }, testContext);
    const task2 = await TaskService.createTask(project.id, { title: 'Task 2', category: 'HULL' }, testContext);
    const task3 = await TaskService.createTask(project.id, { title: 'Task 3', category: 'HULL' }, testContext);

    expect(task1.ok && task2.ok && task3.ok).toBe(true);
    if (!task1.ok || !task2.ok || !task3.ok) return;

    const taskIds = [task1.value.id, task2.value.id, task3.value.id];

    // Bulk assign
    const result = await TaskService.bulkAssignToStage(
      project.id,
      taskIds,
      stageId,
      undefined,
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.length).toBe(3);
    expect(result.value.every((t) => t.stageId === stageId)).toBe(true);
  });

  test('should assign tasks with optional assignee', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create unassigned task
    const task = await TaskService.createTask(project.id, { title: 'Unassigned', category: 'OTHER' }, testContext);
    expect(task.ok).toBe(true);
    if (!task.ok) return;

    // Bulk assign with assignee
    const result = await TaskService.bulkAssignToStage(
      project.id,
      [task.value.id],
      stageId,
      { assignedTo: 'John Doe' },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value[0].assignedTo).toBe('John Doe');
    expect(result.value[0].assignedAt).toBeDefined();
  });

  test('should assign tasks with optional due date', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create unassigned task
    const task = await TaskService.createTask(project.id, { title: 'Unassigned', category: 'OTHER' }, testContext);
    expect(task.ok).toBe(true);
    if (!task.ok) return;

    const dueDate = '2026-02-15';

    // Bulk assign with due date
    const result = await TaskService.bulkAssignToStage(
      project.id,
      [task.value.id],
      stageId,
      { dueDate },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value[0].dueDate).toBe(dueDate);
  });

  test('should assign tasks with both assignee and due date', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create unassigned task
    const task = await TaskService.createTask(project.id, { title: 'Full Options', category: 'OTHER' }, testContext);
    expect(task.ok).toBe(true);
    if (!task.ok) return;

    const options = {
      assignedTo: 'Jane Smith',
      dueDate: '2026-03-01',
    };

    // Bulk assign with both options
    const result = await TaskService.bulkAssignToStage(
      project.id,
      [task.value.id],
      stageId,
      options,
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value[0].assignedTo).toBe('Jane Smith');
    expect(result.value[0].dueDate).toBe('2026-03-01');
  });
});

describe('Bulk Task Assignment - Stage Progress', () => {
  test('should recalculate stage progress when autoProgressFromTasks is enabled', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Enable auto progress for stage
    await ProductionService.toggleAutoProgress(project.id, stageId, true, testContext);

    // Create 2 tasks, one completed
    const task1 = await TaskService.createTask(project.id, { title: 'Completed', category: 'HULL' }, testContext);
    const task2 = await TaskService.createTask(project.id, { title: 'Todo', category: 'HULL' }, testContext);

    if (task1.ok) {
      await TaskService.updateTaskStatus(project.id, task1.value.id, 'COMPLETED', testContext);
    }

    expect(task1.ok && task2.ok).toBe(true);
    if (!task1.ok || !task2.ok) return;

    // Bulk assign both tasks
    await TaskService.bulkAssignToStage(
      project.id,
      [task1.value.id, task2.value.id],
      stageId,
      undefined,
      testContext
    );

    // Check stage progress was recalculated (1/2 = 50%)
    const stage = await ProductionService.getStageById(project.id, stageId);
    expect(stage?.progressPercent).toBe(50);
  });

  test('should preserve manual progress when autoProgressFromTasks is disabled', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Set manual progress
    await ProductionService.updateStageProgress(
      project.id,
      stageId,
      { progressPercent: 75 },
      testContext
    );

    // Create and bulk assign task
    const task = await TaskService.createTask(project.id, { title: 'Test', category: 'HULL' }, testContext);
    expect(task.ok).toBe(true);
    if (!task.ok) return;

    await TaskService.bulkAssignToStage(
      project.id,
      [task.value.id],
      stageId,
      undefined,
      testContext
    );

    // Check stage progress is still 75% (not recalculated)
    const stage = await ProductionService.getStageById(project.id, stageId);
    expect(stage?.progressPercent).toBe(75);
  });
});

describe('Bulk Task Assignment - Filtering', () => {
  test('should update unassigned tasks list after bulk assign', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create 3 unassigned tasks
    await TaskService.createTask(project.id, { title: 'Task 1', category: 'HULL' }, testContext);
    const task2 = await TaskService.createTask(project.id, { title: 'Task 2', category: 'HULL' }, testContext);
    await TaskService.createTask(project.id, { title: 'Task 3', category: 'HULL' }, testContext);

    // Initial unassigned count
    let unassigned = await TaskService.getUnassignedTasks(project.id);
    expect(unassigned.length).toBe(3);

    // Assign one task
    if (task2.ok) {
      await TaskService.bulkAssignToStage(
        project.id,
        [task2.value.id],
        stageId,
        undefined,
        testContext
      );
    }

    // Check unassigned count decreased
    unassigned = await TaskService.getUnassignedTasks(project.id);
    expect(unassigned.length).toBe(2);
  });

  test('should add tasks to stage task list after bulk assign', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create unassigned tasks
    const task1 = await TaskService.createTask(project.id, { title: 'Task 1', category: 'HULL' }, testContext);
    const task2 = await TaskService.createTask(project.id, { title: 'Task 2', category: 'HULL' }, testContext);

    expect(task1.ok && task2.ok).toBe(true);
    if (!task1.ok || !task2.ok) return;

    // Initial stage has no tasks
    let stageTasks = await TaskService.getTasksByStage(project.id, stageId);
    expect(stageTasks.length).toBe(0);

    // Bulk assign
    await TaskService.bulkAssignToStage(
      project.id,
      [task1.value.id, task2.value.id],
      stageId,
      undefined,
      testContext
    );

    // Check stage now has tasks
    stageTasks = await TaskService.getTasksByStage(project.id, stageId);
    expect(stageTasks.length).toBe(2);
  });
});

describe('Bulk Task Assignment - Edge Cases', () => {
  test('should handle empty task list gracefully', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    const result = await TaskService.bulkAssignToStage(
      project.id,
      [],
      stageId,
      undefined,
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBe(0);
  });

  test('should skip non-existent task IDs', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create one real task
    const task = await TaskService.createTask(project.id, { title: 'Real Task', category: 'HULL' }, testContext);
    expect(task.ok).toBe(true);
    if (!task.ok) return;

    // Bulk assign with mix of real and fake IDs
    const result = await TaskService.bulkAssignToStage(
      project.id,
      [task.value.id, 'fake-id-1', 'fake-id-2'],
      stageId,
      undefined,
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Only real task should be assigned
    expect(result.value.length).toBe(1);
    expect(result.value[0].id).toBe(task.value.id);
  });

  test('should return error for non-existent project', async () => {
    const result = await TaskService.bulkAssignToStage(
      'non-existent-project',
      ['task-1'],
      'stage-1',
      undefined,
      testContext
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Project not found');
    }
  });

  test('should preserve existing assignee if not overriding', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create task with assignee
    const task = await TaskService.createTask(
      project.id,
      { title: 'Pre-assigned', category: 'HULL', assignedTo: 'Original Assignee' },
      testContext
    );
    expect(task.ok).toBe(true);
    if (!task.ok) return;

    // Bulk assign without specifying assignee
    const result = await TaskService.bulkAssignToStage(
      project.id,
      [task.value.id],
      stageId,
      undefined, // No options
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Original assignee should be preserved
    expect(result.value[0].assignedTo).toBe('Original Assignee');
  });
});

describe('Bulk Task Assignment - Permissions', () => {
  test('Production role should have task update permission', async () => {
    const { hasPermission } = await import('@/domain/models');
    expect(hasPermission('PRODUCTION', 'task:update')).toBe(true);
  });

  test('Manager role should have task update permission', async () => {
    const { hasPermission } = await import('@/domain/models');
    expect(hasPermission('MANAGER', 'task:update')).toBe(true);
  });

  test('Sales role should NOT have task update permission', async () => {
    const { hasPermission } = await import('@/domain/models');
    expect(hasPermission('SALES', 'task:update')).toBe(false);
  });

  test('Viewer role should NOT have task update permission', async () => {
    const { hasPermission } = await import('@/domain/models');
    expect(hasPermission('VIEWER', 'task:update')).toBe(false);
  });
});

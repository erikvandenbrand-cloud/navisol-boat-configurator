/**
 * Task-Stage Linking Tests
 * Tests for linking tasks to production stages
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import { ProductionService } from '@/domain/services/ProductionService';
import { TaskService } from '@/domain/services/TaskService';
import { ProjectRepository } from '@/data/repositories';
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
// TASK-STAGE LINKING TESTS
// ============================================

describe('Task-Stage Linking - Create Task with stageId', () => {
  test('should create task with stageId', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    const input: CreateTaskInput = {
      title: 'Test Task with Stage',
      category: 'HULL',
      stageId,
    };

    const result = await TaskService.createTask(project.id, input, testContext);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.stageId).toBe(stageId);
    expect(result.value.title).toBe('Test Task with Stage');
  });

  test('should create task without stageId', async () => {
    const { project } = await createTestProjectWithStages();

    const input: CreateTaskInput = {
      title: 'Unassigned Task',
      category: 'OTHER',
    };

    const result = await TaskService.createTask(project.id, input, testContext);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.stageId).toBeUndefined();
  });
});

describe('Task-Stage Linking - Filter Tasks by Stage', () => {
  test('should get tasks by stage', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create 2 tasks for stage 1
    await TaskService.createTask(project.id, { title: 'Task 1', category: 'HULL', stageId }, testContext);
    await TaskService.createTask(project.id, { title: 'Task 2', category: 'HULL', stageId }, testContext);

    // Create 1 task for stage 2
    await TaskService.createTask(project.id, { title: 'Task 3', category: 'PROPULSION', stageId: stages[1] }, testContext);

    const stage1Tasks = await TaskService.getTasksByStage(project.id, stageId);
    const stage2Tasks = await TaskService.getTasksByStage(project.id, stages[1]);

    expect(stage1Tasks.length).toBe(2);
    expect(stage2Tasks.length).toBe(1);
  });

  test('should get unassigned tasks', async () => {
    const { project, stages } = await createTestProjectWithStages();

    // Create assigned task
    await TaskService.createTask(project.id, { title: 'Assigned', category: 'HULL', stageId: stages[0] }, testContext);

    // Create unassigned task
    await TaskService.createTask(project.id, { title: 'Unassigned', category: 'OTHER' }, testContext);

    const unassigned = await TaskService.getUnassignedTasks(project.id);

    expect(unassigned.length).toBe(1);
    expect(unassigned[0].title).toBe('Unassigned');
  });

  test('should get stage task progress', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create 3 tasks
    const task1 = await TaskService.createTask(project.id, { title: 'Task 1', category: 'HULL', stageId }, testContext);
    const task2 = await TaskService.createTask(project.id, { title: 'Task 2', category: 'HULL', stageId }, testContext);
    await TaskService.createTask(project.id, { title: 'Task 3', category: 'HULL', stageId }, testContext);

    // Complete 2 tasks
    if (task1.ok) await TaskService.updateTaskStatus(project.id, task1.value.id, 'COMPLETED', testContext);
    if (task2.ok) await TaskService.updateTaskStatus(project.id, task2.value.id, 'COMPLETED', testContext);

    const progress = await TaskService.getStageTaskProgress(project.id, stageId);

    expect(progress.total).toBe(3);
    expect(progress.completed).toBe(2);
    expect(progress.progressPercent).toBe(67); // 2/3 = 66.67%, rounded to 67
  });
});

describe('Task-Stage Linking - Update Task stageId', () => {
  test('should update task stageId', async () => {
    const { project, stages } = await createTestProjectWithStages();

    // Create task without stage
    const createResult = await TaskService.createTask(
      project.id,
      { title: 'Move Me', category: 'OTHER' },
      testContext
    );

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    // Assign to stage
    const updateResult = await TaskService.assignToStage(
      project.id,
      createResult.value.id,
      stages[0],
      testContext
    );

    expect(updateResult.ok).toBe(true);
    if (!updateResult.ok) return;

    expect(updateResult.value.stageId).toBe(stages[0]);
  });

  test('should unassign task from stage', async () => {
    const { project, stages } = await createTestProjectWithStages();

    // Create task with stage
    const createResult = await TaskService.createTask(
      project.id,
      { title: 'Assigned Task', category: 'HULL', stageId: stages[0] },
      testContext
    );

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    // Unassign from stage
    const updateResult = await TaskService.assignToStage(
      project.id,
      createResult.value.id,
      undefined,
      testContext
    );

    expect(updateResult.ok).toBe(true);
    if (!updateResult.ok) return;

    expect(updateResult.value.stageId).toBeUndefined();
  });
});

describe('Task-Stage Linking - Auto Progress from Tasks', () => {
  test('should toggle auto progress on', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    const result = await ProductionService.toggleAutoProgress(
      project.id,
      stageId,
      true,
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.autoProgressFromTasks).toBe(true);
  });

  test('should calculate progress when enabling auto progress', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create 2 tasks, complete 1
    const task1 = await TaskService.createTask(
      project.id,
      { title: 'Task 1', category: 'HULL', stageId },
      testContext
    );
    await TaskService.createTask(
      project.id,
      { title: 'Task 2', category: 'HULL', stageId },
      testContext
    );

    if (task1.ok) {
      await TaskService.updateTaskStatus(project.id, task1.value.id, 'COMPLETED', testContext);
    }

    // Enable auto progress
    const result = await ProductionService.toggleAutoProgress(
      project.id,
      stageId,
      true,
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.progressPercent).toBe(50); // 1/2 = 50%
  });

  test('should recalculate progress when task status changes', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Enable auto progress first
    await ProductionService.toggleAutoProgress(project.id, stageId, true, testContext);

    // Create tasks
    const task1 = await TaskService.createTask(
      project.id,
      { title: 'Task 1', category: 'HULL', stageId },
      testContext
    );
    const task2 = await TaskService.createTask(
      project.id,
      { title: 'Task 2', category: 'HULL', stageId },
      testContext
    );

    // Initial progress should be 0%
    let stage = await ProductionService.getStageById(project.id, stageId);
    expect(stage?.progressPercent).toBe(0);

    // Complete task 1
    if (task1.ok) {
      await TaskService.updateTaskStatus(project.id, task1.value.id, 'COMPLETED', testContext);
    }

    // Progress should be 50%
    stage = await ProductionService.getStageById(project.id, stageId);
    expect(stage?.progressPercent).toBe(50);

    // Complete task 2
    if (task2.ok) {
      await TaskService.updateTaskStatus(project.id, task2.value.id, 'COMPLETED', testContext);
    }

    // Progress should be 100%
    stage = await ProductionService.getStageById(project.id, stageId);
    expect(stage?.progressPercent).toBe(100);
  });

  test('should not recalculate if auto progress is off', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Set manual progress
    await ProductionService.updateStageProgress(
      project.id,
      stageId,
      { progressPercent: 25 },
      testContext
    );

    // Create and complete task
    const task = await TaskService.createTask(
      project.id,
      { title: 'Task 1', category: 'HULL', stageId },
      testContext
    );
    if (task.ok) {
      await TaskService.updateTaskStatus(project.id, task.value.id, 'COMPLETED', testContext);
    }

    // Progress should still be 25% (not auto-calculated)
    const stage = await ProductionService.getStageById(project.id, stageId);
    expect(stage?.progressPercent).toBe(25);
  });
});

describe('Task-Stage Linking - Stage Task Summary', () => {
  test('should get stage task summary', async () => {
    const { project, stages } = await createTestProjectWithStages();
    const stageId = stages[0];

    // Create tasks with different statuses
    const task1 = await TaskService.createTask(project.id, { title: 'Todo', category: 'HULL', stageId }, testContext);
    const task2 = await TaskService.createTask(project.id, { title: 'In Progress', category: 'HULL', stageId }, testContext);
    const task3 = await TaskService.createTask(project.id, { title: 'Completed', category: 'HULL', stageId }, testContext);

    if (task2.ok) await TaskService.updateTaskStatus(project.id, task2.value.id, 'IN_PROGRESS', testContext);
    if (task3.ok) await TaskService.updateTaskStatus(project.id, task3.value.id, 'COMPLETED', testContext);

    const summary = await ProductionService.getStageTaskSummary(project.id, stageId);

    expect(summary.total).toBe(3);
    expect(summary.todo).toBe(1);
    expect(summary.inProgress).toBe(1);
    expect(summary.completed).toBe(1);
    expect(summary.progressPercent).toBe(33); // 1/3 = 33%
  });
});

describe('Task-Stage Linking - Permissions', () => {
  test('Production role should have task and production permissions', async () => {
    const { hasPermission } = await import('@/domain/models');

    // Production role can manage tasks
    expect(hasPermission('PRODUCTION', 'task:create')).toBe(true);
    expect(hasPermission('PRODUCTION', 'task:read')).toBe(true);
    expect(hasPermission('PRODUCTION', 'task:update')).toBe(true);
    expect(hasPermission('PRODUCTION', 'task:log_time')).toBe(true);

    // Production role can update production stages
    expect(hasPermission('PRODUCTION', 'production:read')).toBe(true);
    expect(hasPermission('PRODUCTION', 'production:update')).toBe(true);
    expect(hasPermission('PRODUCTION', 'production:comment')).toBe(true);
    expect(hasPermission('PRODUCTION', 'production:photo')).toBe(true);
  });

  test('Sales role should only have read permissions for production', async () => {
    const { hasPermission } = await import('@/domain/models');

    // Sales can read but not update
    expect(hasPermission('SALES', 'production:read')).toBe(true);
    expect(hasPermission('SALES', 'production:update')).toBe(false);
    expect(hasPermission('SALES', 'production:comment')).toBe(false);
    expect(hasPermission('SALES', 'production:photo')).toBe(false);

    // Sales can read but not create tasks
    expect(hasPermission('SALES', 'task:read')).toBe(true);
    expect(hasPermission('SALES', 'task:create')).toBe(false);
    expect(hasPermission('SALES', 'task:update')).toBe(false);
  });

  test('Viewer role should have read-only access', async () => {
    const { hasPermission } = await import('@/domain/models');

    // Viewer can only read
    expect(hasPermission('VIEWER', 'production:read')).toBe(true);
    expect(hasPermission('VIEWER', 'production:update')).toBe(false);
    expect(hasPermission('VIEWER', 'task:read')).toBe(true);
    expect(hasPermission('VIEWER', 'task:create')).toBe(false);
  });
});

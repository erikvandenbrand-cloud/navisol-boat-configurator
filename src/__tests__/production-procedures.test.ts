/**
 * Production Procedure Tests
 * Tests for library-level production procedures with task set templates
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import type {
  ProductionProcedure,
  ProductionProcedureVersion,
  TaskSetTemplate,
  TemplateTask,
  Project,
  Client,
} from '@/domain/models';
import { generateUUID, now } from '@/domain/models';
import { ProductionProcedureService } from '@/domain/services/ProductionProcedureService';
import { ProductionProcedureRepository } from '@/data/repositories/ProductionProcedureRepository';
import { ProjectRepository, ClientRepository } from '@/data/repositories';
import type { AuditContext } from '@/domain/audit/AuditService';

// ============================================
// TEST HELPERS
// ============================================

function createTestContext(): AuditContext {
  return {
    userId: 'test-user-id',
    userName: 'Test User',
  };
}

function createTestClient(): Client {
  return {
    id: generateUUID(),
    clientNumber: 'CLI-TEST-0001',
    name: 'Test Client',
    type: 'company',
    status: 'active',
    email: 'test@example.com',
    country: 'Netherlands',
    createdAt: now(),
    updatedAt: now(),
    version: 1,
  };
}

function createTestProject(clientId: string, type: 'NEW_BUILD' | 'REFIT' | 'MAINTENANCE' = 'NEW_BUILD'): Project {
  return {
    id: generateUUID(),
    projectNumber: `PRJ-TEST-${generateUUID().slice(0, 4)}`,
    title: 'Test Project',
    type,
    status: 'DRAFT',
    clientId,
    configuration: {
      propulsionType: 'Electric',
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
    version: 1,
    productionStages: [
      {
        id: generateUUID(),
        projectId: '',
        code: 'HULL',
        name: 'Hull Construction',
        order: 1,
        status: 'NOT_STARTED',
        progressPercent: 0,
        autoProgressFromTasks: false,
        estimatedDays: 15,
        taskIds: [],
        comments: [],
        photos: [],
        createdAt: now(),
        updatedAt: now(),
        version: 0,
      },
    ],
  };
}

// ============================================
// PROCEDURE CRUD TESTS
// ============================================

describe('ProductionProcedureService', () => {
  const context = createTestContext();

  describe('Procedure CRUD', () => {
    test('should create a new procedure', async () => {
      const result = await ProductionProcedureService.createProcedure(
        {
          name: 'Test Procedure',
          description: 'A test procedure',
          category: 'general',
        },
        context
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('Test Procedure');
        expect(result.value.description).toBe('A test procedure');
        expect(result.value.category).toBe('general');
      }
    });

    test('should update a procedure', async () => {
      // Create directly via repository for update test
      const procedure = await ProductionProcedureRepository.create({
        name: 'Original Name For Update',
        category: 'general',
      });

      expect(procedure.id).toBeDefined();

      // Update via service
      const updateResult = await ProductionProcedureService.updateProcedure(
        procedure.id,
        { name: 'Updated Name', description: 'Now with description' },
        context
      );

      expect(updateResult.ok).toBe(true);
      if (updateResult.ok) {
        expect(updateResult.value.name).toBe('Updated Name');
        expect(updateResult.value.description).toBe('Now with description');
      }
    });

    test('should get all procedures', async () => {
      const procedures = await ProductionProcedureService.getAllProcedures();
      expect(Array.isArray(procedures)).toBe(true);
    });
  });

  // ============================================
  // VERSION MANAGEMENT TESTS
  // ============================================

  describe('Version Management', () => {
    test('should create a new version', async () => {
      // Create procedure directly via repository
      const procedure = await ProductionProcedureRepository.create({
        name: 'Versioned Procedure For Version Test',
        category: 'electrical',
      });

      expect(procedure.id).toBeDefined();

      // Create version via service
      const versionResult = await ProductionProcedureService.createVersion(
        procedure.id,
        '1.0',
        context
      );

      expect(versionResult.ok).toBe(true);
      if (versionResult.ok) {
        expect(versionResult.value.versionLabel).toBe('1.0');
        expect(versionResult.value.status).toBe('DRAFT');
        expect(versionResult.value.taskSets).toEqual([]);
      }
    });

    test('should not approve version with no task sets', async () => {
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Empty Procedure', category: 'general' },
        context
      );
      if (!procResult.ok) return;

      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      const approveResult = await ProductionProcedureService.approveVersion(
        versionResult.value.id,
        context
      );

      expect(approveResult.ok).toBe(false);
      if (!approveResult.ok) {
        expect(approveResult.error).toContain('no task sets');
      }
    });

    test('approve should lock version (immutable)', async () => {
      // Create procedure
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Lockable Procedure', category: 'testing' },
        context
      );
      if (!procResult.ok) return;

      // Create version
      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      // Add task set
      const taskSetResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        { name: 'Test Task Set' },
        context
      );
      if (!taskSetResult.ok) return;

      // Add task to task set
      const taskResult = await ProductionProcedureService.addTemplateTask(
        versionResult.value.id,
        taskSetResult.value.id,
        {
          title: 'Test Task',
          category: 'TESTING',
        },
        context
      );
      if (!taskResult.ok) return;

      // Approve version
      const approveResult = await ProductionProcedureService.approveVersion(
        versionResult.value.id,
        context
      );

      expect(approveResult.ok).toBe(true);
      if (!approveResult.ok) return;

      expect(approveResult.value.status).toBe('APPROVED');
      expect(approveResult.value.approvedAt).toBeDefined();
      expect(approveResult.value.approvedBy).toBe(context.userId);

      // Try to add another task set to approved version
      const addResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        { name: 'Should Fail' },
        context
      );

      expect(addResult.ok).toBe(false);
      if (!addResult.ok) {
        expect(addResult.error).toContain('non-draft');
      }
    });
  });

  // ============================================
  // TASK SET MANAGEMENT TESTS
  // ============================================

  describe('Task Set Management', () => {
    test('should add task set to draft version', async () => {
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Task Set Procedure', category: 'hull' },
        context
      );
      if (!procResult.ok) return;

      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      const taskSetResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        {
          name: 'Hull Preparation Tasks',
          description: 'Tasks for hull prep',
        },
        context
      );

      expect(taskSetResult.ok).toBe(true);
      if (taskSetResult.ok) {
        expect(taskSetResult.value.name).toBe('Hull Preparation Tasks');
        expect(taskSetResult.value.tasks).toEqual([]);
      }
    });

    test('should add tasks to task set', async () => {
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Task Procedure', category: 'general' },
        context
      );
      if (!procResult.ok) return;

      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      const taskSetResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        { name: 'My Tasks' },
        context
      );
      if (!taskSetResult.ok) return;

      const taskResult = await ProductionProcedureService.addTemplateTask(
        versionResult.value.id,
        taskSetResult.value.id,
        {
          title: 'Install Battery',
          description: 'Install main battery pack',
          category: 'ELECTRICAL',
          defaultStageCode: 'ELECTRICAL',
          estimatedHours: 4,
          priority: 'HIGH',
        },
        context
      );

      expect(taskResult.ok).toBe(true);
      if (taskResult.ok) {
        expect(taskResult.value.title).toBe('Install Battery');
        expect(taskResult.value.category).toBe('ELECTRICAL');
        expect(taskResult.value.defaultStageCode).toBe('ELECTRICAL');
        expect(taskResult.value.estimatedHours).toBe(4);
      }
    });
  });

  // ============================================
  // COPY TO PROJECT TESTS
  // ============================================

  describe('Copy to Project', () => {
    test('should copy task set to NEW_BUILD project', async () => {
      // Create and save a test client
      const savedClient = await ClientRepository.create({
        name: 'Copy Test Client ' + generateUUID().slice(0, 4),
        type: 'company',
        status: 'active',
        email: 'copy-test@example.com',
        country: 'Netherlands',
      });

      // Create and save a test project
      const project = await ProjectRepository.create(
        {
          title: 'Copy Test Project',
          type: 'NEW_BUILD',
          clientId: savedClient.id,
          propulsionType: 'Electric',
        },
        'test-user'
      );

      // Create procedure with task set
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Copy Test Procedure', category: 'general' },
        context
      );
      if (!procResult.ok) return;

      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      const taskSetResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        { name: 'Test Tasks' },
        context
      );
      if (!taskSetResult.ok) return;

      // Add multiple tasks
      await ProductionProcedureService.addTemplateTask(
        versionResult.value.id,
        taskSetResult.value.id,
        { title: 'Task 1', category: 'HULL' },
        context
      );
      await ProductionProcedureService.addTemplateTask(
        versionResult.value.id,
        taskSetResult.value.id,
        { title: 'Task 2', category: 'PROPULSION' },
        context
      );

      // Approve the version
      await ProductionProcedureService.approveVersion(versionResult.value.id, context);

      // Copy to project
      const copyResult = await ProductionProcedureService.copyTaskSetToProject(
        project.id,
        versionResult.value.id,
        taskSetResult.value.id,
        context
      );

      expect(copyResult.ok).toBe(true);
      if (copyResult.ok) {
        expect(copyResult.value.length).toBe(2);
        expect(copyResult.value[0].title).toBe('Task 1');
        expect(copyResult.value[0].sourceProcedureVersionId).toBe(versionResult.value.id);
        expect(copyResult.value[0].sourceTaskSetTemplateId).toBe(taskSetResult.value.id);
        expect(copyResult.value[0].copiedFromTemplateAt).toBeDefined();
      }
    });

    test('should NOT copy task set to REFIT project (NEW_BUILD only)', async () => {
      // Create a REFIT project
      const client = await ClientRepository.create({
        name: 'Refit Client',
        type: 'company',
        status: 'active',
        country: 'Netherlands',
      });

      const project = await ProjectRepository.create(
        {
          title: 'Refit Project',
          type: 'REFIT',
          clientId: client.id,
          propulsionType: 'Diesel',
        },
        'test-user'
      );

      // Create an approved procedure
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Refit Test', category: 'general' },
        context
      );
      if (!procResult.ok) return;

      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      const taskSetResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        { name: 'Tasks' },
        context
      );
      if (!taskSetResult.ok) return;

      await ProductionProcedureService.addTemplateTask(
        versionResult.value.id,
        taskSetResult.value.id,
        { title: 'Some Task', category: 'OTHER' },
        context
      );

      await ProductionProcedureService.approveVersion(versionResult.value.id, context);

      // Try to copy to REFIT project
      const copyResult = await ProductionProcedureService.copyTaskSetToProject(
        project.id,
        versionResult.value.id,
        taskSetResult.value.id,
        context
      );

      expect(copyResult.ok).toBe(false);
      if (!copyResult.ok) {
        expect(copyResult.error).toContain('NEW_BUILD');
      }
    });

    test('should NOT copy from unapproved version', async () => {
      const client = await ClientRepository.create({
        name: 'Test Client 2',
        type: 'private',
        status: 'active',
        country: 'Germany',
      });

      const project = await ProjectRepository.create(
        {
          title: 'Test Project 2',
          type: 'NEW_BUILD',
          clientId: client.id,
        },
        'test-user'
      );

      // Create procedure but don't approve
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Unapproved Procedure', category: 'general' },
        context
      );
      if (!procResult.ok) return;

      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      const taskSetResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        { name: 'Draft Tasks' },
        context
      );
      if (!taskSetResult.ok) return;

      await ProductionProcedureService.addTemplateTask(
        versionResult.value.id,
        taskSetResult.value.id,
        { title: 'Draft Task', category: 'OTHER' },
        context
      );

      // Don't approve - try to copy draft version
      const copyResult = await ProductionProcedureService.copyTaskSetToProject(
        project.id,
        versionResult.value.id,
        taskSetResult.value.id,
        context
      );

      expect(copyResult.ok).toBe(false);
      if (!copyResult.ok) {
        expect(copyResult.error).toContain('approved');
      }
    });
  });

  // ============================================
  // PROVENANCE TESTS
  // ============================================

  describe('Task Provenance', () => {
    test('copied tasks should have provenance metadata', async () => {
      // Create client and project
      const client = await ClientRepository.create({
        name: 'Provenance Test Client',
        type: 'company',
        status: 'active',
        country: 'France',
      });

      const project = await ProjectRepository.create(
        {
          title: 'Provenance Test Project',
          type: 'NEW_BUILD',
          clientId: client.id,
        },
        'test-user'
      );

      // Create and approve procedure
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Provenance Procedure', category: 'testing' },
        context
      );
      if (!procResult.ok) return;

      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      const taskSetResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        { name: 'Provenance Tasks' },
        context
      );
      if (!taskSetResult.ok) return;

      await ProductionProcedureService.addTemplateTask(
        versionResult.value.id,
        taskSetResult.value.id,
        { title: 'Traceable Task', category: 'TESTING' },
        context
      );

      await ProductionProcedureService.approveVersion(versionResult.value.id, context);

      // Copy to project
      const copyResult = await ProductionProcedureService.copyTaskSetToProject(
        project.id,
        versionResult.value.id,
        taskSetResult.value.id,
        context
      );

      expect(copyResult.ok).toBe(true);
      if (!copyResult.ok) return;

      const copiedTask = copyResult.value[0];

      // Verify provenance
      expect(copiedTask.sourceProcedureId).toBe(procResult.value.id);
      expect(copiedTask.sourceProcedureVersionId).toBe(versionResult.value.id);
      expect(copiedTask.sourceTaskSetTemplateId).toBe(taskSetResult.value.id);
      expect(copiedTask.copiedFromTemplateAt).toBeDefined();

      // Verify the task is now a regular project task
      expect(copiedTask.projectId).toBe(project.id);
      expect(copiedTask.status).toBe('TODO');
    });
  });

  // ============================================
  // DEFAULT SEEDING TESTS
  // ============================================

  describe('Default Seeding', () => {
    test('should initialize defaults when no procedures exist', async () => {
      // Note: This test relies on the fact that other tests have already created procedures
      // So we're testing that initializeDefaults is idempotent
      const beforeCount = (await ProductionProcedureService.getAllProcedures()).length;

      // Call initializeDefaults again - should not add more
      await ProductionProcedureService.initializeDefaults(context);

      const afterCount = (await ProductionProcedureService.getAllProcedures()).length;

      // Should not have added any new procedures since some already exist
      expect(afterCount).toBe(beforeCount);
    });

    test('should not duplicate procedures on repeated calls', async () => {
      // Get initial state
      const procedures1 = await ProductionProcedureService.getAllProcedures();
      const count1 = procedures1.length;

      // Call initializeDefaults multiple times
      await ProductionProcedureService.initializeDefaults(context);
      await ProductionProcedureService.initializeDefaults(context);
      await ProductionProcedureService.initializeDefaults(context);

      // Should still have the same number
      const procedures2 = await ProductionProcedureService.getAllProcedures();
      expect(procedures2.length).toBe(count1);
    });

    test('default procedures have approved versions', async () => {
      // Initialize defaults (idempotent)
      await ProductionProcedureService.initializeDefaults(context);

      const procedures = await ProductionProcedureService.getAllProcedures();

      // Check that at least some procedures have approved versions
      let approvedCount = 0;
      for (const proc of procedures) {
        if (proc.currentVersionId) {
          const version = await ProductionProcedureService.getVersion(proc.currentVersionId);
          if (version && version.status === 'APPROVED') {
            approvedCount++;

            // Verify task sets exist
            expect(version.taskSets.length).toBeGreaterThan(0);

            // Verify tasks exist in task sets
            for (const taskSet of version.taskSets) {
              expect(taskSet.tasks.length).toBeGreaterThan(0);
            }
          }
        }
      }

      // At least some should be approved
      expect(approvedCount).toBeGreaterThan(0);
    });
  });

  // ============================================
  // DUPLICATE TASK SET DETECTION TESTS
  // ============================================

  describe('Duplicate Task Set Detection', () => {
    test('first apply succeeds', async () => {
      // Create client and project
      const client = await ClientRepository.create({
        name: 'Dup Test Client 1',
        type: 'company',
        status: 'active',
        country: 'Netherlands',
      });

      const project = await ProjectRepository.create(
        {
          title: 'Dup Test Project 1',
          type: 'NEW_BUILD',
          clientId: client.id,
        },
        'test-user'
      );

      // Create and approve procedure
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Dup Test Procedure 1', category: 'general' },
        context
      );
      if (!procResult.ok) return;

      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      const taskSetResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        { name: 'First Apply Tasks' },
        context
      );
      if (!taskSetResult.ok) return;

      await ProductionProcedureService.addTemplateTask(
        versionResult.value.id,
        taskSetResult.value.id,
        { title: 'Task A', category: 'OTHER' },
        context
      );

      await ProductionProcedureService.approveVersion(versionResult.value.id, context);

      // First apply should succeed
      const copyResult = await ProductionProcedureService.copyTaskSetToProject(
        project.id,
        versionResult.value.id,
        taskSetResult.value.id,
        context
      );

      expect(copyResult.ok).toBe(true);
      if (copyResult.ok) {
        expect(copyResult.value.length).toBe(1);
      }
    });

    test('second apply without forceDuplicate is rejected', async () => {
      // Create client and project
      const client = await ClientRepository.create({
        name: 'Dup Test Client 2',
        type: 'company',
        status: 'active',
        country: 'Germany',
      });

      const project = await ProjectRepository.create(
        {
          title: 'Dup Test Project 2',
          type: 'NEW_BUILD',
          clientId: client.id,
        },
        'test-user'
      );

      // Create and approve procedure
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Dup Test Procedure 2', category: 'testing' },
        context
      );
      if (!procResult.ok) return;

      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      const taskSetResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        { name: 'Dup Check Tasks' },
        context
      );
      if (!taskSetResult.ok) return;

      await ProductionProcedureService.addTemplateTask(
        versionResult.value.id,
        taskSetResult.value.id,
        { title: 'Task B', category: 'HULL' },
        context
      );

      await ProductionProcedureService.approveVersion(versionResult.value.id, context);

      // First apply
      const firstCopy = await ProductionProcedureService.copyTaskSetToProject(
        project.id,
        versionResult.value.id,
        taskSetResult.value.id,
        context
      );
      expect(firstCopy.ok).toBe(true);

      // Second apply without forceDuplicate should be rejected
      const secondCopy = await ProductionProcedureService.copyTaskSetToProject(
        project.id,
        versionResult.value.id,
        taskSetResult.value.id,
        context
        // forceDuplicate defaults to false
      );

      expect(secondCopy.ok).toBe(false);
      if (!secondCopy.ok) {
        expect(secondCopy.error).toContain('DUPLICATE_TASK_SET');
      }
    });

    test('duplicate apply with forceDuplicate=true succeeds', async () => {
      // Create client and project
      const client = await ClientRepository.create({
        name: 'Dup Test Client 3',
        type: 'company',
        status: 'active',
        country: 'France',
      });

      const project = await ProjectRepository.create(
        {
          title: 'Dup Test Project 3',
          type: 'NEW_BUILD',
          clientId: client.id,
        },
        'test-user'
      );

      // Create and approve procedure
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Dup Test Procedure 3', category: 'electrical' },
        context
      );
      if (!procResult.ok) return;

      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      const taskSetResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        { name: 'Force Dup Tasks' },
        context
      );
      if (!taskSetResult.ok) return;

      await ProductionProcedureService.addTemplateTask(
        versionResult.value.id,
        taskSetResult.value.id,
        { title: 'Task C', category: 'ELECTRICAL' },
        context
      );

      await ProductionProcedureService.approveVersion(versionResult.value.id, context);

      // First apply
      const firstCopy = await ProductionProcedureService.copyTaskSetToProject(
        project.id,
        versionResult.value.id,
        taskSetResult.value.id,
        context
      );
      expect(firstCopy.ok).toBe(true);

      // Second apply with forceDuplicate=true should succeed
      const secondCopy = await ProductionProcedureService.copyTaskSetToProject(
        project.id,
        versionResult.value.id,
        taskSetResult.value.id,
        context,
        true // forceDuplicate
      );

      expect(secondCopy.ok).toBe(true);
      if (secondCopy.ok) {
        expect(secondCopy.value.length).toBe(1);
      }

      // Verify project now has 2 tasks from the same task set
      const updatedProject = await ProjectRepository.getById(project.id);
      expect(updatedProject).not.toBeNull();
      if (updatedProject) {
        const tasksFromThisSet = updatedProject.tasks.filter(
          (t) => t.sourceTaskSetTemplateId === taskSetResult.value.id
        );
        expect(tasksFromThisSet.length).toBe(2);
      }
    });

    test('isTaskSetAlreadyApplied returns correct value', async () => {
      // Create client and project
      const client = await ClientRepository.create({
        name: 'Dup Check Client',
        type: 'private',
        status: 'active',
        country: 'Belgium',
      });

      const project = await ProjectRepository.create(
        {
          title: 'Dup Check Project',
          type: 'NEW_BUILD',
          clientId: client.id,
        },
        'test-user'
      );

      // Create and approve procedure
      const procResult = await ProductionProcedureService.createProcedure(
        { name: 'Check Dup Procedure', category: 'general' },
        context
      );
      if (!procResult.ok) return;

      const versionResult = await ProductionProcedureService.createVersion(
        procResult.value.id,
        '1.0',
        context
      );
      if (!versionResult.ok) return;

      const taskSetResult = await ProductionProcedureService.addTaskSet(
        versionResult.value.id,
        { name: 'Check Tasks' },
        context
      );
      if (!taskSetResult.ok) return;

      await ProductionProcedureService.addTemplateTask(
        versionResult.value.id,
        taskSetResult.value.id,
        { title: 'Check Task', category: 'OTHER' },
        context
      );

      await ProductionProcedureService.approveVersion(versionResult.value.id, context);

      // Before applying, should return false
      const beforeApply = await ProductionProcedureService.isTaskSetAlreadyApplied(
        project.id,
        taskSetResult.value.id
      );
      expect(beforeApply).toBe(false);

      // Apply the task set
      await ProductionProcedureService.copyTaskSetToProject(
        project.id,
        versionResult.value.id,
        taskSetResult.value.id,
        context
      );

      // After applying, should return true
      const afterApply = await ProductionProcedureService.isTaskSetAlreadyApplied(
        project.id,
        taskSetResult.value.id
      );
      expect(afterApply).toBe(true);
    });
  });
});

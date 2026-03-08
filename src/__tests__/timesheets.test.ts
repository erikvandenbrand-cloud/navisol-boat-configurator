/**
 * Timesheet Tests
 * Tests for timesheet entry CRUD, CLOSED project blocking, and weekly view
 */

// Import test utilities first to set up mocks
import '../domain/__tests__/testUtils';

import { describe, test, expect, beforeEach } from 'bun:test';
import type { TimesheetEntry, Project, Client } from '@/domain/models';
import {
  generateUUID,
  now,
  isValidHours,
  getWeekStart,
  getWeekEnd,
  formatDate,
} from '@/domain/models';
import { TimesheetService } from '@/domain/services/TimesheetService';
import { TimesheetRepository } from '@/data/repositories/TimesheetRepository';
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

async function createTestClient(): Promise<Client> {
  return ClientRepository.create({
    name: 'Timesheet Test Client ' + generateUUID().slice(0, 4),
    type: 'company',
    status: 'active',
    email: 'timesheet-test@example.com',
    country: 'Netherlands',
  });
}

async function createTestProject(
  clientId: string,
  options?: { isInternal?: boolean; status?: 'DRAFT' | 'CLOSED' }
): Promise<Project> {
  const project = await ProjectRepository.create(
    {
      title: 'Timesheet Test Project ' + generateUUID().slice(0, 4),
      type: 'NEW_BUILD',
      clientId,
      propulsionType: 'Electric',
    },
    'test-user'
  );

  // Apply options if provided
  if (options?.isInternal !== undefined || options?.status !== undefined) {
    const updates: Partial<Project> = {};
    if (options.isInternal !== undefined) {
      updates.isInternal = options.isInternal;
    }
    if (options.status !== undefined) {
      updates.status = options.status;
    }
    const updated = await ProjectRepository.update(project.id, updates);
    if (updated) return updated;
  }

  return project;
}

// ============================================
// VALIDATION TESTS
// ============================================

describe('Timesheet Validation', () => {
  test('isValidHours accepts valid values', () => {
    expect(isValidHours(0.25)).toBe(true);
    expect(isValidHours(0.5)).toBe(true);
    expect(isValidHours(0.75)).toBe(true);
    expect(isValidHours(1)).toBe(true);
    expect(isValidHours(1.25)).toBe(true);
    expect(isValidHours(8)).toBe(true);
    expect(isValidHours(24)).toBe(true);
  });

  test('isValidHours rejects invalid values', () => {
    expect(isValidHours(0)).toBe(false);
    expect(isValidHours(-1)).toBe(false);
    expect(isValidHours(25)).toBe(false);
    expect(isValidHours(0.1)).toBe(false);
    expect(isValidHours(0.33)).toBe(false);
    expect(isValidHours(1.1)).toBe(false);
  });

  test('getWeekStart returns Monday', () => {
    // Wednesday January 8, 2025
    const wed = new Date(2025, 0, 8);
    const monday = getWeekStart(wed);
    expect(monday.getDay()).toBe(1); // Monday
    expect(monday.getDate()).toBe(6); // Jan 6
  });

  test('getWeekEnd returns Sunday', () => {
    const wed = new Date(2025, 0, 8);
    const sunday = getWeekEnd(wed);
    expect(sunday.getDay()).toBe(0); // Sunday
    expect(sunday.getDate()).toBe(12); // Jan 12
  });
});

// ============================================
// CRUD TESTS
// ============================================

describe('TimesheetService CRUD', () => {
  const context = createTestContext();

  test('should create a timesheet entry', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const result = await TimesheetService.createEntry(
      {
        date: '2025-01-08',
        hours: 4,
        projectId: project.id,
        billable: true,
        billingRate: 75,
        note: 'Test entry',
      },
      context
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.hours).toBe(4);
      expect(result.value.projectId).toBe(project.id);
      expect(result.value.billable).toBe(true);
      expect(result.value.billingRate).toBe(75);
      expect(result.value.note).toBe('Test entry');
      expect(result.value.userId).toBe(context.userId);
      expect(result.value.userName).toBe(context.userName);
    }
  });

  test('should update a timesheet entry', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const createResult = await TimesheetService.createEntry(
      {
        date: '2025-01-08',
        hours: 2,
        projectId: project.id,
        billable: true,
      },
      context
    );

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const updateResult = await TimesheetService.updateEntry(
      createResult.value.id,
      { hours: 4, note: 'Updated' },
      context
    );

    expect(updateResult.ok).toBe(true);
    if (updateResult.ok) {
      expect(updateResult.value.hours).toBe(4);
      expect(updateResult.value.note).toBe('Updated');
    }
  });

  test('should delete a timesheet entry', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const createResult = await TimesheetService.createEntry(
      {
        date: '2025-01-08',
        hours: 1,
        projectId: project.id,
        billable: false,
      },
      context
    );

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const deleteResult = await TimesheetService.deleteEntry(
      createResult.value.id,
      context
    );

    expect(deleteResult.ok).toBe(true);

    // Verify deleted
    const entry = await TimesheetService.getById(createResult.value.id);
    expect(entry).toBeNull();
  });

  test('should reject invalid hours', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    // Zero hours
    const result1 = await TimesheetService.createEntry(
      { date: '2025-01-08', hours: 0, projectId: project.id, billable: true },
      context
    );
    expect(result1.ok).toBe(false);

    // Over 24 hours
    const result2 = await TimesheetService.createEntry(
      { date: '2025-01-08', hours: 25, projectId: project.id, billable: true },
      context
    );
    expect(result2.ok).toBe(false);

    // Invalid increment
    const result3 = await TimesheetService.createEntry(
      { date: '2025-01-08', hours: 1.1, projectId: project.id, billable: true },
      context
    );
    expect(result3.ok).toBe(false);
  });
});

// ============================================
// CLOSED PROJECT TESTS
// ============================================

describe('Timesheet CLOSED Project Blocking', () => {
  const context = createTestContext();

  test('should block creating entries for CLOSED projects', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id, { status: 'CLOSED' });

    const result = await TimesheetService.createEntry(
      {
        date: '2025-01-08',
        hours: 2,
        projectId: project.id,
        billable: true,
      },
      context
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('closed');
    }
  });

  test('should block updating entries for CLOSED projects', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    // Create entry on open project
    const createResult = await TimesheetService.createEntry(
      {
        date: '2025-01-08',
        hours: 2,
        projectId: project.id,
        billable: true,
      },
      context
    );

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    // Close the project
    await ProjectRepository.update(project.id, { status: 'CLOSED' });

    // Try to update
    const updateResult = await TimesheetService.updateEntry(
      createResult.value.id,
      { hours: 4 },
      context
    );

    expect(updateResult.ok).toBe(false);
    if (!updateResult.ok) {
      expect(updateResult.error).toContain('closed');
    }
  });

  test('should block deleting entries for CLOSED projects', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    // Create entry on open project
    const createResult = await TimesheetService.createEntry(
      {
        date: '2025-01-08',
        hours: 2,
        projectId: project.id,
        billable: true,
      },
      context
    );

    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    // Close the project
    await ProjectRepository.update(project.id, { status: 'CLOSED' });

    // Try to delete
    const deleteResult = await TimesheetService.deleteEntry(
      createResult.value.id,
      context
    );

    expect(deleteResult.ok).toBe(false);
    if (!deleteResult.ok) {
      expect(deleteResult.error).toContain('closed');
    }
  });
});

// ============================================
// INTERNAL PROJECT TESTS
// ============================================

describe('Timesheet Internal Project Defaults', () => {
  test('internal project defaults billable=false', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id, { isInternal: true });

    const defaultBillable = await TimesheetService.getDefaultBillable(project.id);
    expect(defaultBillable).toBe(false);
  });

  test('external project defaults billable=true', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id, { isInternal: false });

    const defaultBillable = await TimesheetService.getDefaultBillable(project.id);
    expect(defaultBillable).toBe(true);
  });

  test('project without isInternal flag defaults billable=true', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const defaultBillable = await TimesheetService.getDefaultBillable(project.id);
    expect(defaultBillable).toBe(true);
  });
});

// ============================================
// WEEKLY VIEW TESTS
// ============================================

describe('Timesheet Weekly View', () => {
  const context = createTestContext();

  test('should calculate weekly totals correctly', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    // Create entries for a week
    const weekStart = getWeekStart(new Date(2025, 0, 8)); // Week of Jan 6-12

    // Monday 2h
    await TimesheetService.createEntry(
      { date: formatDate(weekStart), hours: 2, projectId: project.id, billable: true },
      context
    );

    // Tuesday 4h
    const tue = new Date(weekStart);
    tue.setDate(weekStart.getDate() + 1);
    await TimesheetService.createEntry(
      { date: formatDate(tue), hours: 4, projectId: project.id, billable: true },
      context
    );

    // Wednesday 3.5h
    const wed = new Date(weekStart);
    wed.setDate(weekStart.getDate() + 2);
    await TimesheetService.createEntry(
      { date: formatDate(wed), hours: 3.5, projectId: project.id, billable: false },
      context
    );

    // Get weekly view (for all users to see all entries)
    const weekView = await TimesheetService.getWeeklyView(new Date(2025, 0, 8));

    // Verify totals (may include entries from other tests, so check at least our entries)
    expect(weekView.weekTotal).toBeGreaterThanOrEqual(9.5);
    expect(weekView.entries.length).toBeGreaterThanOrEqual(3);
  });

  test('should group entries by day', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const testDate = '2025-01-15';

    // Create two entries on same day
    await TimesheetService.createEntry(
      { date: testDate, hours: 2, projectId: project.id, billable: true },
      context
    );
    await TimesheetService.createEntry(
      { date: testDate, hours: 3, projectId: project.id, billable: true },
      context
    );

    // Get weekly view
    const weekView = await TimesheetService.getWeeklyView(new Date(2025, 0, 15), context.userId);

    // Check daily total includes both entries
    expect(weekView.dailyTotals[testDate]).toBeGreaterThanOrEqual(5);
  });
});

// ============================================
// REPOSITORY TESTS
// ============================================

describe('TimesheetRepository', () => {
  test('should persist and retrieve entries', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const entry = await TimesheetRepository.create(
      {
        date: '2025-01-20',
        hours: 8,
        projectId: project.id,
        billable: true,
        billingRate: 100,
      },
      'test-user-id',
      'Test User'
    );

    expect(entry.id).toBeDefined();
    expect(entry.hours).toBe(8);

    // Retrieve
    const retrieved = await TimesheetRepository.getById(entry.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.hours).toBe(8);
    expect(retrieved?.billingRate).toBe(100);
  });

  test('should get entries by user', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const userId = 'unique-user-' + generateUUID().slice(0, 4);

    await TimesheetRepository.create(
      { date: '2025-01-21', hours: 4, projectId: project.id, billable: true },
      userId,
      'Test User'
    );
    await TimesheetRepository.create(
      { date: '2025-01-22', hours: 6, projectId: project.id, billable: true },
      userId,
      'Test User'
    );

    const entries = await TimesheetRepository.getByUser(userId);
    expect(entries.length).toBe(2);
  });

  test('should get entries by date range', async () => {
    const client = await createTestClient();
    const project = await createTestProject(client.id);

    const userId = 'range-user-' + generateUUID().slice(0, 4);

    await TimesheetRepository.create(
      { date: '2025-02-01', hours: 2, projectId: project.id, billable: true },
      userId,
      'Test User'
    );
    await TimesheetRepository.create(
      { date: '2025-02-03', hours: 4, projectId: project.id, billable: true },
      userId,
      'Test User'
    );
    await TimesheetRepository.create(
      { date: '2025-02-10', hours: 8, projectId: project.id, billable: true },
      userId,
      'Test User'
    );

    const entries = await TimesheetRepository.getByDateRange('2025-02-01', '2025-02-05', userId);
    expect(entries.length).toBe(2);
  });
});

// ============================================
// REPORT AGGREGATION TESTS
// ============================================

describe('Timesheet Report Aggregations', () => {
  const context = createTestContext();

  describe('Weekly Project Overview', () => {
    test('should group entries by project with totals', async () => {
      const client = await createTestClient();
      const project1 = await createTestProject(client.id);
      const project2 = await createTestProject(client.id);

      // Create entries for project 1
      await TimesheetService.createEntry(
        { date: '2025-03-03', hours: 4, projectId: project1.id, billable: true },
        context
      );
      await TimesheetService.createEntry(
        { date: '2025-03-04', hours: 2, projectId: project1.id, billable: false },
        context
      );

      // Create entries for project 2
      await TimesheetService.createEntry(
        { date: '2025-03-03', hours: 3, projectId: project2.id, billable: true },
        context
      );

      // Get weekly overview (week of March 3-9, 2025)
      const overview = await TimesheetService.getWeeklyProjectOverview(new Date(2025, 2, 5));

      // Find our test projects in the overview
      const p1Overview = overview.find((o) => o.projectId === project1.id);
      const p2Overview = overview.find((o) => o.projectId === project2.id);

      expect(p1Overview).toBeDefined();
      expect(p1Overview?.totalHours).toBe(6);
      expect(p1Overview?.billableHours).toBe(4);
      expect(p1Overview?.nonBillableHours).toBe(2);

      expect(p2Overview).toBeDefined();
      expect(p2Overview?.totalHours).toBe(3);
      expect(p2Overview?.billableHours).toBe(3);
      expect(p2Overview?.nonBillableHours).toBe(0);
    });

    test('should filter by user when userId provided', async () => {
      const client = await createTestClient();
      const project = await createTestProject(client.id);
      const otherUserId = 'other-user-' + generateUUID().slice(0, 4);

      // Create entry for test context user
      await TimesheetService.createEntry(
        { date: '2025-03-10', hours: 4, projectId: project.id, billable: true },
        context
      );

      // Create entry for another user (manually in repository)
      await TimesheetRepository.create(
        { date: '2025-03-10', hours: 6, projectId: project.id, billable: true },
        otherUserId,
        'Other User'
      );

      // Get overview scoped to test user only
      const overviewScoped = await TimesheetService.getWeeklyProjectOverview(
        new Date(2025, 2, 10),
        context.userId
      );

      const projectOverview = overviewScoped.find((o) => o.projectId === project.id);
      // Should only include test user's 4 hours
      expect(projectOverview?.totalHours).toBe(4);

      // Get overview for all users (no userId filter)
      const overviewAll = await TimesheetService.getWeeklyProjectOverview(new Date(2025, 2, 10));
      const projectOverviewAll = overviewAll.find((o) => o.projectId === project.id);
      // Should include both users: 4 + 6 = 10 hours
      expect(projectOverviewAll?.totalHours).toBe(10);
    });
  });

  describe('Project Weekly Summary', () => {
    test('should calculate billable vs non-billable split', async () => {
      const client = await createTestClient();
      const project = await createTestProject(client.id);

      // Create mix of billable and non-billable entries
      await TimesheetService.createEntry(
        { date: '2025-03-17', hours: 5, projectId: project.id, billable: true },
        context
      );
      await TimesheetService.createEntry(
        { date: '2025-03-18', hours: 3, projectId: project.id, billable: false },
        context
      );
      await TimesheetService.createEntry(
        { date: '2025-03-19', hours: 2, projectId: project.id, billable: true },
        context
      );

      const summary = await TimesheetService.getProjectWeeklySummary(
        project.id,
        new Date(2025, 2, 17)
      );

      expect(summary).not.toBeNull();
      expect(summary?.totalHours).toBe(10);
      expect(summary?.billableHours).toBe(7); // 5 + 2
      expect(summary?.nonBillableHours).toBe(3);
    });

    test('should provide user breakdown with totals', async () => {
      const client = await createTestClient();
      const project = await createTestProject(client.id);
      const user2Id = 'user2-' + generateUUID().slice(0, 4);
      const user3Id = 'user3-' + generateUUID().slice(0, 4);

      // Create entries for multiple users
      await TimesheetRepository.create(
        { date: '2025-03-24', hours: 4, projectId: project.id, billable: true },
        context.userId,
        context.userName
      );
      await TimesheetRepository.create(
        { date: '2025-03-24', hours: 6, projectId: project.id, billable: true },
        user2Id,
        'User Two'
      );
      await TimesheetRepository.create(
        { date: '2025-03-25', hours: 2, projectId: project.id, billable: false },
        user3Id,
        'User Three'
      );

      // Get summary for all users (no userId filter)
      const summary = await TimesheetService.getProjectWeeklySummary(
        project.id,
        new Date(2025, 2, 24)
      );

      expect(summary?.userBreakdown.length).toBe(3);

      const user1Summary = summary?.userBreakdown.find((u) => u.userId === context.userId);
      expect(user1Summary?.totalHours).toBe(4);
      expect(user1Summary?.billableHours).toBe(4);
      expect(user1Summary?.nonBillableHours).toBe(0);

      const user2Summary = summary?.userBreakdown.find((u) => u.userId === user2Id);
      expect(user2Summary?.totalHours).toBe(6);

      const user3Summary = summary?.userBreakdown.find((u) => u.userId === user3Id);
      expect(user3Summary?.totalHours).toBe(2);
      expect(user3Summary?.nonBillableHours).toBe(2);
    });

    test('should scope user breakdown when userId provided', async () => {
      const client = await createTestClient();
      const project = await createTestProject(client.id);
      const otherUserId = 'other-' + generateUUID().slice(0, 4);

      // Create entries for test user and another user
      await TimesheetRepository.create(
        { date: '2025-03-31', hours: 3, projectId: project.id, billable: true },
        context.userId,
        context.userName
      );
      await TimesheetRepository.create(
        { date: '2025-03-31', hours: 5, projectId: project.id, billable: true },
        otherUserId,
        'Other User'
      );

      // Get summary scoped to test user
      const summary = await TimesheetService.getProjectWeeklySummary(
        project.id,
        new Date(2025, 2, 31),
        context.userId
      );

      // Should only have test user in breakdown
      expect(summary?.userBreakdown.length).toBe(1);
      expect(summary?.userBreakdown[0].userId).toBe(context.userId);
      expect(summary?.totalHours).toBe(3);
    });

    test('should include internal project flag', async () => {
      const client = await createTestClient();
      const internalProject = await createTestProject(client.id, { isInternal: true });

      await TimesheetService.createEntry(
        { date: '2025-04-01', hours: 2, projectId: internalProject.id, billable: false },
        context
      );

      const summary = await TimesheetService.getProjectWeeklySummary(
        internalProject.id,
        new Date(2025, 3, 1)
      );

      expect(summary?.isInternal).toBe(true);
    });

    test('should return null for non-existent project', async () => {
      const summary = await TimesheetService.getProjectWeeklySummary(
        'non-existent-project-id',
        new Date(2025, 3, 1)
      );

      expect(summary).toBeNull();
    });
  });

  describe('Task Breakdown', () => {
    test('should group hours by task when taskId is present', async () => {
      const client = await createTestClient();
      const project = await createTestProject(client.id);

      // Add some tasks to the project
      const task1Id = generateUUID();
      const task2Id = generateUUID();
      await ProjectRepository.update(project.id, {
        tasks: [
          {
            id: task1Id,
            projectId: project.id,
            taskNumber: 1,
            title: 'Design Phase',
            category: 'HULL',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            timeLogs: [],
            totalLoggedHours: 0,
            createdBy: context.userId,
            createdAt: now(),
            updatedAt: now(),
            version: 1,
          },
          {
            id: task2Id,
            projectId: project.id,
            taskNumber: 2,
            title: 'Build Phase',
            category: 'HULL',
            priority: 'MEDIUM',
            status: 'TODO',
            timeLogs: [],
            totalLoggedHours: 0,
            createdBy: context.userId,
            createdAt: now(),
            updatedAt: now(),
            version: 1,
          },
        ] as any,
      });

      // Create entries linked to tasks
      await TimesheetRepository.create(
        { date: '2025-04-07', hours: 3, projectId: project.id, taskId: task1Id, billable: true },
        context.userId,
        context.userName
      );
      await TimesheetRepository.create(
        { date: '2025-04-08', hours: 2, projectId: project.id, taskId: task1Id, billable: true },
        context.userId,
        context.userName
      );
      await TimesheetRepository.create(
        { date: '2025-04-08', hours: 4, projectId: project.id, taskId: task2Id, billable: true },
        context.userId,
        context.userName
      );
      // Entry without taskId
      await TimesheetRepository.create(
        { date: '2025-04-09', hours: 1, projectId: project.id, billable: true },
        context.userId,
        context.userName
      );

      const summary = await TimesheetService.getProjectWeeklySummary(
        project.id,
        new Date(2025, 3, 7)
      );

      expect(summary?.taskBreakdown.length).toBe(2); // Only tasks with entries

      const task1Breakdown = summary?.taskBreakdown.find((t) => t.taskId === task1Id);
      expect(task1Breakdown?.totalHours).toBe(5); // 3 + 2
      expect(task1Breakdown?.taskTitle).toBe('Design Phase');

      const task2Breakdown = summary?.taskBreakdown.find((t) => t.taskId === task2Id);
      expect(task2Breakdown?.totalHours).toBe(4);
      expect(task2Breakdown?.taskTitle).toBe('Build Phase');
    });
  });

  // ============================================
  // MONTHLY AGGREGATION TESTS
  // ============================================

  describe('Monthly Aggregations', () => {
    test('getMonthlyProjectOverview should aggregate by project for entire month', async () => {
      const client = await createTestClient();
      const project = await createTestProject(client.id);

      // Create entries spread across the month of May 2025
      await TimesheetRepository.create(
        { date: '2025-05-01', hours: 2, projectId: project.id, billable: true },
        context.userId,
        context.userName
      );
      await TimesheetRepository.create(
        { date: '2025-05-15', hours: 4, projectId: project.id, billable: true },
        context.userId,
        context.userName
      );
      await TimesheetRepository.create(
        { date: '2025-05-28', hours: 3, projectId: project.id, billable: false },
        context.userId,
        context.userName
      );

      // Get monthly overview
      const overview = await TimesheetService.getMonthlyProjectOverview(new Date(2025, 4, 15));

      const projectOverview = overview.find((o) => o.projectId === project.id);
      expect(projectOverview).toBeDefined();
      expect(projectOverview?.totalHours).toBe(9); // 2 + 4 + 3
      expect(projectOverview?.billableHours).toBe(6); // 2 + 4
      expect(projectOverview?.nonBillableHours).toBe(3);
    });

    test('getProjectMonthlySummary should aggregate user breakdown for entire month', async () => {
      const client = await createTestClient();
      const project = await createTestProject(client.id);
      const user2Id = 'month-user2-' + generateUUID().slice(0, 4);

      // Create entries for different users across June 2025
      await TimesheetRepository.create(
        { date: '2025-06-05', hours: 5, projectId: project.id, billable: true },
        context.userId,
        context.userName
      );
      await TimesheetRepository.create(
        { date: '2025-06-20', hours: 3, projectId: project.id, billable: true },
        context.userId,
        context.userName
      );
      await TimesheetRepository.create(
        { date: '2025-06-10', hours: 4, projectId: project.id, billable: false },
        user2Id,
        'Month User Two'
      );

      const summary = await TimesheetService.getProjectMonthlySummary(
        project.id,
        new Date(2025, 5, 15)
      );

      expect(summary).not.toBeNull();
      expect(summary?.totalHours).toBe(12); // 5 + 3 + 4
      expect(summary?.billableHours).toBe(8); // 5 + 3
      expect(summary?.nonBillableHours).toBe(4);

      expect(summary?.userBreakdown.length).toBe(2);

      const user1Breakdown = summary?.userBreakdown.find((u) => u.userId === context.userId);
      expect(user1Breakdown?.totalHours).toBe(8);

      const user2Breakdown = summary?.userBreakdown.find((u) => u.userId === user2Id);
      expect(user2Breakdown?.totalHours).toBe(4);
    });

    test('monthly overview should respect user filter', async () => {
      const client = await createTestClient();
      const project = await createTestProject(client.id);
      const otherUserId = 'month-other-' + generateUUID().slice(0, 4);

      // Create entries for different users in July 2025
      await TimesheetRepository.create(
        { date: '2025-07-10', hours: 3, projectId: project.id, billable: true },
        context.userId,
        context.userName
      );
      await TimesheetRepository.create(
        { date: '2025-07-15', hours: 7, projectId: project.id, billable: true },
        otherUserId,
        'Other Month User'
      );

      // Scoped to context user
      const overviewScoped = await TimesheetService.getMonthlyProjectOverview(
        new Date(2025, 6, 15),
        context.userId
      );

      const projectScopedOverview = overviewScoped.find((o) => o.projectId === project.id);
      expect(projectScopedOverview?.totalHours).toBe(3);

      // All users
      const overviewAll = await TimesheetService.getMonthlyProjectOverview(new Date(2025, 6, 15));
      const projectAllOverview = overviewAll.find((o) => o.projectId === project.id);
      expect(projectAllOverview?.totalHours).toBe(10); // 3 + 7
    });
  });
});

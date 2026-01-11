/**
 * Production Service Tests
 * Tests for production stages, progress tracking, comments, and photos
 */

import { describe, test, expect, beforeEach } from 'bun:test';

// Import shared test utilities (sets up mock localStorage/window)
import '@/domain/__tests__/testUtils';

import { ProductionService } from '@/domain/services/ProductionService';
import { ProjectRepository } from '@/data/repositories';
import type { Project, ProductionStageStatus } from '@/domain/models';
import { generateUUID, now, DEFAULT_PRODUCTION_STAGES } from '@/domain/models';

const testContext = {
  userId: 'test-user',
  userName: 'Test User',
};

// Create a mock project for testing
async function createTestProject(): Promise<Project> {
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

  // Manually save to localStorage for testing
  const { getAdapter } = await import('@/data/persistence');
  await getAdapter().save('projects', project);

  return project;
}

// ============================================
// STAGE INITIALIZATION TESTS
// ============================================

describe('ProductionService - Stage Initialization', () => {
  test('should initialize default production stages', async () => {
    const project = await createTestProject();

    const result = await ProductionService.initializeStages(project.id, testContext);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.length).toBe(DEFAULT_PRODUCTION_STAGES.length);
    expect(result.value[0].code).toBe('PREP');
    expect(result.value[0].status).toBe('NOT_STARTED');
    expect(result.value[0].progressPercent).toBe(0);
  });

  test('should not reinitialize if stages already exist', async () => {
    const project = await createTestProject();

    // Initialize once
    const first = await ProductionService.initializeStages(project.id, testContext);
    expect(first.ok).toBe(true);

    // Try to initialize again
    const second = await ProductionService.initializeStages(project.id, testContext);
    expect(second.ok).toBe(true);

    if (first.ok && second.ok) {
      // Should return existing stages, not create new ones
      expect(first.value[0].id).toBe(second.value[0].id);
    }
  });

  test('should return error for non-existent project', async () => {
    const result = await ProductionService.initializeStages('non-existent-id', testContext);
    expect(result.ok).toBe(false);
  });
});

// ============================================
// STAGE PROGRESS TESTS
// ============================================

describe('ProductionService - Stage Progress', () => {
  test('should update stage status to IN_PROGRESS', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    const result = await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      { status: 'IN_PROGRESS' },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('IN_PROGRESS');
    expect(result.value.actualStartDate).toBeDefined();
  });

  test('should update stage progress percentage', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Start the stage first
    await ProductionService.startStage(project.id, firstStage.id, testContext);

    // Update progress
    const result = await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      { progressPercent: 50 },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.progressPercent).toBe(50);
  });

  test('should complete stage and set end date', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Start then complete
    await ProductionService.startStage(project.id, firstStage.id, testContext);
    const result = await ProductionService.completeStage(project.id, firstStage.id, testContext);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.status).toBe('COMPLETED');
    expect(result.value.progressPercent).toBe(100);
    expect(result.value.actualEndDate).toBeDefined();
  });

  test('should block and unblock stage', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Start then block
    await ProductionService.startStage(project.id, firstStage.id, testContext);
    const blocked = await ProductionService.blockStage(project.id, firstStage.id, testContext);

    expect(blocked.ok).toBe(true);
    if (blocked.ok) {
      expect(blocked.value.status).toBe('BLOCKED');
    }

    // Unblock by starting again
    const unblocked = await ProductionService.startStage(project.id, firstStage.id, testContext);
    expect(unblocked.ok).toBe(true);
    if (unblocked.ok) {
      expect(unblocked.value.status).toBe('IN_PROGRESS');
    }
  });
});

// ============================================
// COMMENT TESTS
// ============================================

describe('ProductionService - Comments', () => {
  test('should add comment to stage', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    const result = await ProductionService.addComment(
      project.id,
      firstStage.id,
      { content: 'Test comment' },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.content).toBe('Test comment');
    expect(result.value.userName).toBe('Test User');
  });

  test('should delete comment from stage', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Add comment
    const addResult = await ProductionService.addComment(
      project.id,
      firstStage.id,
      { content: 'Comment to delete' },
      testContext
    );

    expect(addResult.ok).toBe(true);
    if (!addResult.ok) return;

    // Delete comment
    const deleteResult = await ProductionService.deleteComment(
      project.id,
      firstStage.id,
      addResult.value.id,
      testContext
    );

    expect(deleteResult.ok).toBe(true);

    // Verify comment is gone
    const updatedStages = await ProductionService.getStages(project.id);
    const updatedStage = updatedStages.find(s => s.id === firstStage.id);
    expect(updatedStage?.comments.length).toBe(0);
  });
});

// ============================================
// PHOTO TESTS
// ============================================

describe('ProductionService - Photos', () => {
  test('should add photo to stage', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    const result = await ProductionService.addPhoto(
      project.id,
      firstStage.id,
      { caption: 'Test photo', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...' },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.caption).toBe('Test photo');
    expect(result.value.userName).toBe('Test User');
  });

  test('should delete photo from stage', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Add photo
    const addResult = await ProductionService.addPhoto(
      project.id,
      firstStage.id,
      { caption: 'Photo to delete', dataUrl: 'data:image/png;base64,test' },
      testContext
    );

    expect(addResult.ok).toBe(true);
    if (!addResult.ok) return;

    // Delete photo
    const deleteResult = await ProductionService.deletePhoto(
      project.id,
      firstStage.id,
      addResult.value.id,
      testContext
    );

    expect(deleteResult.ok).toBe(true);

    // Verify photo is gone
    const updatedStages = await ProductionService.getStages(project.id);
    const updatedStage = updatedStages.find(s => s.id === firstStage.id);
    expect(updatedStage?.photos.length).toBe(0);
  });
});

// ============================================
// SUMMARY TESTS
// ============================================

describe('ProductionService - Summary', () => {
  test('should calculate production summary', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const summary = await ProductionService.getSummary(project.id);

    expect(summary.totalStages).toBe(DEFAULT_PRODUCTION_STAGES.length);
    expect(summary.completedStages).toBe(0);
    expect(summary.inProgressStages).toBe(0);
    expect(summary.blockedStages).toBe(0);
    expect(summary.overallProgress).toBe(0);
    expect(summary.isOnSchedule).toBe(true);
  });

  test('should update summary when stages progress', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];
    const secondStage = stages[1];

    // Complete first stage
    await ProductionService.startStage(project.id, firstStage.id, testContext);
    await ProductionService.completeStage(project.id, firstStage.id, testContext);

    // Start second stage
    await ProductionService.startStage(project.id, secondStage.id, testContext);

    const summary = await ProductionService.getSummary(project.id);

    expect(summary.completedStages).toBe(1);
    expect(summary.inProgressStages).toBe(1);
    expect(summary.overallProgress).toBeGreaterThan(0);
  });

  test('should mark as not on schedule when stage is blocked', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Start then block
    await ProductionService.startStage(project.id, firstStage.id, testContext);
    await ProductionService.blockStage(project.id, firstStage.id, testContext);

    const summary = await ProductionService.getSummary(project.id);

    expect(summary.blockedStages).toBe(1);
    expect(summary.isOnSchedule).toBe(false);
  });
});

// ============================================
// PERMISSION TESTS
// ============================================

describe('Production Permissions', () => {
  test('Production role should have production permissions', async () => {
    const { hasPermission } = await import('@/domain/models');

    expect(hasPermission('PRODUCTION', 'production:read')).toBe(true);
    expect(hasPermission('PRODUCTION', 'production:update')).toBe(true);
    expect(hasPermission('PRODUCTION', 'production:comment')).toBe(true);
    expect(hasPermission('PRODUCTION', 'production:photo')).toBe(true);
  });

  test('Sales role should only have read permission', async () => {
    const { hasPermission } = await import('@/domain/models');

    expect(hasPermission('SALES', 'production:read')).toBe(true);
    expect(hasPermission('SALES', 'production:update')).toBe(false);
    expect(hasPermission('SALES', 'production:comment')).toBe(false);
    expect(hasPermission('SALES', 'production:photo')).toBe(false);
  });

  test('Viewer role should only have read permission', async () => {
    const { hasPermission } = await import('@/domain/models');

    expect(hasPermission('VIEWER', 'production:read')).toBe(true);
    expect(hasPermission('VIEWER', 'production:update')).toBe(false);
    expect(hasPermission('VIEWER', 'production:comment')).toBe(false);
    expect(hasPermission('VIEWER', 'production:photo')).toBe(false);
  });

  test('Admin role should have all production permissions', async () => {
    const { hasPermission } = await import('@/domain/models');

    expect(hasPermission('ADMIN', 'production:read')).toBe(true);
    expect(hasPermission('ADMIN', 'production:update')).toBe(true);
    expect(hasPermission('ADMIN', 'production:comment')).toBe(true);
    expect(hasPermission('ADMIN', 'production:photo')).toBe(true);
  });
});

// ============================================
// PLANNED DATES TESTS
// ============================================

describe('ProductionService - Planned Dates', () => {
  test('should update plannedStartDate and plannedEndDate on stage', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Update planned dates
    const result = await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      {
        plannedStartDate: '2025-02-01',
        plannedEndDate: '2025-02-15',
      },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.plannedStartDate).toBe('2025-02-01');
    expect(result.value.plannedEndDate).toBe('2025-02-15');

    // Verify persisted
    const updatedStages = await ProductionService.getStages(project.id);
    const updatedStage = updatedStages.find((s) => s.id === firstStage.id);
    expect(updatedStage?.plannedStartDate).toBe('2025-02-01');
    expect(updatedStage?.plannedEndDate).toBe('2025-02-15');
  });

  test('should update only plannedStartDate (partial update)', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Update only start date
    const result = await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      { plannedStartDate: '2025-03-10' },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.plannedStartDate).toBe('2025-03-10');
    expect(result.value.plannedEndDate).toBeUndefined();
  });

  test('should update only plannedEndDate (partial update)', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Update only end date
    const result = await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      { plannedEndDate: '2025-04-20' },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.plannedEndDate).toBe('2025-04-20');
    expect(result.value.plannedStartDate).toBeUndefined();
  });

  test('should clear plannedStartDate when set to undefined', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // First set a date
    await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      { plannedStartDate: '2025-05-01' },
      testContext
    );

    // Then clear it by setting to undefined
    const result = await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      { plannedStartDate: undefined },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // When undefined is spread, it clears the field (expected behavior for clearing input)
    const updatedStages = await ProductionService.getStages(project.id);
    const updatedStage = updatedStages.find((s) => s.id === firstStage.id);
    expect(updatedStage?.plannedStartDate).toBeUndefined();
  });

  test('should not affect stage status or progress when updating planned dates', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Start the stage
    await ProductionService.startStage(project.id, firstStage.id, testContext);

    // Update manual progress
    await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      { progressPercent: 50 },
      testContext
    );

    // Update planned dates
    const result = await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      {
        plannedStartDate: '2025-06-01',
        plannedEndDate: '2025-06-30',
      },
      testContext
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Status and progress should remain unchanged
    expect(result.value.status).toBe('IN_PROGRESS');
    expect(result.value.progressPercent).toBe(50);
    // Planned dates should be set
    expect(result.value.plannedStartDate).toBe('2025-06-01');
    expect(result.value.plannedEndDate).toBe('2025-06-30');
  });
});

// ============================================
// PLANNED DATES HEADER DISPLAY TESTS
// ============================================

describe('Planned Dates Header Display Format', () => {
  // Helper function that mirrors the one in ProductionTab
  const formatPlannedDatesDisplay = (plannedStartDate?: string, plannedEndDate?: string): string | null => {
    if (!plannedStartDate && !plannedEndDate) return null;

    const formatShortDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
    };

    if (plannedStartDate && plannedEndDate) {
      return `${formatShortDate(plannedStartDate)} → ${formatShortDate(plannedEndDate)}`;
    } else if (plannedStartDate) {
      return `From ${formatShortDate(plannedStartDate)}`;
    } else if (plannedEndDate) {
      return `Until ${formatShortDate(plannedEndDate)}`;
    }
    return null;
  };

  test('should return null when neither date exists', () => {
    expect(formatPlannedDatesDisplay(undefined, undefined)).toBeNull();
  });

  test('should show "From X" when only start date exists', () => {
    const result = formatPlannedDatesDisplay('2025-02-01', undefined);
    expect(result).toContain('From');
    expect(result).toContain('Feb');
  });

  test('should show "Until X" when only end date exists', () => {
    const result = formatPlannedDatesDisplay(undefined, '2025-03-15');
    expect(result).toContain('Until');
    expect(result).toContain('Mar');
  });

  test('should show "start → end" when both dates exist', () => {
    const result = formatPlannedDatesDisplay('2025-02-01', '2025-02-28');
    expect(result).toContain('→');
    expect(result).toContain('Feb');
  });

  test('stage header should show planned dates when present', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Set planned dates
    await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      {
        plannedStartDate: '2025-02-01',
        plannedEndDate: '2025-02-15',
      },
      testContext
    );

    // Verify stage has planned dates that can be displayed
    const updatedStages = await ProductionService.getStages(project.id);
    const updatedStage = updatedStages.find((s) => s.id === firstStage.id);

    expect(updatedStage?.plannedStartDate).toBe('2025-02-01');
    expect(updatedStage?.plannedEndDate).toBe('2025-02-15');

    // Format should show both dates
    const displayText = formatPlannedDatesDisplay(
      updatedStage?.plannedStartDate,
      updatedStage?.plannedEndDate
    );
    expect(displayText).not.toBeNull();
    expect(displayText).toContain('→');
  });

  test('stage header should hide planned dates when absent', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Verify stage has no planned dates by default
    expect(firstStage.plannedStartDate).toBeUndefined();
    expect(firstStage.plannedEndDate).toBeUndefined();

    // Format should return null (nothing to display)
    const displayText = formatPlannedDatesDisplay(
      firstStage.plannedStartDate,
      firstStage.plannedEndDate
    );
    expect(displayText).toBeNull();
  });
});

// ============================================
// STAGES OVERVIEW TABLE COLUMN TESTS
// ============================================

describe('Stages Overview Table - Planned Date Columns', () => {
  // Helper function that mirrors the date formatting in the overview table
  const formatTableDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  test('overview table should show Planned Start column with date when set', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Set planned start date
    await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      { plannedStartDate: '2025-03-01' },
      testContext
    );

    const updatedStages = await ProductionService.getStages(project.id);
    const updatedStage = updatedStages.find((s) => s.id === firstStage.id);

    // The overview table should display the formatted date
    expect(updatedStage?.plannedStartDate).toBe('2025-03-01');
    const formattedDate = formatTableDate('2025-03-01');
    expect(formattedDate).toContain('Mar');
    expect(formattedDate).toContain('2025');
  });

  test('overview table should show Planned End column with date when set', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Set planned end date
    await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      { plannedEndDate: '2025-04-15' },
      testContext
    );

    const updatedStages = await ProductionService.getStages(project.id);
    const updatedStage = updatedStages.find((s) => s.id === firstStage.id);

    // The overview table should display the formatted date
    expect(updatedStage?.plannedEndDate).toBe('2025-04-15');
    const formattedDate = formatTableDate('2025-04-15');
    expect(formattedDate).toContain('Apr');
    expect(formattedDate).toContain('2025');
  });

  test('overview table should show empty cell for Planned Start when not set', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Stage should not have plannedStartDate by default
    expect(firstStage.plannedStartDate).toBeUndefined();

    // In the UI, undefined/null dates render as "—" (em-dash)
    // This test verifies the data is correctly absent
  });

  test('overview table should show empty cell for Planned End when not set', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Stage should not have plannedEndDate by default
    expect(firstStage.plannedEndDate).toBeUndefined();

    // In the UI, undefined/null dates render as "—" (em-dash)
    // This test verifies the data is correctly absent
  });

  test('overview table should show both Planned Start and End when both are set', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);
    const firstStage = stages[0];

    // Set both planned dates
    await ProductionService.updateStageProgress(
      project.id,
      firstStage.id,
      {
        plannedStartDate: '2025-05-01',
        plannedEndDate: '2025-05-31',
      },
      testContext
    );

    const updatedStages = await ProductionService.getStages(project.id);
    const updatedStage = updatedStages.find((s) => s.id === firstStage.id);

    expect(updatedStage?.plannedStartDate).toBe('2025-05-01');
    expect(updatedStage?.plannedEndDate).toBe('2025-05-31');

    // Both dates should be formattable for display
    const startFormatted = formatTableDate('2025-05-01');
    const endFormatted = formatTableDate('2025-05-31');
    expect(startFormatted).toContain('May');
    expect(endFormatted).toContain('May');
  });

  test('overview table date columns preserve data across all stages', async () => {
    const project = await createTestProject();
    await ProductionService.initializeStages(project.id, testContext);

    const stages = await ProductionService.getStages(project.id);

    // Set dates on multiple stages
    await ProductionService.updateStageProgress(
      project.id,
      stages[0].id,
      { plannedStartDate: '2025-01-01', plannedEndDate: '2025-01-15' },
      testContext
    );

    await ProductionService.updateStageProgress(
      project.id,
      stages[1].id,
      { plannedStartDate: '2025-01-16', plannedEndDate: '2025-01-31' },
      testContext
    );

    const updatedStages = await ProductionService.getStages(project.id);

    // First stage
    const stage1 = updatedStages.find((s) => s.id === stages[0].id);
    expect(stage1?.plannedStartDate).toBe('2025-01-01');
    expect(stage1?.plannedEndDate).toBe('2025-01-15');

    // Second stage
    const stage2 = updatedStages.find((s) => s.id === stages[1].id);
    expect(stage2?.plannedStartDate).toBe('2025-01-16');
    expect(stage2?.plannedEndDate).toBe('2025-01-31');
  });
});

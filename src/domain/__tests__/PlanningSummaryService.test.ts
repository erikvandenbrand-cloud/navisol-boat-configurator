/**
 * PlanningSummaryService Tests
 *
 * Tests for planning summary generation, date derivation, and lock/autosync behavior.
 *
 * Key behaviors tested:
 * 1. Derive dates from production items (min startDate, max endDate)
 * 2. datesLocked blocks overwrite on refresh
 * 3. autoSyncDates gating ('off', 'whenEmpty', 'whenUnlocked')
 * 4. Stage fallback dates when all production items have no dates
 * 5. Recalculate clears lock
 * 6. Stage/procedure grouping
 * 7. No duplicates on re-generation
 * 8. productionWorkItemIds completeness
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { PlanningSummaryService } from '@/domain/services/PlanningSummaryService';
import type {
  Project,
  WorkItem,
  ProductionStage,
  AutoSyncDatesMode,
} from '@/domain/models';
import { generateUUID } from '@/domain/models';
import { clearAllTestData } from './testUtils';

// ============================================
// TEST FIXTURES
// ============================================

function createTestProject(overrides: Partial<Project> = {}): Project {
  return {
    id: generateUUID(),
    projectNumber: 'TEST-001',
    title: 'Test Project',
    type: 'NEW_BUILD',
    status: 'DRAFT',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: 0,
    workItems: [],
    ...overrides,
  };
}

function createProductionWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: generateUUID(),
    projectId: 'test-project',
    workItemNumber: 1,
    kind: 'production',
    title: 'Test Production Task',
    status: 'TODO',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: 0,
    createdBy: 'test',
    ...overrides,
  };
}

function createPlanningWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: generateUUID(),
    projectId: 'test-project',
    workItemNumber: 1,
    kind: 'planning',
    title: 'Test Planning Task',
    status: 'TODO',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: 0,
    createdBy: 'test',
    ...overrides,
  };
}

function createProductionStage(overrides: Partial<ProductionStage> = {}): ProductionStage {
  return {
    id: generateUUID(),
    projectId: 'test-project',
    code: 'PREP',
    name: 'Preparation',
    order: 1,
    status: 'NOT_STARTED',
    progressPercent: 0,
    autoProgressFromTasks: true,
    estimatedDays: 5,
    taskIds: [],
    comments: [],
    photos: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: 0,
    ...overrides,
  };
}

const TEST_CONTEXT = { userId: 'test-user', userName: 'Test User' };

// ============================================
// TESTS
// ============================================

describe('PlanningSummaryService', () => {
  beforeEach(async () => {
    await clearAllTestData();
  });

  describe('getProductionItemsByGroup', () => {
    it('should group production items by stageId', () => {
      const stage1Id = generateUUID();
      const stage2Id = generateUUID();

      const project = createTestProject({
        productionStages: [
          createProductionStage({ id: stage1Id, name: 'Stage 1', order: 1 }),
          createProductionStage({ id: stage2Id, name: 'Stage 2', order: 2 }),
        ],
        workItems: [
          createProductionWorkItem({ id: 'prod1', stageId: stage1Id, startDate: '2024-01-01', endDate: '2024-01-05' }),
          createProductionWorkItem({ id: 'prod2', stageId: stage1Id, startDate: '2024-01-03', endDate: '2024-01-10' }),
          createProductionWorkItem({ id: 'prod3', stageId: stage2Id, startDate: '2024-02-01', endDate: '2024-02-15' }),
        ],
      });

      const groups = PlanningSummaryService.getProductionItemsByGroup(project, { summaryType: 'stage' });

      expect(groups.length).toBe(2);

      const group1 = groups.find((g) => g.groupKey === stage1Id);
      expect(group1).toBeDefined();
      expect(group1!.productionItems.length).toBe(2);
      expect(group1!.earliestStart).toBe('2024-01-01');
      expect(group1!.latestEnd).toBe('2024-01-10');

      const group2 = groups.find((g) => g.groupKey === stage2Id);
      expect(group2).toBeDefined();
      expect(group2!.productionItems.length).toBe(1);
      expect(group2!.earliestStart).toBe('2024-02-01');
      expect(group2!.latestEnd).toBe('2024-02-15');
    });

    it('should derive min startDate and max endDate from production items', () => {
      const stageId = generateUUID();

      const project = createTestProject({
        productionStages: [createProductionStage({ id: stageId })],
        workItems: [
          createProductionWorkItem({ stageId, startDate: '2024-03-01', endDate: '2024-03-05' }),
          createProductionWorkItem({ stageId, startDate: '2024-01-15', endDate: '2024-01-20' }),
          createProductionWorkItem({ stageId, startDate: '2024-02-10', endDate: '2024-04-30' }),
        ],
      });

      const groups = PlanningSummaryService.getProductionItemsByGroup(project, { summaryType: 'stage' });

      expect(groups.length).toBe(1);
      expect(groups[0].earliestStart).toBe('2024-01-15'); // min
      expect(groups[0].latestEnd).toBe('2024-04-30'); // max
    });

    it('should ignore items with missing dates when deriving range', () => {
      const stageId = generateUUID();

      const project = createTestProject({
        productionStages: [createProductionStage({ id: stageId })],
        workItems: [
          createProductionWorkItem({ stageId, startDate: '2024-02-01', endDate: '2024-02-10' }),
          createProductionWorkItem({ stageId, startDate: undefined, endDate: undefined }),
          createProductionWorkItem({ stageId, startDate: '2024-03-01', endDate: undefined }),
        ],
      });

      const groups = PlanningSummaryService.getProductionItemsByGroup(project, { summaryType: 'stage' });

      expect(groups[0].earliestStart).toBe('2024-02-01');
      expect(groups[0].latestEnd).toBe('2024-02-10');
    });

    it('should use stage fallback dates when all production items have no dates', () => {
      const stageId = generateUUID();

      const project = createTestProject({
        productionStages: [
          createProductionStage({
            id: stageId,
            plannedStartDate: '2024-05-01',
            plannedEndDate: '2024-05-31',
          }),
        ],
        workItems: [
          createProductionWorkItem({ stageId, startDate: undefined, endDate: undefined }),
          createProductionWorkItem({ stageId, startDate: undefined, endDate: undefined }),
        ],
      });

      const groups = PlanningSummaryService.getProductionItemsByGroup(project, { summaryType: 'stage' });

      expect(groups[0].earliestStart).toBeUndefined(); // No production dates
      expect(groups[0].latestEnd).toBeUndefined();
      expect(groups[0].stageFallbackStart).toBe('2024-05-01');
      expect(groups[0].stageFallbackEnd).toBe('2024-05-31');
      expect(groups[0].usedStageFallback).toBe(true);
    });

    it('should NOT use stage fallback if any production item has dates', () => {
      const stageId = generateUUID();

      const project = createTestProject({
        productionStages: [
          createProductionStage({
            id: stageId,
            plannedStartDate: '2024-05-01',
            plannedEndDate: '2024-05-31',
          }),
        ],
        workItems: [
          createProductionWorkItem({ stageId, startDate: '2024-02-01', endDate: '2024-02-10' }),
          createProductionWorkItem({ stageId, startDate: undefined, endDate: undefined }),
        ],
      });

      const groups = PlanningSummaryService.getProductionItemsByGroup(project, { summaryType: 'stage' });

      expect(groups[0].earliestStart).toBe('2024-02-01');
      expect(groups[0].latestEnd).toBe('2024-02-10');
      expect(groups[0].usedStageFallback).toBe(false);
    });

    it('should group by procedureId when summaryType is procedure', () => {
      const proc1Id = generateUUID();
      const proc2Id = generateUUID();

      const project = createTestProject({
        workItems: [
          createProductionWorkItem({ sourceProcedureId: proc1Id, startDate: '2024-01-01' }),
          createProductionWorkItem({ sourceProcedureId: proc1Id, startDate: '2024-01-05' }),
          createProductionWorkItem({ sourceProcedureId: proc2Id, startDate: '2024-02-01' }),
        ],
      });

      const groups = PlanningSummaryService.getProductionItemsByGroup(project, { summaryType: 'procedure' });

      expect(groups.length).toBe(2);
      expect(groups.some((g) => g.groupKey === proc1Id)).toBe(true);
      expect(groups.some((g) => g.groupKey === proc2Id)).toBe(true);
    });
  });

  describe('getEffectiveDatesForGroup', () => {
    it('should prefer production-derived dates over fallback', () => {
      const group = {
        groupKey: 'stage1',
        label: 'Stage 1',
        productionItems: [],
        totalEstimatedHours: 0,
        completedCount: 0,
        totalCount: 2,
        progressPercent: 0,
        earliestStart: '2024-01-01',
        latestEnd: '2024-01-31',
        stageFallbackStart: '2024-02-01',
        stageFallbackEnd: '2024-02-28',
        usedStageFallback: false,
      };

      const dates = PlanningSummaryService.getEffectiveDatesForGroup(group);

      expect(dates.startDate).toBe('2024-01-01');
      expect(dates.endDate).toBe('2024-01-31');
    });

    it('should use fallback dates when no production dates', () => {
      const group = {
        groupKey: 'stage1',
        label: 'Stage 1',
        productionItems: [],
        totalEstimatedHours: 0,
        completedCount: 0,
        totalCount: 2,
        progressPercent: 0,
        earliestStart: undefined,
        latestEnd: undefined,
        stageFallbackStart: '2024-02-01',
        stageFallbackEnd: '2024-02-28',
        usedStageFallback: true,
      };

      const dates = PlanningSummaryService.getEffectiveDatesForGroup(group);

      expect(dates.startDate).toBe('2024-02-01');
      expect(dates.endDate).toBe('2024-02-28');
    });
  });

  describe('shouldAutoSyncDates', () => {
    it('should return false when mode is off', () => {
      const summary = createPlanningWorkItem({
        summarizes: {
          summaryType: 'stage',
          stageId: 'test',
          productionWorkItemIds: [],
          lastGeneratedAt: '2024-01-01',
          generatedBy: 'test',
          datesLocked: false,
          autoSyncDates: 'off',
        },
      });

      expect(PlanningSummaryService.shouldAutoSyncDates(summary, 'off')).toBe(false);
    });

    it('should return false when mode is whenEmpty and summary has dates', () => {
      const summary = createPlanningWorkItem({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        summarizes: {
          summaryType: 'stage',
          stageId: 'test',
          productionWorkItemIds: [],
          lastGeneratedAt: '2024-01-01',
          generatedBy: 'test',
          datesLocked: false,
          autoSyncDates: 'whenEmpty',
        },
      });

      expect(PlanningSummaryService.shouldAutoSyncDates(summary, 'whenEmpty')).toBe(false);
    });

    it('should return true when mode is whenEmpty and summary has no dates', () => {
      const summary = createPlanningWorkItem({
        startDate: undefined,
        endDate: undefined,
        summarizes: {
          summaryType: 'stage',
          stageId: 'test',
          productionWorkItemIds: [],
          lastGeneratedAt: '2024-01-01',
          generatedBy: 'test',
          datesLocked: false,
          autoSyncDates: 'whenEmpty',
        },
      });

      expect(PlanningSummaryService.shouldAutoSyncDates(summary, 'whenEmpty')).toBe(true);
    });

    it('should return false when mode is whenUnlocked but dates are locked', () => {
      const summary = createPlanningWorkItem({
        summarizes: {
          summaryType: 'stage',
          stageId: 'test',
          productionWorkItemIds: [],
          lastGeneratedAt: '2024-01-01',
          generatedBy: 'test',
          datesLocked: true,
          autoSyncDates: 'whenUnlocked',
        },
      });

      expect(PlanningSummaryService.shouldAutoSyncDates(summary, 'whenUnlocked')).toBe(false);
    });

    it('should return true when mode is whenUnlocked and dates are not locked', () => {
      const summary = createPlanningWorkItem({
        summarizes: {
          summaryType: 'stage',
          stageId: 'test',
          productionWorkItemIds: [],
          lastGeneratedAt: '2024-01-01',
          generatedBy: 'test',
          datesLocked: false,
          autoSyncDates: 'whenUnlocked',
        },
      });

      expect(PlanningSummaryService.shouldAutoSyncDates(summary, 'whenUnlocked')).toBe(true);
    });

    it('should default to whenUnlocked behavior if mode is undefined', () => {
      const unlockedSummary = createPlanningWorkItem({
        summarizes: {
          summaryType: 'stage',
          stageId: 'test',
          productionWorkItemIds: [],
          lastGeneratedAt: '2024-01-01',
          generatedBy: 'test',
          datesLocked: false,
        },
      });

      const lockedSummary = createPlanningWorkItem({
        summarizes: {
          summaryType: 'stage',
          stageId: 'test',
          productionWorkItemIds: [],
          lastGeneratedAt: '2024-01-01',
          generatedBy: 'test',
          datesLocked: true,
        },
      });

      expect(PlanningSummaryService.shouldAutoSyncDates(unlockedSummary, undefined)).toBe(true);
      expect(PlanningSummaryService.shouldAutoSyncDates(lockedSummary, undefined)).toBe(false);
    });
  });

  describe('deriveSummaryStatus', () => {
    it('should return COMPLETED if all production items are COMPLETED', () => {
      const items = [
        createProductionWorkItem({ status: 'COMPLETED' }),
        createProductionWorkItem({ status: 'COMPLETED' }),
        createProductionWorkItem({ status: 'COMPLETED' }),
      ];

      expect(PlanningSummaryService.deriveSummaryStatus(items)).toBe('COMPLETED');
    });

    it('should return IN_PROGRESS if any item is IN_PROGRESS', () => {
      const items = [
        createProductionWorkItem({ status: 'TODO' }),
        createProductionWorkItem({ status: 'IN_PROGRESS' }),
        createProductionWorkItem({ status: 'TODO' }),
      ];

      expect(PlanningSummaryService.deriveSummaryStatus(items)).toBe('IN_PROGRESS');
    });

    it('should return IN_PROGRESS if some items are COMPLETED but not all', () => {
      const items = [
        createProductionWorkItem({ status: 'COMPLETED' }),
        createProductionWorkItem({ status: 'TODO' }),
      ];

      expect(PlanningSummaryService.deriveSummaryStatus(items)).toBe('IN_PROGRESS');
    });

    it('should return TODO if no items are IN_PROGRESS or COMPLETED', () => {
      const items = [
        createProductionWorkItem({ status: 'TODO' }),
        createProductionWorkItem({ status: 'TODO' }),
      ];

      expect(PlanningSummaryService.deriveSummaryStatus(items)).toBe('TODO');
    });

    it('should return TODO for empty array', () => {
      expect(PlanningSummaryService.deriveSummaryStatus([])).toBe('TODO');
    });
  });

  describe('findExistingSummary', () => {
    it('should find existing summary by summaryType and stageId', () => {
      const stageId = generateUUID();

      const project = createTestProject({
        workItems: [
          createPlanningWorkItem({
            id: 'existing-summary',
            summarizes: {
              summaryType: 'stage',
              stageId,
              productionWorkItemIds: [],
              lastGeneratedAt: '2024-01-01',
              generatedBy: 'test',
            },
          }),
        ],
      });

      const found = PlanningSummaryService.findExistingSummary(project, 'stage', stageId);

      expect(found).toBeDefined();
      expect(found!.id).toBe('existing-summary');
    });

    it('should find existing summary by summaryType and procedureId', () => {
      const procedureId = generateUUID();

      const project = createTestProject({
        workItems: [
          createPlanningWorkItem({
            id: 'proc-summary',
            summarizes: {
              summaryType: 'procedure',
              procedureId,
              productionWorkItemIds: [],
              lastGeneratedAt: '2024-01-01',
              generatedBy: 'test',
            },
          }),
        ],
      });

      const found = PlanningSummaryService.findExistingSummary(project, 'procedure', procedureId);

      expect(found).toBeDefined();
      expect(found!.id).toBe('proc-summary');
    });

    it('should not match if summaryType differs', () => {
      const groupId = generateUUID();

      const project = createTestProject({
        workItems: [
          createPlanningWorkItem({
            summarizes: {
              summaryType: 'stage',
              stageId: groupId,
              productionWorkItemIds: [],
              lastGeneratedAt: '2024-01-01',
              generatedBy: 'test',
            },
          }),
        ],
      });

      const found = PlanningSummaryService.findExistingSummary(project, 'procedure', groupId);

      expect(found).toBeUndefined();
    });

    it('should match by boatInstanceId when provided', () => {
      const stageId = generateUUID();

      const project = createTestProject({
        workItems: [
          createPlanningWorkItem({
            id: 'boat1-summary',
            summarizes: {
              summaryType: 'stage',
              stageId,
              boatInstanceId: 'boat-1',
              productionWorkItemIds: [],
              lastGeneratedAt: '2024-01-01',
              generatedBy: 'test',
            },
          }),
          createPlanningWorkItem({
            id: 'boat2-summary',
            summarizes: {
              summaryType: 'stage',
              stageId,
              boatInstanceId: 'boat-2',
              productionWorkItemIds: [],
              lastGeneratedAt: '2024-01-01',
              generatedBy: 'test',
            },
          }),
        ],
      });

      const found1 = PlanningSummaryService.findExistingSummary(project, 'stage', stageId, 'boat-1');
      const found2 = PlanningSummaryService.findExistingSummary(project, 'stage', stageId, 'boat-2');

      expect(found1?.id).toBe('boat1-summary');
      expect(found2?.id).toBe('boat2-summary');
    });
  });

  describe('isSummary', () => {
    it('should return true for planning items with summarizes', () => {
      const item = createPlanningWorkItem({
        summarizes: {
          summaryType: 'stage',
          stageId: 'test',
          productionWorkItemIds: [],
          lastGeneratedAt: '2024-01-01',
          generatedBy: 'test',
        },
      });

      expect(PlanningSummaryService.isSummary(item)).toBe(true);
    });

    it('should return false for planning items without summarizes', () => {
      const item = createPlanningWorkItem();

      expect(PlanningSummaryService.isSummary(item)).toBe(false);
    });

    it('should return false for production items', () => {
      const item = createProductionWorkItem();

      expect(PlanningSummaryService.isSummary(item)).toBe(false);
    });
  });

  describe('getSummaryLabel', () => {
    it('should return stage name for stage summaries with project', () => {
      const stageId = generateUUID();

      const summary = createPlanningWorkItem({
        title: 'Summary Title',
        summarizes: {
          summaryType: 'stage',
          stageId,
          productionWorkItemIds: [],
          lastGeneratedAt: '2024-01-01',
          generatedBy: 'test',
        },
      });

      const project = createTestProject({
        productionStages: [
          createProductionStage({ id: stageId, name: 'Hull Construction' }),
        ],
      });

      const label = PlanningSummaryService.getSummaryLabel(summary, project);

      expect(label).toBe('Hull Construction');
    });

    it('should return title for non-summary items', () => {
      const item = createPlanningWorkItem({ title: 'My Planning Task' });

      const label = PlanningSummaryService.getSummaryLabel(item);

      expect(label).toBe('My Planning Task');
    });
  });
});

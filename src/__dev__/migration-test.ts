/**
 * Migration Test Helper - DEV ONLY
 *
 * This file tests the migrateToWorkItems() function with legacy data.
 * It is NOT included in production builds.
 *
 * Usage:
 *   1. Import and call runMigrationTest() from browser console or dev component
 *   2. Or run: bun run src/__dev__/migration-test.ts
 *
 * @dev-only
 */

// Guard: Only run in development
if (process.env.NODE_ENV === 'production') {
  throw new Error('Migration test helper should not be imported in production!');
}

import type { Project, WorkItem } from '@/domain/models';

// ============================================
// LEGACY DATA FIXTURES
// ============================================

/**
 * Creates a legacy-shaped project object with:
 * - planning.tasks (old PlanningTask format)
 * - tasks (old ProjectTask format)
 */
export function createLegacyProject(): Partial<Project> {
  return {
    id: 'test-project-001',
    projectNumber: 'PRJ-2026-0001',
    title: 'Legacy Migration Test Project',
    status: 'IN_PRODUCTION',
    type: 'NEW_BUILD',
    clientId: 'client-001',

    // Legacy planning structure with old field names
    planning: {
      resources: [
        { id: 'res-001', name: 'John Doe', role: 'Technician' },
        { id: 'res-002', name: 'Jane Smith', role: 'Engineer' },
      ],
      // OLD: planning.tasks with legacy field names
      tasks: [
        {
          id: 'planning-task-001',
          title: 'Design Review',
          startDate: '2026-01-15',
          endDate: '2026-01-20',
          durationDays: 5,
          status: 'DONE', // OLD status - should become COMPLETED
          assigneeResourceIds: ['res-001'], // OLD field name - should become assigneeIds
          dependsOnTaskIds: [], // OLD field name - should become dependsOnIds
          notes: 'Initial design review',
        },
        {
          id: 'planning-task-002',
          title: 'Material Procurement',
          startDate: '2026-01-21',
          endDate: '2026-01-25',
          status: 'IN_PROGRESS',
          assigneeResourceIds: ['res-001', 'res-002'],
          dependsOnTaskIds: ['planning-task-001'], // Depends on first task
          notes: 'Order materials',
        },
        {
          id: 'planning-task-003',
          title: 'Pending Task',
          startDate: '2026-01-26',
          status: 'TODO',
          assigneeResourceIds: [],
          dependsOnTaskIds: ['planning-task-002'],
        },
      ],
    },

    // OLD: project.tasks with legacy field names
    tasks: [
      {
        id: 'prod-task-001',
        projectId: 'test-project-001',
        taskNumber: 1, // OLD field name - should become workItemNumber
        stageId: 'stage-001',
        title: 'Install Engine',
        description: 'Install main propulsion engine',
        category: 'PROPULSION',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        assignedTo: 'John Doe', // OLD single assignee - should become assigneeIds array
        estimatedHours: 8,
        dueDate: '2026-01-30',
        dependsOn: [], // OLD field name - should become dependsOnIds
        blockedBy: [],
        timeLogs: [
          {
            id: 'log-001',
            taskId: 'prod-task-001',
            userId: 'user-001',
            userName: 'John Doe',
            date: '2026-01-20',
            hours: 4,
            description: 'Started installation',
            createdAt: '2026-01-20T10:00:00Z',
          },
        ],
        totalLoggedHours: 4,
        notes: 'Engine model XYZ-500',
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-01-20T10:00:00Z',
        version: 1,
        createdBy: 'user-001',
      },
      {
        id: 'prod-task-002',
        projectId: 'test-project-001',
        taskNumber: 2,
        stageId: 'stage-001',
        title: 'Wire Electrical Panel',
        description: 'Complete electrical panel wiring',
        category: 'ELECTRICAL',
        priority: 'MEDIUM',
        status: 'TODO',
        assignedTo: 'Jane Smith',
        estimatedHours: 6,
        dependsOn: ['prod-task-001'], // Depends on engine install
        timeLogs: [],
        totalLoggedHours: 0,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-01-15T09:00:00Z',
        version: 0,
        createdBy: 'user-001',
      },
      {
        id: 'prod-task-003',
        projectId: 'test-project-001',
        taskNumber: 3,
        title: 'Final Inspection',
        category: 'TESTING',
        priority: 'LOW',
        status: 'TODO',
        // No assignee - should result in empty assigneeIds array
        estimatedHours: 2,
        timeLogs: [],
        totalLoggedHours: 0,
        createdAt: '2026-01-15T09:00:00Z',
        updatedAt: '2026-01-15T09:00:00Z',
        version: 0,
        createdBy: 'user-001',
      },
    ],

    // Empty workItems - migration should populate this
    workItems: undefined,

    // Other required fields (minimal)
    configuration: {
      propulsionType: 'Electric',
      items: [],
      subtotalExclVat: 0,
      totalExclVat: 0,
      vatRate: 21,
      vatAmount: 0,
      totalInclVat: 0,
      isFrozen: true,
      lastModifiedAt: '2026-01-15T09:00:00Z',
      lastModifiedBy: 'user-001',
    },
    quotes: [],
    documents: [],
    bomSnapshots: [],
    configurationSnapshots: [],
    amendments: [],
    productionStages: [],
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-20T10:00:00Z',
    version: 1,
  } as unknown as Partial<Project>;
}

// ============================================
// EXPECTED OUTPUT
// ============================================

/**
 * Expected workItems after migration
 */
export function getExpectedWorkItems(): Partial<WorkItem>[] {
  return [
    // Planning tasks (kind: 'planning')
    {
      id: 'planning-task-001',
      kind: 'planning',
      title: 'Design Review',
      status: 'COMPLETED', // DONE -> COMPLETED
      assigneeIds: ['res-001'], // assigneeResourceIds -> assigneeIds
      dependsOnIds: [], // dependsOnTaskIds -> dependsOnIds
      startDate: '2026-01-15',
      endDate: '2026-01-20',
      durationDays: 5,
      notes: 'Initial design review',
    },
    {
      id: 'planning-task-002',
      kind: 'planning',
      title: 'Material Procurement',
      status: 'IN_PROGRESS',
      assigneeIds: ['res-001', 'res-002'],
      dependsOnIds: ['planning-task-001'],
      startDate: '2026-01-21',
      endDate: '2026-01-25',
    },
    {
      id: 'planning-task-003',
      kind: 'planning',
      title: 'Pending Task',
      status: 'TODO',
      assigneeIds: [],
      dependsOnIds: ['planning-task-002'],
      startDate: '2026-01-26',
    },
    // Production tasks (kind: 'production')
    {
      id: 'prod-task-001',
      kind: 'production',
      title: 'Install Engine',
      status: 'IN_PROGRESS',
      category: 'PROPULSION',
      priority: 'HIGH',
      assigneeIds: ['John Doe'], // assignedTo -> assigneeIds array
      dependsOnIds: [], // dependsOn -> dependsOnIds
      estimatedHours: 8,
      totalLoggedHours: 4,
      stageId: 'stage-001',
    },
    {
      id: 'prod-task-002',
      kind: 'production',
      title: 'Wire Electrical Panel',
      status: 'TODO',
      category: 'ELECTRICAL',
      priority: 'MEDIUM',
      assigneeIds: ['Jane Smith'],
      dependsOnIds: ['prod-task-001'],
      estimatedHours: 6,
      stageId: 'stage-001',
    },
    {
      id: 'prod-task-003',
      kind: 'production',
      title: 'Final Inspection',
      status: 'TODO',
      category: 'TESTING',
      priority: 'LOW',
      assigneeIds: [], // No assignee -> empty array
      dependsOnIds: [],
      estimatedHours: 2,
    },
  ];
}

// ============================================
// MIGRATION TEST
// ============================================

interface MigrationTestResult {
  passed: boolean;
  totalChecks: number;
  passedChecks: number;
  failures: string[];
  migratedWorkItems: WorkItem[];
}

/**
 * Run the migration test and return detailed results
 */
export async function runMigrationTest(): Promise<MigrationTestResult> {
  const { ProjectRepository } = await import('@/data/repositories');
  const { getAdapter } = await import('@/data/persistence');

  const failures: string[] = [];
  let passedChecks = 0;
  const totalChecks = 15; // Number of assertions

  console.log('\n========================================');
  console.log('🧪 MIGRATION TEST: migrateToWorkItems()');
  console.log('========================================\n');

  // 1. Create legacy project and save it (bypassing migration)
  const legacyProject = createLegacyProject();
  const adapter = getAdapter();

  // Save directly to storage to bypass migration on save
  // We need to add required Entity fields for the adapter
  const projectToSave = {
    ...legacyProject,
    createdAt: legacyProject.createdAt || new Date().toISOString(),
    updatedAt: legacyProject.updatedAt || new Date().toISOString(),
    version: legacyProject.version || 0,
  } as Project;
  await adapter.save('projects', projectToSave);

  console.log('📦 Created legacy project with:');
  console.log(`   - ${(legacyProject.planning?.tasks as any[])?.length || 0} planning tasks`);
  console.log(`   - ${(legacyProject.tasks as any[])?.length || 0} production tasks`);
  console.log(`   - ${legacyProject.workItems?.length || 0} workItems (should be 0)\n`);

  // 2. Load through ProjectRepository (triggers migration)
  const migratedProject = await ProjectRepository.getById(legacyProject.id!);

  if (!migratedProject) {
    return {
      passed: false,
      totalChecks,
      passedChecks: 0,
      failures: ['Failed to load project from repository'],
      migratedWorkItems: [],
    };
  }

  const workItems = migratedProject.workItems || [];

  console.log('✨ After migration:');
  console.log(`   - ${workItems.length} workItems created\n`);

  // ============================================
  // ASSERTIONS
  // ============================================

  // Check 1: Correct number of workItems
  const expectedCount = 6;
  if (workItems.length === expectedCount) {
    console.log(`✅ Check 1: Correct count (${expectedCount} workItems)`);
    passedChecks++;
  } else {
    const msg = `Expected ${expectedCount} workItems, got ${workItems.length}`;
    console.log(`❌ Check 1: ${msg}`);
    failures.push(msg);
  }

  // Check 2: Planning tasks have kind: 'planning'
  const planningItems = workItems.filter(w => w.kind === 'planning');
  if (planningItems.length === 3) {
    console.log(`✅ Check 2: Correct planning count (3)`);
    passedChecks++;
  } else {
    const msg = `Expected 3 planning items, got ${planningItems.length}`;
    console.log(`❌ Check 2: ${msg}`);
    failures.push(msg);
  }

  // Check 3: Production tasks have kind: 'production'
  const productionItems = workItems.filter(w => w.kind === 'production');
  if (productionItems.length === 3) {
    console.log(`✅ Check 3: Correct production count (3)`);
    passedChecks++;
  } else {
    const msg = `Expected 3 production items, got ${productionItems.length}`;
    console.log(`❌ Check 3: ${msg}`);
    failures.push(msg);
  }

  // Check 4: DONE status migrated to COMPLETED
  const doneTask = workItems.find(w => w.id === 'planning-task-001');
  if (doneTask?.status === 'COMPLETED') {
    console.log(`✅ Check 4: DONE -> COMPLETED migration`);
    passedChecks++;
  } else {
    const msg = `Expected status COMPLETED, got ${doneTask?.status}`;
    console.log(`❌ Check 4: ${msg}`);
    failures.push(msg);
  }

  // Check 5: assigneeResourceIds -> assigneeIds (planning)
  const planningTask1 = workItems.find(w => w.id === 'planning-task-001');
  if (planningTask1?.assigneeIds?.length === 1 && planningTask1.assigneeIds[0] === 'res-001') {
    console.log(`✅ Check 5: assigneeResourceIds -> assigneeIds (planning)`);
    passedChecks++;
  } else {
    const msg = `Expected assigneeIds ['res-001'], got ${JSON.stringify(planningTask1?.assigneeIds)}`;
    console.log(`❌ Check 5: ${msg}`);
    failures.push(msg);
  }

  // Check 6: dependsOnTaskIds -> dependsOnIds (planning)
  const planningTask2 = workItems.find(w => w.id === 'planning-task-002');
  if (planningTask2?.dependsOnIds?.length === 1 && planningTask2.dependsOnIds[0] === 'planning-task-001') {
    console.log(`✅ Check 6: dependsOnTaskIds -> dependsOnIds (planning)`);
    passedChecks++;
  } else {
    const msg = `Expected dependsOnIds ['planning-task-001'], got ${JSON.stringify(planningTask2?.dependsOnIds)}`;
    console.log(`❌ Check 6: ${msg}`);
    failures.push(msg);
  }

  // Check 7: assignedTo (string) -> assigneeIds (array) for production
  const prodTask1 = workItems.find(w => w.id === 'prod-task-001');
  if (prodTask1?.assigneeIds?.length === 1 && prodTask1.assigneeIds[0] === 'John Doe') {
    console.log(`✅ Check 7: assignedTo -> assigneeIds (production)`);
    passedChecks++;
  } else {
    const msg = `Expected assigneeIds ['John Doe'], got ${JSON.stringify(prodTask1?.assigneeIds)}`;
    console.log(`❌ Check 7: ${msg}`);
    failures.push(msg);
  }

  // Check 8: dependsOn -> dependsOnIds (production)
  const prodTask2 = workItems.find(w => w.id === 'prod-task-002');
  if (prodTask2?.dependsOnIds?.length === 1 && prodTask2.dependsOnIds[0] === 'prod-task-001') {
    console.log(`✅ Check 8: dependsOn -> dependsOnIds (production)`);
    passedChecks++;
  } else {
    const msg = `Expected dependsOnIds ['prod-task-001'], got ${JSON.stringify(prodTask2?.dependsOnIds)}`;
    console.log(`❌ Check 8: ${msg}`);
    failures.push(msg);
  }

  // Check 9: Empty assignee -> empty array
  const prodTask3 = workItems.find(w => w.id === 'prod-task-003');
  if (prodTask3?.assigneeIds?.length === 0) {
    console.log(`✅ Check 9: No assignee -> empty assigneeIds array`);
    passedChecks++;
  } else {
    const msg = `Expected empty assigneeIds, got ${JSON.stringify(prodTask3?.assigneeIds)}`;
    console.log(`❌ Check 9: ${msg}`);
    failures.push(msg);
  }

  // Check 10: workItemNumber is assigned
  const hasNumbers = workItems.every(w => typeof w.workItemNumber === 'number' && w.workItemNumber > 0);
  if (hasNumbers) {
    console.log(`✅ Check 10: All items have workItemNumber`);
    passedChecks++;
  } else {
    const msg = 'Some items missing workItemNumber';
    console.log(`❌ Check 10: ${msg}`);
    failures.push(msg);
  }

  // Check 11: Production fields preserved (category, priority)
  if (prodTask1?.category === 'PROPULSION' && prodTask1?.priority === 'HIGH') {
    console.log(`✅ Check 11: Production fields preserved (category, priority)`);
    passedChecks++;
  } else {
    const msg = `Expected category PROPULSION, priority HIGH; got ${prodTask1?.category}, ${prodTask1?.priority}`;
    console.log(`❌ Check 11: ${msg}`);
    failures.push(msg);
  }

  // Check 12: Time logs preserved
  if (prodTask1?.timeLogs?.length === 1 && prodTask1?.totalLoggedHours === 4) {
    console.log(`✅ Check 12: Time logs preserved`);
    passedChecks++;
  } else {
    const msg = `Expected 1 time log with 4 hours, got ${prodTask1?.timeLogs?.length} logs, ${prodTask1?.totalLoggedHours} hours`;
    console.log(`❌ Check 12: ${msg}`);
    failures.push(msg);
  }

  // Check 13: Planning dates preserved
  if (planningTask1?.startDate === '2026-01-15' && planningTask1?.endDate === '2026-01-20') {
    console.log(`✅ Check 13: Planning dates preserved`);
    passedChecks++;
  } else {
    const msg = `Expected dates 2026-01-15 to 2026-01-20, got ${planningTask1?.startDate} to ${planningTask1?.endDate}`;
    console.log(`❌ Check 13: ${msg}`);
    failures.push(msg);
  }

  // Check 14: stageId preserved
  if (prodTask1?.stageId === 'stage-001') {
    console.log(`✅ Check 14: stageId preserved`);
    passedChecks++;
  } else {
    const msg = `Expected stageId 'stage-001', got ${prodTask1?.stageId}`;
    console.log(`❌ Check 14: ${msg}`);
    failures.push(msg);
  }

  // Check 15: projectId set correctly
  const allHaveProjectId = workItems.every(w => w.projectId === 'test-project-001');
  if (allHaveProjectId) {
    console.log(`✅ Check 15: All items have correct projectId`);
    passedChecks++;
  } else {
    const msg = 'Some items have incorrect projectId';
    console.log(`❌ Check 15: ${msg}`);
    failures.push(msg);
  }

  // ============================================
  // CLEANUP
  // ============================================

  // Remove test project from storage
  await adapter.delete('projects', legacyProject.id!);
  console.log('\n🧹 Cleaned up test project from storage');

  // ============================================
  // SUMMARY
  // ============================================

  const passed = failures.length === 0;

  console.log('\n========================================');
  if (passed) {
    console.log(`✅ ALL TESTS PASSED (${passedChecks}/${totalChecks})`);
  } else {
    console.log(`❌ TESTS FAILED (${passedChecks}/${totalChecks})`);
    console.log('\nFailures:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  }
  console.log('========================================\n');

  return {
    passed,
    totalChecks,
    passedChecks,
    failures,
    migratedWorkItems: workItems,
  };
}

// ============================================
// CLI RUNNER
// ============================================

// If running directly (not imported)
if (typeof window === 'undefined' && require.main === module) {
  runMigrationTest()
    .then((result) => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Migration test failed with error:', err);
      process.exit(1);
    });
}

export default runMigrationTest;

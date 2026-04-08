# Task Model Consolidation Plan

**Created:** 2026-01-11
**Status:** COMPLETED
**Completed:** 2026-01-11

---

## Current State Analysis

### ProjectTask (task.ts) - Production Tasks
Location: `project.tasks: ProjectTask[]`

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| projectId | string | Parent project |
| taskNumber | number | Sequential number |
| stageId? | string | Link to production stage |
| articleVersionId? | string | Link to pinned article |
| planningTaskId? | string | Reference to planning task (no sync) |
| sourceProcedureId? | string | Template provenance |
| title | string | Task title |
| description? | string | Description |
| category | TaskCategory | HULL, PROPULSION, etc. |
| priority | TaskPriority | LOW, MEDIUM, HIGH, URGENT |
| status | TaskStatus | TODO, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED |
| assignedTo? | string | Single assignee (name/ID) |
| estimatedHours? | number | Estimated hours |
| dueDate? | string | Due date (ISO) |
| startedAt? | string | When started |
| completedAt? | string | When completed |
| dependsOn? | string[] | Task IDs |
| blockedBy? | string[] | Task IDs |
| timeLogs | TaskTimeLog[] | Time entries |
| totalLoggedHours | number | Sum of logged hours |
| notes? | string | Notes |
| createdBy | string | Creator |

### PlanningTask (project.ts) - Planning/Scheduling Tasks
Location: `project.planning.tasks: PlanningTask[]`

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| title | string | Task title |
| startDate? | string | Start date (ISO) |
| endDate? | string | End date (ISO) |
| durationDays? | number | Duration in days |
| status? | PlanningTaskStatus | TODO, IN_PROGRESS, DONE |
| assigneeResourceIds? | string[] | Resource IDs |
| dependsOnTaskIds? | string[] | Task IDs |
| notes? | string | Notes |

---

## Unified Task Model

### New `WorkItem` Interface

All tasks become `WorkItem` stored in `project.workItems: WorkItem[]`.

```typescript
export type WorkItemKind = 'planning' | 'production';

export type WorkItemStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export interface WorkItem extends Entity {
  projectId: string;
  workItemNumber: number;

  // Discriminator
  kind: WorkItemKind;

  // Core fields (all tasks)
  title: string;
  description?: string;
  status: WorkItemStatus;
  notes?: string;

  // Scheduling (from PlanningTask)
  startDate?: string;        // ISO yyyy-mm-dd
  endDate?: string;          // ISO yyyy-mm-dd
  durationDays?: number;

  // Production (from ProjectTask)
  category?: TaskCategory;
  priority?: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
  startedAt?: string;
  completedAt?: string;

  // Assignment (unified)
  assigneeIds?: string[];     // Resource IDs (replaces both assignedTo and assigneeResourceIds)
  assignedAt?: string;

  // Dependencies (unified)
  dependsOnIds?: string[];    // Replaces dependsOn, dependsOnTaskIds
  blockedByIds?: string[];    // Kept from ProjectTask

  // Time tracking (from ProjectTask)
  timeLogs?: TaskTimeLog[];
  totalLoggedHours?: number;

  // Production stage link
  stageId?: string;

  // Article link
  articleVersionId?: string;

  // Template provenance
  sourceProcedureId?: string;
  sourceProcedureVersionId?: string;
  sourceTaskSetTemplateId?: string;
  copiedFromTemplateAt?: string;

  createdBy: string;
}
```

---

## Field Mapping

### PlanningTask → WorkItem

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| id | id | Direct |
| title | title | Direct |
| startDate | startDate | Direct |
| endDate | endDate | Direct |
| durationDays | durationDays | Direct |
| status (TODO/IN_PROGRESS/DONE) | status | DONE → COMPLETED |
| assigneeResourceIds | assigneeIds | Direct |
| dependsOnTaskIds | dependsOnIds | Direct |
| notes | notes | Direct |
| - | kind | Set to 'planning' |
| - | workItemNumber | Assigned on migration |
| - | projectId | From project context |
| - | createdBy | Default 'migration' |

### ProjectTask → WorkItem

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| id | id | Direct |
| projectId | projectId | Direct |
| taskNumber | workItemNumber | Direct |
| stageId | stageId | Direct |
| articleVersionId | articleVersionId | Direct |
| planningTaskId | - | DEPRECATED (merged) |
| sourceProcedureId | sourceProcedureId | Direct |
| sourceProcedureVersionId | sourceProcedureVersionId | Direct |
| sourceTaskSetTemplateId | sourceTaskSetTemplateId | Direct |
| copiedFromTemplateAt | copiedFromTemplateAt | Direct |
| title | title | Direct |
| description | description | Direct |
| category | category | Direct |
| priority | priority | Direct |
| status | status | Direct |
| assignedTo | assigneeIds | Wrap in array: [assignedTo] |
| assignedAt | assignedAt | Direct |
| estimatedHours | estimatedHours | Direct |
| dueDate | dueDate | Direct |
| startedAt | startedAt | Direct |
| completedAt | completedAt | Direct |
| dependsOn | dependsOnIds | Direct |
| blockedBy | blockedByIds | Direct |
| timeLogs | timeLogs | Direct |
| totalLoggedHours | totalLoggedHours | Direct |
| notes | notes | Direct |
| createdBy | createdBy | Direct |
| - | kind | Set to 'production' |

---

## Deprecated Fields/Types

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| PlanningTask | WorkItem (kind: 'planning') | Type alias provided for transition |
| ProjectTask | WorkItem (kind: 'production') | Type alias provided for transition |
| PlanningTaskStatus | WorkItemStatus | DONE → COMPLETED |
| project.planning.tasks | project.workItems | Auto-migrated on load |
| project.tasks | project.workItems | Auto-migrated on load |
| planningTaskId | - | No longer needed (merged) |
| assignedTo | assigneeIds[0] | Single → array |
| assigneeResourceIds | assigneeIds | Renamed |
| dependsOn | dependsOnIds | Renamed |
| dependsOnTaskIds | dependsOnIds | Renamed |

---

## Migration Strategy

1. **On project load**: Check for legacy data and migrate in-memory
2. **On project save**: Store only new `workItems` format
3. **Type aliases**: Provide `PlanningTask` and `ProjectTask` as type aliases for gradual migration
4. **Service layer**: Update TaskService to work with WorkItem
5. **UI components**: Update gradually using type aliases

### Migration Function

```typescript
function migrateProjectToUnifiedTasks(project: Project): Project {
  const workItems: WorkItem[] = [];
  let nextNumber = 1;

  // Migrate planning tasks first
  for (const pt of project.planning?.tasks || []) {
    workItems.push({
      id: pt.id,
      projectId: project.id,
      workItemNumber: nextNumber++,
      kind: 'planning',
      title: pt.title,
      startDate: pt.startDate,
      endDate: pt.endDate,
      durationDays: pt.durationDays,
      status: pt.status === 'DONE' ? 'COMPLETED' : (pt.status || 'TODO'),
      assigneeIds: pt.assigneeResourceIds || [],
      dependsOnIds: pt.dependsOnTaskIds || [],
      notes: pt.notes,
      createdAt: now(),
      updatedAt: now(),
      version: 0,
      createdBy: 'migration',
    });
  }

  // Migrate production tasks
  for (const pt of project.tasks || []) {
    workItems.push({
      id: pt.id,
      projectId: project.id,
      workItemNumber: nextNumber++,
      kind: 'production',
      title: pt.title,
      description: pt.description,
      status: pt.status,
      category: pt.category,
      priority: pt.priority,
      dueDate: pt.dueDate,
      estimatedHours: pt.estimatedHours,
      startedAt: pt.startedAt,
      completedAt: pt.completedAt,
      assigneeIds: pt.assignedTo ? [pt.assignedTo] : [],
      assignedAt: pt.assignedAt,
      dependsOnIds: pt.dependsOn || [],
      blockedByIds: pt.blockedBy || [],
      timeLogs: pt.timeLogs || [],
      totalLoggedHours: pt.totalLoggedHours || 0,
      stageId: pt.stageId,
      articleVersionId: pt.articleVersionId,
      sourceProcedureId: pt.sourceProcedureId,
      sourceProcedureVersionId: pt.sourceProcedureVersionId,
      sourceTaskSetTemplateId: pt.sourceTaskSetTemplateId,
      copiedFromTemplateAt: pt.copiedFromTemplateAt,
      notes: pt.notes,
      createdAt: pt.createdAt,
      updatedAt: pt.updatedAt,
      version: pt.version,
      createdBy: pt.createdBy,
    });
  }

  return {
    ...project,
    workItems,
    // Clear legacy arrays
    tasks: undefined as any,
    planning: project.planning ? { ...project.planning, tasks: undefined } : undefined,
  };
}
```

---

## Implementation Steps

1. ✅ Create `WorkItem` type in `task.ts`
2. ✅ Add type aliases for backward compatibility
3. ✅ Add `workItems` field to Project interface
4. ✅ Create migration function in `ProjectRepository`
5. ✅ Update `TaskService` to use WorkItem
6. ✅ Update `PlanningTaskDialog` to use WorkItem
7. ✅ Update `PlanningTab` to use WorkItem
8. ✅ Update `ProductionTab` to use WorkItem
9. ✅ Update Dashboard widget to use WorkItem
10. ✅ Update ResourcePlannerScreen to use WorkItem
11. ✅ Update ProjectPlannerScreen to use WorkItem
12. ✅ Update ShopfloorBoardScreen to use WorkItem
13. ✅ Run linter and fix issues
14. ✅ Create version

---

## Backward Compatibility

- `PlanningTask` type alias → `WorkItem & { kind: 'planning' }`
- `ProjectTask` type alias → `WorkItem & { kind: 'production' }`
- Legacy `project.tasks` and `project.planning.tasks` migrated on load
- All exported types still available for gradual migration

# NAVISOL v4 - TODO List

## Phase 5: Cohesion & Light AI Assistance (Current)

The goal is NOT to add more rules or flows.
The goal is to make the existing system feel LOGICAL and CONNECTED.

### Completed
- [x] Project Context Summary - show what's happening in a project at a glance [v231]
- [x] Planning ↔ Production links - make the connection visible and navigable [v231]
- [x] Staff visibility - show who's assigned where across tabs [v231]
- [x] Light AI suggestions - suggest next actions (text only, no logic engine) [v231]
- [x] Quick Actions extended with Planning & Production buttons for all project types [v231]
- [x] "Next up" hint with status-aware guidance text [v231]
- [x] Global Staff list with simple CRUD screen [v233]
- [x] StaffSelect component for optional staff selection in Planning/Production [v233]
- [x] Enhanced Staff Involvement section in ProjectContextPanel [v233]
- [x] Unassigned tasks alert in project overview [v233]
- [x] Integrate StaffSelect into TaskDialog for production task assignment [v233]
- [x] Integrate StaffSelect into PlanningTab for resource assignment [v234]
  - "Add from Staff" button in Resources section (copies staff as resource, no sync)
  - Quick-add staff picker in Task dialog (auto-creates resource + assigns)
  - Backward compatible: existing resource-based assignments unchanged

### In Progress
- [ ] Prefill fields - use context to suggest values when creating items

### Principles
- Visibility > Automation
- Links > Copies
- Suggestions > Enforcement
- Editable > Auto-filled

### Stop Conditions
- NO new mandatory steps
- NO blocking rules
- NO compliance-first UX
- NO hidden functionality
- NO enterprise-ERP complexity

## Phase 4: Navigation, Visibility, Previews, Manual Edits (COMPLETED)

### Completed
- [x] Project-first sidebar navigation (Projects, Portfolio, Library, System sections) [v226]
- [x] Recent Projects shortcut list (localStorage-based, last 5 projects) [v226]
- [x] Shopfloor Board: filters (assignee, project) and undo functionality [v224-225]
- [x] BOM tab: show ONLY the latest BOM snapshot (older snapshots hidden, data unchanged) [v228]
- [x] Planning ↔ Production: explicit task link via optional planningTaskId (reference field added to ProjectTask model) [v229]
- [x] Replace period toggles with reusable DateRangePicker (ShopfloorBoardScreen) [v229]
- [x] Replace period toggles with reusable DateRangePicker (TimesheetsScreen) [v230]
- [x] Project Overview: ProjectContextPanel integration with summary, relationships, suggestions [v231]

## Global Staff List (COMPLETED) [v233-234]

### Completed
- [x] Staff domain model (id, name, optional label, isActive)
- [x] StaffRepository with CRUD operations
- [x] StaffScreen for simple staff management
- [x] Navigation: Staff link in System section
- [x] StaffSelect reusable component (combobox with free-text fallback)
- [x] Enhanced Staff Involvement section in ProjectContextPanel
- [x] Unassigned tasks visibility in project overview
- [x] TaskDialog (Production): StaffSelect for optional assignee selection
- [x] PlanningTab: "Add from Staff" button to copy staff as resources
- [x] PlanningTab Task Dialog: Quick-add staff picker with auto-assign

### Hard Limits Respected
- NO roles, NO permissions, NO access control
- NO scheduling, NO capacity logic
- NO required fields
- NO changes to existing workflows
- Existing free-text assignees continue to work unchanged
- No data migrations - resources remain separate from global staff

## Out of Scope
- Phase 6: approvals, PDF/export, audit
- Route renaming or removal
- Refactoring unrelated code

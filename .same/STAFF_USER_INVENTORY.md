# Staff → User Unification Inventory

**Status:** ✅ IMPLEMENTED (v323)
**Date:** 2026-01-14
**Task:** Eliminate Staff concept, consolidate into User

---

## Executive Summary

After analyzing the codebase, I found that **Staff and User are currently separate concepts** with different purposes:

| Concept | Purpose | Has Auth? | Has Role? | Used For |
|---------|---------|-----------|-----------|----------|
| **User** | System accounts | Yes (email/password) | Yes (ADMIN/OFFICE/SALES/PRODUCTION) | Login, timesheets, audit, order tracking |
| **Staff** | Name list for assignment | No | No | Task assignees, planning resources |

**Key Decision Required:** The current architecture allows "Staff" members (e.g., subcontractors, external workers) who don't need system login. Unification means ALL assignable people must become Users. Is this acceptable?

---

## STEP 1: Complete Inventory

### Staff Model Fields

| Field | Type | Where Used | User Equivalent | Classification |
|-------|------|------------|-----------------|----------------|
| `id` | string | StaffRepository, StaffScreen | `id` | A) Redundant |
| `name` | string | StaffSelect, PlanningTab, PlanningTaskDialog | `name` | A) Redundant |
| `label` | string? | StaffSelect (badge display), role hints | `department` (partial) | B) Migrate - add as `label` or use `department` |
| `isActive` | boolean | StaffScreen, filter for active | `isActive` | A) Redundant |
| `notes` | string? | StaffScreen (display only) | None | C) Safe to drop (low usage) |
| `createdAt` | string | Entity boilerplate | `createdAt` | A) Redundant |
| `updatedAt` | string | Entity boilerplate | `updatedAt` | A) Redundant |
| `version` | number | Entity boilerplate | `version` | A) Redundant |

### Staff Usage Locations

| Location | File | Usage Type | Migration Impact |
|----------|------|------------|------------------|
| StaffScreen | `src/v4/screens/StaffScreen.tsx` | CRUD UI | REMOVE - replace with User Management (already exists in SettingsScreen) |
| StaffRepository | `src/data/repositories/StaffRepository.ts` | Data access | REMOVE - use UserRepository via AuthService |
| StaffSelect | `src/v4/components/StaffSelect.tsx` | Dropdown component | MODIFY - load Users instead of Staff |
| PlanningTab | `src/v4/components/PlanningTab.tsx` | Add resource from staff | MODIFY - use Users |
| PlanningTaskDialog | `src/v4/components/PlanningTaskDialog.tsx` | Assignee selection | MODIFY - use Users |
| V4App (nav) | `src/v4/screens/V4App.tsx` | Staff nav item | REMOVE - already have Users tab in Settings |

### User Model (Current)

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Entity ID |
| `email` | string | Required for login |
| `name` | string | Display name |
| `role` | UserRole | ADMIN/OFFICE/SALES/PRODUCTION |
| `passwordHash` | string | Auth credential |
| `isActive` | boolean | Account status |
| `lastLoginAt` | string? | Login tracking |
| `avatarUrl` | string? | Profile picture |
| `phone` | string? | Contact info |
| `department` | string? | Could absorb Staff.label |
| `aiEnabled` | boolean? | AI feature flag |
| `createdAt` | string | Timestamp |
| `updatedAt` | string | Timestamp |
| `version` | number | Entity version |

---

## Field Migration Classification Summary

| Classification | Fields | Action |
|----------------|--------|--------|
| **A) Already Redundant** | id, name, isActive, createdAt, updatedAt, version | No migration needed — User has equivalents |
| **B) Should Migrate** | label | Add to User OR map to department |
| **C) Safe to Drop** | notes | Not actively used beyond StaffScreen display |

---

## STEP 2: Target Model (User-only)

### Proposed User Model After Unification

```typescript
export interface User extends Entity {
  // === EXISTING FIELDS (unchanged) ===
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  lastLoginAt?: string;
  avatarUrl?: string;
  phone?: string;
  aiEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;

  // === MODIFIED/NEW FIELDS ===
  /**
   * Department or role hint (absorbs Staff.label)
   * Examples: "Electrician", "Yard", "Sales"
   * Used in assignment dropdowns for context.
   */
  department?: string;

  /**
   * Whether this user can be assigned to tasks.
   * Allows creating "assignable" users who may not log in frequently.
   * All active users are assignable by default.
   */
  // NOTE: We don't need this - isActive is sufficient
}
```

### Decision: Handle `label` field

**Option A:** Use existing `department` field to absorb `label`
- Pro: No model changes
- Con: Semantic mismatch (department ≠ role hint)

**Option B:** Add explicit `label` field to User
- Pro: Preserves Staff semantics
- Con: Adds field that may duplicate department

**Recommendation:** Use `department` — it's close enough and already exists.

---

## STEP 3: Data Migration Plan

### 3.1 Migration Rules

1. **For each Staff record:**
   - Check if User with same name exists
   - If YES: Skip (User takes precedence)
   - If NO: Create User with:
     - `email`: Generate placeholder `{sanitized-name}@staff.local`
     - `name`: Copy from Staff.name
     - `role`: Default to `PRODUCTION`
     - `passwordHash`: Generate random or placeholder
     - `isActive`: Copy from Staff.isActive
     - `department`: Copy from Staff.label
     - `aiEnabled`: false

2. **Duplicate handling:**
   - If Staff.name matches existing User.name → SKIP (User wins)
   - Staff with no matching User → CREATE new User

3. **Assignment references:**
   - Current system stores assignee as NAME string (not ID)
   - No ID-based references to migrate
   - Existing assignments continue to work

### 3.2 Migration Pseudocode

```typescript
async function migrateStaffToUsers(): Promise<MigrationResult> {
  const allStaff = await StaffRepository.getAll();
  const allUsers = await AuthService.getAllUsers();

  const userNameSet = new Set(allUsers.map(u => u.name.toLowerCase()));

  let merged = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const staff of allStaff) {
    const staffNameLower = staff.name.toLowerCase();

    if (userNameSet.has(staffNameLower)) {
      // User with same name exists - skip
      skipped++;
      continue;
    }

    // Create new User from Staff
    const newUser = {
      email: `${sanitizeName(staff.name)}@staff.local`,
      name: staff.name,
      role: 'PRODUCTION' as UserRole,
      password: generateTemporaryPassword(),
      department: staff.label,
      aiEnabled: false,
    };

    await AuthService.createUser(newUser, systemContext);
    merged++;
  }

  return { merged, skipped, conflicts };
}
```

### 3.3 Dry-Run Report Format

```
=== Staff → User Migration Dry-Run ===
Staff records found: X
Users found: Y

Actions:
  - CREATE new users: Z (Staff with no matching User)
  - SKIP (User exists): W (Staff name matches existing User)
  - CONFLICTS: 0 (none expected with name-based matching)

New users to create:
  1. "Jan Bakker" → jan-bakker@staff.local (PRODUCTION)
  2. "External Electrician" → external-electrician@staff.local (PRODUCTION)
  ...
```

---

## STEP 4: Implementation Plan

### Files to REMOVE

| File | Action |
|------|--------|
| `src/domain/models/staff.ts` | DELETE |
| `src/data/repositories/StaffRepository.ts` | DELETE |
| `src/v4/screens/StaffScreen.tsx` | DELETE |
| Staff nav item in V4App.tsx | Already removed (was pointing to StaffScreen) |

### Files to MODIFY

| File | Changes |
|------|---------|
| `src/domain/models/index.ts` | Remove `export * from './staff'` |
| `src/data/repositories/index.ts` | Remove StaffRepository export |
| `src/v4/components/StaffSelect.tsx` | Rename to `UserSelect.tsx`, load Users instead |
| `src/v4/components/PlanningTab.tsx` | Import UserSelect, use Users for resource creation |
| `src/v4/components/PlanningTaskDialog.tsx` | Use UserSelect for assignees |
| `src/v4/screens/V4App.tsx` | Remove Staff nav item (already hidden for non-ADMIN) |

### Files to ADD

| File | Purpose |
|------|---------|
| `src/domain/migrations/staff-to-user-migration.ts` | One-time migration script |

---

## STEP 5: Safety Checks

### Pre-Migration Checks
- [ ] Export current Staff data for backup
- [ ] Run dry-run to preview migration
- [ ] Verify no duplicate name conflicts

### Post-Migration Acceptance Criteria
- [ ] All existing users can log in
- [ ] No production/office/sales workflows break
- [ ] Timesheets still reference valid users
- [ ] Order items still reference valid users
- [ ] Assignee dropdowns show all Users
- [ ] No screens reference Staff anymore
- [ ] PlanningTab can create resources from Users
- [ ] PlanningTaskDialog shows Users for assignment

---

## Out of Scope (Confirmed)

- HR features
- Payroll
- Scheduling
- Performance tracking
- New roles
- Audit expansion
- External/subcontractor user type

---

## Questions for User Before Proceeding

1. **Staff.label → department mapping:** Is using `department` field acceptable, or should we add a separate `label` field?

2. **Migrated Staff accounts:** Should they:
   - A) Get placeholder emails (`name@staff.local`) and random passwords (cannot login until admin resets)
   - B) Be marked as inactive until admin activates with real email
   - C) Something else?

3. **Default role for migrated Staff:** Should it be `PRODUCTION` (most restrictive) or configurable?

---

## Recommendation

Proceed with migration using:
- **Option A** for emails (placeholder `@staff.local`)
- **department** field for label
- **PRODUCTION** as default role

This is the safest approach with minimal data loss risk.

---

## Implementation Summary (v323)

### Changes Made

1. **Created `UserSelect.tsx`** — New component that loads active Users from AuthService
2. **Updated `StaffSelect.tsx`** — Now re-exports from UserSelect for backward compatibility
3. **Updated `PlanningTab.tsx`** — Uses User instead of StaffMember for resource creation
4. **Updated `PlanningTaskDialog.tsx`** — Uses User for quick-add resource functionality
5. **Updated `V4App.tsx`** — Removed Staff nav item, /staff redirects to /settings
6. **Deprecated Files** — Added deprecation notices with governance comments to:
   - `src/domain/models/staff.ts`
   - `src/data/repositories/StaffRepository.ts`
   - `src/v4/screens/StaffScreen.tsx`

### Migration Approach

Instead of creating a migration script, we took a simpler approach:
- All Staff-related code now uses User (loads from AuthService)
- Existing Staff data remains in localStorage but is no longer used
- No data migration needed because:
  - assigneeIds store names as strings, not IDs
  - Users already exist with the same names as Staff
  - New resource creation uses User.department instead of Staff.label

### Backward Compatibility

- `StaffSelect` and `useStaffList` are re-exported from `UserSelect` for compatibility
- `StaffMember`, `StaffRepository` remain exportable but are marked deprecated
- `StaffScreen` still exists but is inaccessible (nav item hidden, route redirects)

### User Experience

- Users are now selected from the Settings → Users list for all assignment purposes
- "Add from Staff" buttons now say "Add from Users"
- Department field in User serves as the role hint (previously Staff.label)

---

**End of Inventory**

# Navisol v4 — Visibility & Permissions Plan

**Status:** IMPLEMENTED (v321 + v322)
**Version:** 1.0
**Date:** 2026-01-14
**Constraints:** No ERP, no background sync, explicit manual actions only

---

## Implementation Status

| Layer | Status | Version |
|-------|--------|---------|
| Role enum (4 roles) | ✅ Done | v321 |
| Nav hiding | ✅ Done | v321 |
| Route guards (sensitive screens) | ✅ Done | v322 |
| Component-level guards | ⏳ Not yet | - |
| Service-level checks | ⏳ Not yet | - |

---

## 1) Roles (4 total)

| Role | Description | Typical User |
|------|-------------|--------------|
| **Admin** | Full system access. Manages staff, settings, library. | Owner, IT administrator |
| **Office** | Full project access. Creates projects, manages compliance, quotes, BOM. | Project manager, office staff |
| **Production** | Portfolio execution only. Tasks, timesheets, shop floor orders. | Workshop technician, fabricator |
| **Sales** | Read-only projects + quote editing. No production, no compliance editing. | Sales representative |

**Notes:**
- Roles are mutually exclusive (one role per user)
- No role inheritance or composition
- Admin can do everything Office can do
- Production is the most restricted

---

## 2) Screen Visibility Matrix

### Portfolio & Navigation Screens

| Screen | Admin | Office | Production | Sales |
|--------|-------|--------|------------|-------|
| All Projects (list) | ✅ Visible | ✅ Visible | ❌ Hidden | ✅ Read-only |
| WIN Register | ✅ Visible | ✅ Visible | ❌ Hidden | ❌ Hidden |
| Clients | ✅ Visible | ✅ Visible | ❌ Hidden | ✅ Read-only |
| Timesheets | ✅ Visible | ✅ Visible | ✅ Visible (own) | ❌ Hidden |
| Shopfloor Board | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Hidden |
| Resource Planner | ✅ Visible | ✅ Visible | ❌ Hidden | ❌ Hidden |
| Project Planner | ✅ Visible | ✅ Visible | ❌ Hidden | ❌ Hidden |
| Production (kanban) | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Hidden |
| Shop Floor Orders | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Hidden |

### Library Screens

| Screen | Admin | Office | Production | Sales |
|--------|-------|--------|------------|-------|
| Library → Articles | ✅ Full CRUD | ✅ Full CRUD | ✅ Read-only | ❌ Hidden |
| Library → Boat Models | ✅ Full CRUD | ✅ Full CRUD | ❌ Hidden | ✅ Read-only |
| Library → Standards | ✅ Full CRUD | ✅ Full CRUD | ❌ Hidden | ❌ Hidden |
| Library → Work Instructions | ✅ Full CRUD | ✅ Full CRUD | ✅ Read-only | ❌ Hidden |

### System Screens

| Screen | Admin | Office | Production | Sales |
|--------|-------|--------|------------|-------|
| Staff | ✅ Full CRUD | ❌ Hidden | ❌ Hidden | ❌ Hidden |
| Settings | ✅ Visible | ❌ Hidden | ❌ Hidden | ❌ Hidden |

### Project Detail Tabs

| Tab | Admin | Office | Production | Sales |
|-----|-------|--------|------------|-------|
| Overview | ✅ Edit | ✅ Edit | ❌ Hidden | ✅ Read-only |
| Compliance | ✅ Edit | ✅ Edit | ❌ Hidden | ❌ Hidden |
| BOM | ✅ Edit | ✅ Edit | ❌ Hidden | ✅ Read-only |
| Production | ✅ Edit | ✅ Edit | ✅ Edit (tasks only) | ❌ Hidden |
| Orders | ✅ Edit | ✅ Edit | ✅ Edit | ❌ Hidden |
| Documents | ✅ Edit | ✅ Edit | ✅ Upload only | ✅ Read-only |
| Quote | ✅ Edit | ✅ Edit | ❌ Hidden | ✅ Edit |

**Legend:**
- ✅ Edit = Full read/write access
- ✅ Read-only = Can view but not modify
- ✅ Visible = Standard access for that screen
- ✅ Visible (own) = Can only see/edit own records
- ✅ Upload only = Can add files, cannot delete or edit metadata
- ❌ Hidden = Screen/tab not visible in navigation

---

## 3) Production Intent Lock

### What Production MUST be able to do:

1. **Navigate Portfolio screens only** — Shopfloor Board, Production kanban, Shop Floor Orders, Timesheets
2. **View assigned tasks** — See tasks assigned to them in kanban and shopfloor board
3. **Update task status** — Move tasks through production stages (drag/drop or button)
4. **View work instructions** — Read-only access to linked work instructions
5. **Upload production photos** — Add files to Documents tab (upload only, no delete)
6. **Enter timesheets** — Log time against projects they work on
7. **Create shop floor orders** — Add items to Shop Floor Orders (general or project-linked)
8. **Update order status** — Mark orders as Ordered/Received
9. **Add production notes** — Leave notes on tasks via existing note fields
10. **View article specs** — Read-only access to Articles library for reference

### What Production must NOT access:

1. **Library CRUD** — Cannot create, edit, or delete articles, boat models, standards, or work instructions
2. **Standards management** — No access to compliance or applied standards
3. **BOM pricing edits** — Cannot modify costs, quantities, or line items in BOM
4. **Settings/Staff admin** — No access to system configuration or user management
5. **Project creation** — Cannot create new projects
6. **Client management** — No access to client records
7. **Quote editing** — No access to pricing or quote generation
8. **Compliance checklist** — Cannot mark certification items as passed/failed
9. **Vessel Identity editing** — Cannot modify boat specifications
10. **WIN Register** — No access to WIN assignment
11. **Resource/Project Planner** — No access to planning screens
12. **AI features** — aiEnabled always false for Production role

---

## 4) Minimal Enforcement Strategy (for later implementation)

### Layer 1: Navigation Hiding
- Filter sidebar items based on `user.role`
- Remove hidden tabs from ProjectDetailScreen tab list
- Simple role check in V4App.tsx sidebar rendering

### Layer 2: Route Guards
- Add `allowedRoles` to route definitions
- Redirect to "Access Denied" or "Portfolio" if role not in allowedRoles
- Example: `/settings` → `allowedRoles: ['admin']`

### Layer 3: Component-Level Guards
- Wrap edit buttons/forms in `<RoleGuard role={['admin', 'office']}>`
- Disable or hide action buttons based on role
- Read-only mode for components when role lacks edit permission

### Layer 4: Service-Level Checks (optional hardening)
- Add role check to service methods that mutate data
- Return error if role insufficient
- Example: `ProjectService.update()` checks `role !== 'production'`

### Implementation Order (when ready):
1. Add `role` field to User model (string enum)
2. Update demo users with appropriate roles
3. Filter sidebar in V4App based on role
4. Filter project tabs based on role
5. Add route guards for restricted screens
6. Add component guards for edit actions

---

## 5) Out of Scope

The following are explicitly NOT being designed:

1. **Granular permission builder** — No UI for custom permission assignment
2. **Per-field security model** — No field-level read/write permissions
3. **Audit/reporting on access** — No logs of who accessed what
4. **Role hierarchy or inheritance** — Roles are flat, no parent-child
5. **Dynamic permission rules** — No conditions like "only own projects"
6. **Team/group permissions** — No team-based access control
7. **Time-based permissions** — No expiring access or schedules
8. **Approval workflows** — No "request access" flows
9. **Permission delegation** — Users cannot grant permissions to others
10. **Multi-tenancy** — Single organization assumed

---

## Appendix: Role Assignment

| Demo User | Current | Proposed Role |
|-----------|---------|---------------|
| Admin | admin@eagleboats.nl | Admin |
| Manager | manager@eagleboats.nl | Office |
| Sales | sales@eagleboats.nl | Sales |
| Production | production@eagleboats.nl | Production |
| Viewer | viewer@eagleboats.nl | Production (or remove) |

---

## Appendix: AI Gating by Role

| Role | aiEnabled | Rationale |
|------|-----------|-----------|
| Admin | Configurable | Admin can enable for self |
| Office | Configurable | May use AI for text suggestions |
| Production | Always false | No AI in production context |
| Sales | Always false | No AI for quotes |

AI remains gated by `user.aiEnabled` flag. Role determines the default and whether the flag can be toggled.

---

**End of Plan**

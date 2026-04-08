# TO-BE Feature Catalog Gap Analysis

**Generated:** 2026-01-11
**Purpose:** Compare current Navisol v4 implementation against the TO-BE Feature Catalog contract

---

## Invariants Compliance Check

| InvariantID | Title | Status | Notes |
|-------------|-------|--------|-------|
| INV-01 | No feature loss | ✅ COMPLIANT | No AS-IS functionality removed |
| INV-02 | No forced workflows | ✅ COMPLIANT | Status changes are soft (StatusMachine exists but doesn't block) |
| INV-03 | No notifications | ✅ COMPLIANT | No toast/email/push notifications implemented |
| INV-04 | Project is hub | ✅ COMPLIANT | All entities link to Project |
| INV-05 | Multi-unit option | ✅ COMPLIANT | `boats?: BoatInstance[]` in Project model |
| INV-06 | Library is immutable to projects | ✅ COMPLIANT | Version pinning via `libraryPins` |
| INV-07 | Everything versioned | ✅ COMPLIANT | Quotes, configs, templates have versions |
| INV-08 | Technical Dossier is compliance filebox | ✅ COMPLIANT | 10 fixed sections in `technical-file.ts` |
| INV-09 | Technical Dossier headings fixed | ✅ COMPLIANT | `TECHNICAL_FILE_SECTION_IDS` constant |
| INV-10 | Hybrid enforcement by module/role | ✅ COMPLIANT | Role-based permissions in `useAuth.tsx` |
| INV-11 | No alerts or notifications | ✅ COMPLIANT | Only dashboards/views, no alerts |

---

## Module-by-Module Feature Analysis

### AUTH - Authenticatie & gebruikers

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| AUTH-001 | Gebruikersbeheer (CRUD, roles, etc) | ✅ IMPLEMENTED | `LoginScreen.tsx`, `AuthService.ts` |
| AUTH-002 | Roles & permissions per module | ✅ IMPLEMENTED | `useAuth.tsx`, `Authorization.ts` |
| AUTH-003 | Multi-tenant / 1 systeem | ⚠️ PARTIAL | Single tenant, no multi-tenant |

### CRM - CRM (klanten & contacten)

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| CRM-001 | Contactpersonen per klant | ✅ IMPLEMENTED | `ClientListScreen.tsx`, `client.ts` |
| CRM-002 | Communicatie log | ❌ NOT IMPLEMENTED | Missing feature |

### PRJ - Projecten (portfolio & detail)

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| PRJ-001 | Project details view | ✅ IMPLEMENTED | `ProjectDetailScreen.tsx` |
| PRJ-002 | Project status wijzigen | ✅ IMPLEMENTED | Status widget in ProjectDetailScreen |
| PRJ-003 | Recent activity | ✅ IMPLEMENTED | Audit trail in project detail |
| PRJ-004 | Navigate naar project | ✅ IMPLEMENTED | Navigation from dashboard/list |
| PRJ-005 | Project archiveren + zoeken | ✅ IMPLEMENTED | Archive/search in ProjectListScreen |
| PRJ-006 | Archive, advanced filters, saved views | ⚠️ PARTIAL | Archive yes, saved views NO |

### CFG - Configuratie (product/boat config)

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| CFG-001 | Configuratie rules & validaties | ✅ IMPLEMENTED | `BusinessRules.ts`, `ConfigurationService.ts` |
| CFG-002 | Frontend configurator | ✅ IMPLEMENTED | `AddConfigurationItemDialog.tsx` |
| CFG-009 | Equipment list (non-priced) | ✅ IMPLEMENTED | `EquipmentListService.ts`, `EquipmentListViewer.tsx` |

### QTE - Quotes & commerciële flow

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| QTE-015 | Quotes beheren | ✅ IMPLEMENTED | `QuoteService.ts`, `EditQuoteDialog.tsx` |
| QTE-016 | Quote review & statusflow | ✅ IMPLEMENTED | Multiple versions, sent/accepted/rejected |
| QTE-017 | Prijsregels & kortingen | ✅ IMPLEMENTED | Discount fields in quotes |
| QTE-018 | Quote naar order (lock) | ✅ IMPLEMENTED | Accept quote → baseline lock |

### BOM - BOM & materialen

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| BOM-016 | BOM view | ✅ IMPLEMENTED | BOM tab in ProjectDetailScreen |
| BOM-017 | Auto assemble BOM from config/library kits | ✅ IMPLEMENTED | `BOMService.ts` |
| BOM-018 | BOM baseline + approvals | ✅ IMPLEMENTED | BOM snapshots |
| BOM-019 | Supplier/part mapping | ⚠️ PARTIAL | Basic supplier field, no full mapping |

### PLN - Planning & scheduling

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| PLN-001 | Planning tasks aanmaken | ✅ IMPLEMENTED | `PlanningTab.tsx` |
| PLN-004 | Planning tasks bewerken | ✅ IMPLEMENTED | `PlanningTaskDialog.tsx` |
| PLN-005 | Planning task status wijzigen | ✅ IMPLEMENTED | Status field in dialog |
| PLN-006 | Planning resource beheren | ✅ IMPLEMENTED | Resources in PlanningTab |
| PLN-007 | Gantt/swimlane view | ❌ NOT IMPLEMENTED | No Gantt component |
| PLN-008 | Planning resourcevergave | ✅ IMPLEMENTED | `ResourcePlannerScreen.tsx` |
| PLN-009 | Planning Gantt view | ❌ NOT IMPLEMENTED | No Gantt chart |
| PLN-010 | Planning dependencies | ⚠️ PARTIAL | dependsOnTaskIds field exists, no visualization |
| PLN-011 | Planning dependencies | ⚠️ PARTIAL | As above |
| PLN-012 | Workitem edit dialog (unified) | ✅ IMPLEMENTED | `PlanningTaskDialog.tsx` - unified for all screens |
| PLN-013 | Milestones & baselines | ❌ NOT IMPLEMENTED | No milestone model |
| PLN-014 | Milestones, baseline dates, variance tracking | ❌ NOT IMPLEMENTED | Missing feature |
| PLN-015 | Dashboard overdue views | ✅ IMPLEMENTED | "This Week's Tasks" widget in DashboardScreen |

### RES - Resources (staff & capaciteit)

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| RES-001 | Resource kalender & afwezigheid | ❌ NOT IMPLEMENTED | No calendar/time-off |
| RES-002 | Skills tagging + suggest assignments | ❌ NOT IMPLEMENTED | No skills matching |
| RES-003 | Staff management | ✅ IMPLEMENTED | `StaffScreen.tsx`, `staff.ts` |

### PROD - Productie & shopfloor

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| PROD-012 | Production tasks list | ✅ IMPLEMENTED | `ProductionTab.tsx` |
| PROD-013 | Stages & gates | ✅ IMPLEMENTED | Production stages in project |
| PROD-014 | Work instructions all procedures | ✅ IMPLEMENTED | `ProductionProceduresTab.tsx` |
| PROD-015 | Attachments/photos per task | ⚠️ PARTIAL | Observations have attachments |
| PROD-016 | Shopfloor board | ✅ IMPLEMENTED | `ShopfloorBoardScreen.tsx` |

### QLT - Kwaliteit & issues (WIN/NCR)

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| QLT-001 | QA checklists & sign-off | ⚠️ PARTIAL | CE checklist in compliance, no general QA |
| QLT-002 | WIN/NCR linked to tasks | ✅ IMPLEMENTED | `WINRegisterService.ts` |

### DOC - Documenten & compliance

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| DOC-017 | CE/DoC checklist + outputs | ✅ IMPLEMENTED | `ComplianceTab.tsx` |
| DOC-018 | Documenten genereren | ✅ IMPLEMENTED | PDF generation in services |
| DOC-019 | Technical dossier builder | ✅ IMPLEMENTED | Technical File sections |
| DOC-020 | Document generation pipeline | ✅ IMPLEMENTED | `DocumentTemplatesSection.tsx` |
| DOC-021 | Declarations, standards applied, signatures | ⚠️ PARTIAL | Standards yes, signatures NO |

### RPT - Rapportage & dashboards

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| RPT-020 | Portfolio balance/board | ⚠️ PARTIAL | ProjectListScreen has filters, no board view |
| RPT-021 | Saved filters & views | ❌ NOT IMPLEMENTED | No saved views feature |
| RPT-022 | This week taken | ✅ IMPLEMENTED | Dashboard widget |
| RPT-023 | Reusable views for PM/production | ❌ NOT IMPLEMENTED | No reusable views |

### TMS - Timesheets & uren

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| TMS-001 | Timesheet approvals | ⚠️ PARTIAL | Entry exists, no approval workflow |
| TMS-002 | Cost rollups per project | ⚠️ PARTIAL | Basic rollup, no detailed breakdown |

### LIB - Library & templates

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| LIB-001 | Version pinning to project | ✅ IMPLEMENTED | `libraryPins` in Project |
| LIB-002 | Search across articles/kits/procedures | ✅ IMPLEMENTED | `LibraryScreen.tsx` |
| LIB-003 | Import/export library | ⚠️ PARTIAL | Export exists, import basic |

### SYS - Systeem & instellingen

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| SYS-001 | Persistence adapter DB backend | ⚠️ PARTIAL | LocalStorage only, adapter pattern ready |
| SYS-002 | Project JSON export/restore, backups | ✅ IMPLEMENTED | `ExportImportService.ts` |
| SYS-003 | Feature flags | ❌ NOT IMPLEMENTED | No feature flags |

### AUD - Audit & activity

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| AUD-001 | Activity feed per project | ✅ IMPLEMENTED | `AuditService.ts`, shown in dashboard |
| AUD-002 | Before/after comparison for key entities | ⚠️ PARTIAL | Logged but no diff viewer |

### INT - Integraties

| FeatureID | Feature | Status | Current Location |
|-----------|---------|--------|------------------|
| INT-001 | API / webhooks | ❌ NOT IMPLEMENTED | No API layer |
| INT-002 | Dashboard view sending for quotes/docs | ❌ NOT IMPLEMENTED | No external send |

---

## Summary: Key Gaps (P0/P1 Priority)

### ❌ NOT IMPLEMENTED (Require New Development)

| Priority | FeatureID | Feature | Effort |
|----------|-----------|---------|--------|
| P1 | PLN-007 | Gantt/swimlane view | Medium |
| P1 | PLN-009 | Planning Gantt view | Medium |
| P1 | PLN-013/014 | Milestones & baselines | Medium |
| P1 | RES-001 | Resource calendar & time-off | Medium |
| P1 | RES-002 | Skills tagging | Small |
| P1 | RPT-021 | Saved filters & views | Small |
| P2 | CRM-002 | Communication log | Small |
| P2 | SYS-003 | Feature flags | Small |
| P2 | INT-001/002 | API/webhooks | Large |

### ⚠️ PARTIAL (Need Enhancement)

| Priority | FeatureID | Feature | Gap |
|----------|-----------|---------|-----|
| P1 | PLN-010/011 | Planning dependencies | Visualization missing |
| P1 | DOC-021 | Signatures | Digital signature missing |
| P1 | TMS-001 | Timesheet approvals | Approval workflow missing |
| P2 | BOM-019 | Supplier mapping | Full mapping UI missing |
| P2 | LIB-003 | Import library | Bulk import missing |

### ✅ FULLY IMPLEMENTED

All P0 features are implemented:
- Unified PlanningTaskDialog (PLN-012)
- Dashboard planning widget (PLN-015)
- Technical Dossier 10 sections (DOC-019)
- Equipment List non-priced (CFG-009)
- Staff management (RES-003)
- Compliance/CE flow (DOC-017)

---

## Problems from Contract - Resolution Status

| Problem | Category | Status | Resolution |
|---------|----------|--------|------------|
| Planning Fragmentatie | Architecture | ✅ FIXED | Unified `PlanningTaskDialog.tsx` |
| Geen Planning in Dashboard | Missing Feature | ✅ FIXED | "This Week's Tasks" widget added |
| Read-only Planners | UX | ✅ FIXED | Inline editing in ResourcePlanner |
| PlanningTask vs ProjectTask | Architecture | ⚠️ PARTIAL | Both models exist, need consolidation |
| Staff vs Resources | Architecture | ⚠️ PARTIAL | Staff model + PlanningResource, auto-sync exists |
| Mega Components | Maintainability | ⚠️ ONGOING | Some large components remain |
| Templates/Procedures Dubbel | Architecture | ✅ FIXED | Consolidated in Settings/Library |
| Geen Overdue Alerts | Missing Feature | ✅ FIXED | Visual indicators in dashboard (no alerts per INV-11) |
| Geen Planning Indicators | UX | ⚠️ PARTIAL | Dashboard has tasks, project cards need badges |

---

## Recommended Implementation Order

### Phase 1 (Current Sprint) - P0 Fixes
1. ✅ Unified PlanningTaskDialog - DONE
2. ✅ Dashboard planning widget - DONE
3. ✅ Technical Dossier compliance - DONE
4. ✅ Equipment List - DONE

### Phase 2 (Next Sprint) - P1 Features
1. Planning indicators on project cards
2. Milestones model + basic UI
3. Resource calendar (time-off)
4. Saved views/filters

### Phase 3 (Future) - P2 Features
1. Gantt view component
2. Skills tagging
3. Communication log
4. API layer

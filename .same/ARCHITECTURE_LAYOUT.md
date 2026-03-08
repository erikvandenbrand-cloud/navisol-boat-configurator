# Navisol v4 - Complete Architecture Layout

## Overview

Navisol is a boat configuration and production management system built with:
- **Framework**: Next.js 16.1.1 with Turbopack
- **UI**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Storage**: LocalStorage (designed for future Neon PostgreSQL migration)
- **Version**: v300 (as of January 2026)

---

## 1. DIRECTORY STRUCTURE

```
navisol-boat-configurator/src/
├── domain/           # Business logic (pure TypeScript, no React)
│   ├── models/       # Domain entities (17 model files)
│   ├── schemas/      # Zod validation schemas
│   ├── services/     # Business services (22 service files)
│   ├── workflow/     # Status machine and transitions
│   ├── pricing/      # Pricing calculations
│   ├── rules/        # Business rules and compliance
│   ├── auth/         # Authorization (5 roles)
│   ├── audit/        # Audit logging
│   ├── invariants/   # Domain invariants
│   └── utils/        # Date utilities
│
├── data/             # Persistence layer
│   ├── persistence/  # Storage adapters
│   └── repositories/ # Repository pattern (10 repositories)
│
├── v4/               # UI layer (React)
│   ├── screens/      # Main screens (14 screens)
│   ├── components/   # Components (50+ components)
│   ├── state/        # React hooks for state management
│   ├── data/         # Sample data for development
│   └── utils/        # UI utilities
│
├── components/
│   └── ui/           # shadcn/ui components ONLY
│
└── lib/
    └── utils.ts      # shadcn utilities ONLY
```

---

## 2. DOMAIN MODELS

| Model File | Entity | Description | Key Fields |
|------------|--------|-------------|------------|
| `common.ts` | Entity, Archivable | Base types | id, createdAt, updatedAt, version |
| `client.ts` | Client | Customer data | clientNumber, name, type, status |
| `project.ts` | Project | Main hub entity | projectNumber, status, configuration, quotes, tasks |
| `task.ts` | WorkItem | Unified task model | kind (planning/production), status, assigneeIds |
| `production.ts` | ProductionStage | Production workflow | code, status, progressPercent |
| `compliance.ts` | ComplianceCertification | CE compliance | type, chapters, checklist |
| `technical-file.ts` | TechnicalFile | 10-section dossier | sections, subheadings, items |
| `document-template.ts` | ProjectDocumentTemplate | DoC, Owner's Manual | type, versions, blocks |
| `library-v4.ts` | Article, Kit | Equipment catalog | code, versions, pricing |
| `library.ts` | BoatModel, CatalogItem | Legacy catalog | (deprecated) |
| `production-procedure.ts` | ProductionProcedure | Production templates | steps, attachments |
| `timesheet.ts` | TimesheetEntry | Time tracking | date, hours, projectId |
| `staff.ts` | StaffMember | Staff registry | name, label, isActive |
| `equipment-list.ts` | EquipmentListDocument | Equipment exports | sections, brands |
| `work-instruction.ts` | WorkInstruction | Production instructions | stageCategory, content, status |
| `user.ts` | User | Authentication | email, role, permissions |
| `audit.ts` | AuditEntry | Change log | entityType, action, description |

---

## 3. DOMAIN SERVICES

| Service | Responsibility | Key Operations |
|---------|---------------|----------------|
| `ProjectService` | Project lifecycle | create, transitionStatus, archive |
| `ConfigurationService` | Equipment config | addItem, updateItem, removeItem |
| `QuoteService` | Quote management | createDraft, markSent, markAccepted |
| `AmendmentService` | Post-freeze changes | requestAmendment, applyAmendment |
| `BOMService` | Bill of Materials | generateBOM, exportToCSV |
| `TaskService` | Production tasks | createTask, updateStatus, logTime |
| `DocumentService` | Document generation | generateFromTemplate, finalizeDocument |
| `TemplateService` | Quote/doc templates | renderQuoteTemplate, placeholders |
| `PDFService` | PDF generation | openPDFWindow, printStyles |
| `ComplianceService` | CE certification | createCertification, updateChecklist |
| `ProductionService` | Stage management | initializeStages, updateProgress |
| `ProductionProcedureService` | Procedure templates | create, update, apply |
| `TimesheetService` | Time entries | create, getWeeklyView |
| `LibraryV4Service` | Articles/Kits | createArticle, createKit, approve |
| `BoatModelService` | Boat model catalog | create, updateDefaults |
| `EquipmentCatalogService` | Legacy catalog | (migration support) |
| `DeliveryPackService` | Delivery bundles | generateDeliveryPack |
| `EquipmentListService` | Equipment exports | generateEquipmentList |
| `WINRegisterService` | WIN registry | register, validate |
| `PlanningSummaryService` | Gantt summaries | generateSummaries, refresh |
| `WorkInstructionService` | Work instructions | create, publish, duplicate |
| `LegacyMigrationService` | Data migration | migrateFromV3 |
| `SettingsService` | App settings | getSettings, updateSettings |
| `AuthService` | Authentication | login, validateToken |

---

## 4. DATA REPOSITORIES

| Repository | Entity | Storage Key |
|------------|--------|-------------|
| `ClientRepository` | Client | navisol_clients |
| `ProjectRepository` | Project | navisol_projects |
| `AuditRepository` | AuditEntry | navisol_audit |
| `LibraryRepository` | BoatModel, CatalogItem | navisol_library |
| `LibraryV4Repository` | Category, Article, Kit | navisol_library_v4 |
| `ProductionProcedureRepository` | ProductionProcedure | navisol_procedures |
| `TimesheetRepository` | TimesheetEntry | navisol_timesheets |
| `StaffRepository` | StaffMember | navisol_staff |
| `WorkInstructionRepository` | WorkInstruction, Comment | navisol_work_instructions |

---

## 5. UI SCREENS

| Screen | Route/Tab | Description |
|--------|-----------|-------------|
| `V4App.tsx` | / | Main app shell with navigation |
| `LoginScreen.tsx` | /login | Authentication |
| `DashboardScreen.tsx` | /dashboard | Overview metrics |
| `ProjectListScreen.tsx` | /projects | Project listing |
| `ProjectDetailScreen.tsx` | /project/:id | Project tabs (10 tabs) |
| `ClientListScreen.tsx` | /clients | Client management |
| `LibraryScreen.tsx` | /library | Articles, Kits, Procedures, Work Instructions |
| `TimesheetsScreen.tsx` | /timesheets | Time entry (weekly/monthly) |
| `WINRegisterScreen.tsx` | /win-register | WIN number registry |
| `ResourcePlannerScreen.tsx` | /resources | Resource allocation |
| `ProjectPlannerScreen.tsx` | /planner | Multi-project Gantt |
| `ShopfloorBoardScreen.tsx` | /shopfloor | Daily task board |
| `StaffScreen.tsx` | /staff | Staff directory |
| `ProductionScreen.tsx` | /production | Portfolio Kanban |
| `SettingsScreen.tsx` | /settings | App configuration |

---

## 6. PROJECT DETAIL TABS

| Tab | Component | Features |
|-----|-----------|----------|
| Overview | (inline) | Project info, CE status, boat instances |
| Configuration | (inline) | Equipment items, pricing |
| Quotes | (inline) | Quote drafts, send, accept, PDF |
| BOM | (inline) | Bill of Materials snapshots |
| Amendments | (inline) | Post-freeze changes |
| Production | `ProductionTab` + Kanban toggle | Stages, List/Kanban view |
| Compliance | `ComplianceTab` | CE checklist, dossier, documents |
| Planning | `PlanningTab` | Gantt, resources, summaries |
| Documents | (inline) | Generated documents, delivery pack |
| History | (inline) | Audit trail |

---

## 7. LIBRARY TABS (LibraryScreen)

| Tab | Component | Content |
|-----|-----------|---------|
| Articles | (inline) | Equipment articles with versions |
| Kits | (inline) | Assembly kits with components |
| Procedures | `ProductionProceduresTab` | Production procedure templates |
| Work Instructions | `WorkInstructionsTab` | Stage-specific instructions |

---

## 8. KEY DOMAIN ENUMS

### Project Status Flow
```
DRAFT → QUOTED → OFFER_SENT → ORDER_CONFIRMED → IN_PRODUCTION → READY_FOR_DELIVERY → DELIVERED → CLOSED
```

### WorkItem Kind
- `planning` - Scheduling/Gantt (dates, dependencies, resources)
- `production` - Execution (stages, time logging, categories)

### WorkItem Status
```
TODO → IN_PROGRESS ⟷ ON_HOLD → COMPLETED (or CANCELLED)
```

### Production Stage Status
```
NOT_STARTED → IN_PROGRESS → COMPLETED (or BLOCKED)
```

### Production Stage Codes (9 stages)
```
PREP → HULL → PROPULSION → ELECTRICAL → INTERIOR → EXTERIOR → SYSTEMS → TESTING → FINAL
```

### Technical Dossier Sections (10 fixed)
1. general-description
2. design-drawings
3. calculations
4. materials
5. essential-requirements
6. stability-buoyancy
7. electrical-systems
8. fuel-systems
9. steering-systems
10. conformity-assessment

---

## 9. ARCHITECTURE PRINCIPLES

1. **Project is the Hub**: Everything relates to a Project
2. **Library/Project Separation**: Templates in Library, instances in Project
3. **Single Write Path**: All mutations through Services
4. **Version Pinning**: Projects pin specific library versions at ORDER_CONFIRMED
5. **Immutability After Freeze**: Quotes and configs freeze at milestones
6. **Audit Everything**: All significant actions logged
7. **Persistence Adapter**: Swap LocalStorage for Neon without code changes
8. **Explicit User Actions**: No background sync or auto-save
9. **Calm UI**: Clear states, no overwhelming notifications

---

## 10. COMPONENT HIERARCHY

### Core Components

| Component | Type | Description |
|-----------|------|-------------|
| `TaskDialog` | Dialog | Create/edit production tasks |
| `PlanningTaskDialog` | Dialog | Create/edit planning items |
| `ArticleDialog` | Dialog | Create/edit articles |
| `KitDialog` | Dialog | Create/edit kits |
| `CreateProjectDialog` | Dialog | New project wizard |
| `EditQuoteDialog` | Dialog | Quote line editing |
| `AmendmentDialog` | Dialog | Post-freeze amendments |

### Production Components

| Component | Description |
|-----------|-------------|
| `ProductionTab` | Stage progress cards |
| `ProjectStageKanbanTab` | Project-level Kanban board |
| `WorkInstructionQuickView` | Instruction preview popup |
| `WorkInstructionViewer` | Full instruction viewer |
| `WorkInstructionEditor` | Instruction editing |
| `WorkInstructionsTab` | Library instruction list |

### Compliance Components

| Component | Description |
|-----------|-------------|
| `ComplianceTab` | Main compliance container |
| `CEStatusWidget` | CE progress summary |
| `ComplianceInputsSection` | Vessel identity, standards |
| `TechnicalDossierSection` | 10-section file manager |
| `ComplianceOutputsSection` | Document generation |
| `OwnerManualBlocksEditor` | Modular manual editor |
| `AppliedStandardsSection` | ISO standards management |

### Planning Components

| Component | Description |
|-----------|-------------|
| `PlanningTab` | Planning container |
| `PlanningSummaryDrilldown` | Summary item viewer |
| `DateRangePicker` | Date selection |
| `StaffSelect` | Staff multi-select |

### Timesheets Components

| Component | Description |
|-----------|-------------|
| `TimesheetsPeriodToggle` | Week/Month switch |
| `TimesheetsReportsView` | Report generation |
| `TimesheetsOverviewChart` | Hours bar chart |
| `TimesheetsProjectSplitChart` | Project breakdown |

---

## 11. STATE MANAGEMENT

### React Hooks (src/v4/state/)

| Hook | Purpose |
|------|---------|
| `useAuth` | Authentication context |
| `useProjects` | Project list state |
| `useClients` | Client list state |
| `useAudit` | Audit entries |

### Pattern: Screen-level state with service calls
- No global state store
- Each screen loads data via services
- `loadProject()` pattern for refresh after mutations

---

## 12. AUTHORIZATION (5 Roles)

| Role | Permissions |
|------|-------------|
| admin | Full access |
| manager | Project management, reporting |
| production_lead | Production tasks, stages |
| production_worker | Own tasks only |
| viewer | Read-only |

---

## 13. MIGRATION NOTES

### Completed Migrations
- v116: Legacy code deleted (57 files)
- WorkItem unification (ProjectTask + PlanningTask → WorkItem)
- Technical Dossier subheadings
- Owner's Manual modular blocks

### Work in Progress
- Kanban consolidated into Production tab (v300)
- Work Instructions linked to tasks

---

## 14. KEY INVARIANTS

1. **WIN uniqueness**: No duplicate WIN numbers across projects
2. **Quote versioning**: Quotes are immutable after SENT
3. **Configuration freeze**: Items frozen after ORDER_CONFIRMED
4. **Checklist links**: Subheadings can't be deleted if referenced

---

## 15. DATA FLOW EXAMPLES

### Creating a Production Task
```
UI (TaskDialog) → TaskService.createTask() → ProjectRepository.update()
                                           → AuditService.log()
```

### Generating a Quote
```
UI → QuoteService.createDraft() → ProjectRepository.getById()
                                → Create quote from config
                                → ProjectRepository.update()
                                → AuditService.log()
```

### Moving Kanban Card
```
UI (drag) → TaskService.moveToStage() → Update stageId, stageSortOrder
                                      → ProjectRepository.update()
```

---

*Generated: January 2026 | Version: v300*

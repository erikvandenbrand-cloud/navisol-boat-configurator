# Navisol v4 Implementation Backlog

## Feature Parity Status: ~98% (increasing)
See `FEATURE_PARITY.md` for full analysis.

---

## COMPLETED PHASES

### Phase 49: Dependency Visualization (Prod.P3.5) [DONE v214]
- [x] Add "Show dependencies" toggle to GanttChart (default off)
- [x] When on, draw SVG connectors between dependency task bars
- [x] Connectors only drawn when both tasks are visible on timeline
- [x] Step connector path: horizontal → vertical → horizontal with arrowhead
- [x] Subtle dashed line styling (#94a3b8, opacity 0.7)
- [x] Connectors update visually during drag operations
- [x] Works with both flat and grouped (swim lane) modes
- [x] Display-only (no scheduling logic, no validation)
- [x] Read-only mode unchanged (still display-only)
- [x] No data model changes

### Phase 48: Resource Swim Lanes (Prod.P3.4) [DONE v213]
- [x] Add "Group by assignee" toggle to GanttChart (default off)
- [x] When on, show swim lanes per PlanningResource
- [x] Task appears in lane of its first assigneeResourceId
- [x] Tasks with no assignee appear in "Unassigned" lane
- [x] Drag/resize behavior unchanged
- [x] Click opens existing Edit Task dialog
- [x] Read-only when project.status = CLOSED
- [x] No data model changes
- [x] No scheduling logic

### Phase 47: Editable Gantt Timeline (Prod.P3.3) [DONE v212]
- [x] Added interactive GanttChart component to PlanningTab
- [x] Timeline shows tasks with startDate and endDate (or derived from durationDays)
- [x] Drag bars horizontally to move task dates
- [x] Resize right edge to change endDate
- [x] Click bar to open Edit Task dialog
- [x] "Needs Dates" section for tasks without dates (click to edit)
- [x] Read-only mode when project.status = CLOSED (no drag/resize)
- [x] Banner: "Planning timeline — manual edits only (no automatic scheduling)"
- [x] Navigation: Today, Previous Week, Next Week buttons
- [x] Task bar colors based on status (TODO=teal, IN_PROGRESS=blue, DONE=green)
- [x] Weekend highlighting, today highlighting
- [x] Direct manipulation updates only the edited task (no auto-scheduling)
- [x] All linting passes

### Phase 46: Planning Tab Minimal UI (Prod.P3.2) [DONE v209]
- [x] Created PlanningTab component with Tasks and Resources sections
- [x] Tasks table: Title, Dates, Status, Assignees count, Dependencies count
- [x] Tasks add/edit dialog with multi-select assignees and dependencies
- [x] Resources table: Name, Role, Capacity, Notes
- [x] Resources add/edit dialog
- [x] Delete confirmation for both
- [x] Read-only when project.status = CLOSED
- [x] Added Planning tab trigger to ProjectDetailScreen
- [x] Persist changes to project.planning.tasks/resources
- [x] Added 26 new tests for CRUD operations
- [x] 984 total tests passing

### Phase 45: Planning Data Model (Prod.P3.1) [DONE v208]
- [x] Added PlanningTaskStatus type ('TODO' | 'IN_PROGRESS' | 'DONE')
- [x] Added PlanningTask interface (id, title, startDate?, endDate?, durationDays?, status?, assigneeResourceIds?, dependsOnTaskIds?, notes?)
- [x] Added PlanningResource interface (id, name, role?, capacityPct?, notes?)
- [x] Added ProjectPlanning interface (tasks?: PlanningTask[], resources?: PlanningResource[])
- [x] Added planning?: ProjectPlanning to Project interface
- [x] Exported types from models/index.ts
- [x] LocalStorage persistence automatic (whole-project JSON serialization)
- [x] ZIP export/import backward compatible (optional fields handled safely)
- [x] Added 40 new tests for model structure, data operations, serialization, legacy import safety
- [x] 958 total tests passing
- [x] All linting passes

### Phase 44: Preview Index Dialog (micro-slice 3/3) [DONE v207]
- [x] Created PreviewIndexDialog component listing available document previews
- [x] Owner's Manual preview - opens existing OwnerManualPreview dialog when available
- [x] Applied Standards preview - inline read-only table view
- [x] Technical Dossier preview - shows attachments list from certification packs
- [x] Each item shows availability status and "Draft preview — not an approved document" warning
- [x] Added "All Previews" button to Quick Actions row
- [x] Disabled items show "Preview not available" badge with reason
- [x] All linting passes

### Phase 44: Project Snapshot (micro-slice 2/3) [DONE v206]
- [x] Owner's Manual snapshot item clickable → navigates to Compliance tab, scrolls to editor
- [x] Applied Standards snapshot item clickable → navigates to Compliance tab, scrolls to Applied Standards section
- [x] Attachments snapshot item clickable → navigates to Compliance tab
- [x] Status remains display-only (no action)
- [x] Visual feedback: dotted underline on clickable items, hover background effect
- [x] Added data-testid="applied-standards-section" to AppliedStandardsSection Card
- [x] Reused existing navigation patterns from Quick Actions row
- [x] All linting passes

### Phase 44: Project Snapshot (micro-slice 1/3) [DONE v205]
- [x] Added Project Snapshot row in ProjectDetailScreen header area
- [x] Owner's Manual: shows included/total blocks or "Not started" or "—"
- [x] Applied Standards: shows count or "—"
- [x] Attachments: shows total count + used count or "—"
- [x] Project Status: DRAFT / CLOSED badge
- [x] Purely read-only derived display, no data changes
- [x] Added test IDs for automation (project-snapshot-row, snapshot-owner-manual, etc.)
- [x] All linting passes

### Phase 43: Attachments "Used/Unused" Indicators [DONE v204]
- [x] Added helper function `getUsedAttachmentIds()` to determine if attachment is used
- [x] Check appliedStandards[].evidenceAttachmentIds for usage
- [x] Check technicalFile.sections[].items[].attachmentId for usage
- [x] Added "Used" / "Unused" badge to AttachmentRow component
- [x] Added filter toggle: All / Used / Unused
- [x] Filter applies to chapter attachments in compliance tab
- [x] No data changes (read-only derived UI only)
- [x] All linting passes

### Phase 42: Project Quick Actions [DONE v203]
- [x] Added Quick Actions row to ProjectDetailScreen header
- [x] "Edit Owner's Manual" button (navigates to Compliance tab, scrolls to editor)
- [x] "Preview Owner's Manual" button (opens preview dialog)
- [x] "Attachments" button (navigates to Compliance tab)
- [x] Buttons disabled when features not available (no modular blocks, no included sections, no compliance packs)
- [x] Only shows for NEW_BUILD projects with document templates
- [x] No data changes (UI/navigation only)
- [x] All linting passes

### Phase 41: Documents UX Cohesion [DONE v202]
- [x] Added "Edit Owner's Manual" button next to Preview for Owner's Manual
- [x] Button scrolls to and highlights the editor area
- [x] Added helper text "Preview reflects the current draft blocks." under Preview button
- [x] Verified Technical Dossier terminology is correct (internal evidence container)
- [x] Verified Technical File terminology is correct (generated snapshot)
- [x] No data changes (UI/copy only)
- [x] All linting passes

### Phase 40: Applied Standards Evidence Navigation [DONE v199]
- [x] Make attachment filenames clickable in evidence popover
- [x] Add openComplianceAttachment helper (same pattern as ArticleDialog)
- [x] Clicking filename opens attachment in new tab
- [x] ExternalLink icon on hover for visual affordance
- [x] No data changes (read-only navigation)
- [x] All linting passes

### Phase 39: Owner's Manual HTML Preview [DONE v196]
- [x] Created OwnerManualPreview component for read-only HTML preview
- [x] Preview only shows included blocks (respects include/exclude state)
- [x] Renders content with basic markdown support (headings, lists, bold, italic)
- [x] Images render when present with captions
- [x] Banner: "Draft preview — not an approved document"
- [x] Integrated Preview button in DocumentTemplatesSection toolbar
- [x] Button disabled when no sections are included
- [x] Preview is read-only (no data modifications)
- [x] No new tests needed (UI only, read-only preview)
- [x] Fixed pre-existing popover component missing
- [x] Fixed pre-existing AppliedStandardsSection result type errors

### Phase 38: Technical Dossier UI Labels [DONE v194]
- [x] Documents UI: Technical File button now has helper text "Generated snapshot (not the dossier)" (v193)
- [x] LibraryScreen: DOCUMENT_TYPES description already says "Generated snapshot of Technical Dossier"
- [x] Compliance tab: Added informational "Technical Dossier" section card (v194)
- [x] Helper text: "Internal evidence container (attachments only). Not a generated document."
- [x] Guidance text: "Attach evidence in the certification packs above."
- [x] No data key changes (project.technicalFile unchanged)
- [x] No localStorage/ZIP changes
- [x] No new tests needed (UI text only)

### Phase 37: Applied Standards [DONE v192]
- [x] Add AppliedStandard interface to project model (id, code, title?, year?, scopeNote?, isHarmonised?, evidenceAttachmentIds?)
- [x] Add appliedStandards?: AppliedStandard[] to Project interface
- [x] Default empty array, backward-compatible (legacy projects have undefined)
- [x] Create AppliedStandardsSection component for Compliance tab
- [x] CRUD table with columns: Code, Year, Harmonised badge, Title, Evidence count
- [x] Add/Edit dialog with free text input (no validation)
- [x] Link evidence from existing compliance attachments (IDs only)
- [x] Read-only when project.status = CLOSED
- [x] Section visible for NEW_BUILD by default, hidden for REFIT/MAINTENANCE until data exists
- [x] Integrate AppliedStandardsSection into ComplianceTab
- [x] Terminology: "Technical File" → "Generated snapshot of Technical Dossier" (description update)
- [x] Keep data key project.technicalFile unchanged
- [x] 33 new tests for model, data operations, serialization, project type gating
- [x] 918 total tests passing

### Phase 36: AI-Assisted Banner for Owner's Manual [DONE v191]
- [x] Add aiAssisted prop to OwnerManualBlocksEditor component
- [x] Show banner when !readOnly && aiAssisted=true
- [x] Banner text: "AI-assisted draft text — review before approval"
- [x] Banner uses purple styling with Sparkles icon
- [x] Pass aiAssisted from DocumentTemplatesSection to OwnerManualBlocksEditor
- [x] aiAssisted=true set by createOwnerManualTemplateVersion for seeded content
- [x] aiAssisted=false set by migrateOwnerManualToBlocks for legacy content
- [x] Banner NOT shown for DoC, CE Marking Cert, Annex Index (no aiAssisted field)
- [x] Banner NOT shown when APPROVED (readOnly=true)
- [x] 15 new tests for banner display logic, model, project creation, ZIP roundtrip
- [x] 885 total tests passing

### Phase 35: Vessel Systems UI [DONE v190]
- [x] Create VesselSystemsSection component
- [x] Multi-select checklist of SYSTEM_KEYS from catalogue
- [x] Allow adding custom system key (free text)
- [x] Allow removing custom keys
- [x] Persist changes to project.systems
- [x] Call ensureOwnerManualTemplateBlocks after saving (preserves user toggles)
- [x] Integrate into ComplianceTab (NEW_BUILD only)
- [x] Add tests for UI, persistence, ZIP roundtrip, user toggle preservation
- [x] 19 new tests (870 total tests passing)

### Phase 34: Modular Owner's Manual Catalogue [DONE v189]
- [x] Add `systems?: string[]` to Project interface
- [x] Create Owner's Manual catalogue with all chapters/subchapters (14 chapters, 60+ subchapters)
- [x] Create ManualBlock, ManualCatalogue, ManualCatalogueChapter, ManualCatalogueSubchapter interfaces
- [x] Factory functions: createOwnerManualBlocks, createOwnerManualTemplateVersion, createOwnerManualTemplate
- [x] Migration function: migrateOwnerManualToBlocks for legacy content
- [x] Helper functions: shouldIncludeSubchapter, isModularOwnerManual, getManualBlock, getChapterBlocks, getIncludedBlocks, getCatalogueChapter, getCatalogueSubchapter
- [x] Add getChapterTitle, getSubchapterTitle for catalogue-based title lookups
- [x] Add ensureOwnerManualBlocksFromCatalogue for repairing/adding missing blocks
- [x] Add ensureOwnerManualVersionBlocks for version-level block repair
- [x] Add ensureOwnerManualTemplateBlocks for template-level block repair
- [x] ExportImportService migrates legacy Owner's Manual on import
- [x] ExportImportService ensures all catalogue blocks are present on import
- [x] Create OwnerManualBlocksEditor component with catalogue title integration
  - [x] Two-column layout: chapters/subchapters list + editor pane
  - [x] Uses getChapterTitle/getSubchapterTitle for display
  - [x] Include toggles, content editing, image slot management
  - [x] Debug panel collapsible at bottom
- [x] Integrate OwnerManualBlocksEditor into DocumentTemplatesSection
- [x] Tests: Catalogue exists and is stable ordered (42 new tests)
- [x] Tests: NEW_BUILD seeded blocks cover all catalogue subchapters
- [x] Tests: ensure function preserves edits (content/imageSlots) and only adds missing blocks
- [x] Tests: Included defaults follow systems keys
- [x] Tests: ZIP export/import roundtrip preserves blocks + included + content + imageSlots
- [x] Tests: Legacy blob migration preserved and included
- [x] 851 total tests passing

### Phase 33: Production Mode Choice [DONE v187]
- [x] Add ProductionMode type ('single' | 'serial') to CreateProjectInput
- [x] Add initialBoatCount optional field to CreateProjectInput
- [x] Update ProjectRepository.create to use productionMode and initialBoatCount
- [x] Single boat: create 1 BoatInstance (Boat 01)
- [x] Serial production: create Boat 01..Boat NN (min 2, default 2)
- [x] Default behavior: single boat if user skips choice (backward compat)
- [x] Add Production Type radio choice in CreateProjectDialog (NEW_BUILD only)
- [x] Serial mode shows editable boat count input (min 2, max 99)
- [x] Non-NEW_BUILD projects: productionMode ignored
- [x] 13 new tests for production mode (single, serial, min enforcement, backward compat, ZIP roundtrip)
- [x] 803 total tests passing

### Phase 32: Delete Boat Action [DONE v186]
- [x] Add delete button per boat row in BoatsSection
- [x] Confirmation dialog before delete
- [x] Warning message if boat has WIN/CIN
- [x] Prevent deleting the last remaining boat (keep at least 1)
- [x] Renumber default labels ("Boat XX") after deletion
- [x] Preserve custom labels without renumbering
- [x] 12 new tests for delete functionality (basic delete, renumbering, last boat prevention, persistence)
- [x] 790 total tests passing

### Phase 31: Template Editor UI [DONE v185]
- [x] Create DocumentTemplatesSection component for viewing/editing templates
- [x] List 4 templates with status (DRAFT/APPROVED) badges
- [x] Open template: show textarea editor for DRAFT version content only
- [x] Parse {{IMAGE:key}} tokens and show "Image Slots" panel
- [x] Upload/replace images for slots with base64 data URL storage
- [x] Optional caption field for image slots
- [x] APPROVED versions are read-only (no edits, no image changes)
- [x] NEW_BUILD: templates visible by default
- [x] REFIT/MAINTENANCE: section hidden when no templates exist
- [x] Add caption field to DocumentTemplateImageSlot interface
- [x] 19 new tests for UI functionality (DRAFT editing, image slots, read-only, visibility)
- [x] 778 total tests passing

### Phase 30: Editable Template Skeletons [DONE v184]
- [x] Update DoC skeleton with IMCI-required [FIXED] sentences per RCD 2013/53/EU
- [x] Use {{CIN}} instead of {{WIN}} (Craft Identification Number per ISO 10087)
- [x] Add structured DoC with Product Identification, Declaration, Conformity Assessment, Signatory sections
- [x] Update Owner's Manual skeleton with concise section headings (12 sections, no long prose)
- [x] Add new image slots: builders_plate, general_arrangement, electrical_schematic, fuel_system_diagram
- [x] Update CE Marking Certificate with [FIXED] conformity sentence
- [x] Update Annex Index with 12 structured sections matching Technical File
- [x] Update required fields to include CIN, DESIGN_CATEGORY, SIGNATORY_NAME
- [x] NEW_BUILD gets all 4 template skeletons on creation (unchanged)
- [x] REFIT/MAINTENANCE do not auto-create templates (unchanged)
- [x] Export/import preserves seeded content exactly (unchanged)
- [x] 6 new tests for [FIXED] sentences, section headings, and image slots
- [x] 759 total tests passing

### Phase 29: CE Document Templates Model [DONE v183]
- [x] Add CEDocumentTemplateType enum: DOC_DOC, DOC_OWNERS_MANUAL, DOC_CE_MARKING_CERT, DOC_ANNEX_INDEX
- [x] Add ProjectDocumentTemplate interface with versioning (DRAFT → APPROVED immutable)
- [x] Add ProjectDocumentTemplateVersion with content (text/markdown with {{FIELD}} and {{IMAGE:key}} placeholders)
- [x] Add DocumentTemplateImageSlot for storing image data in templates
- [x] Add default content for all 4 template types with CE-compliant structure
- [x] Add factory functions: createTemplateVersion, createDocumentTemplate, createAllDocumentTemplates
- [x] Add ensureDocumentTemplates for backward compatibility
- [x] Add helper functions: isTemplateVersionEditable, hasApprovedVersion, getDraftVersion, getApprovedVersion
- [x] Add documentTemplates?: ProjectDocumentTemplate[] to Project interface
- [x] Initialize documentTemplates for NEW_BUILD projects only (not REFIT/MAINTENANCE)
- [x] Update ExportImportService for backward-compatible import (initialize templates for old NEW_BUILD projects)
- [x] ZIP export/import preserves template content, versions, and image slots
- [x] REFIT/MAINTENANCE projects do NOT auto-create templates (optional)
- [x] No UI, no PDF, no rendering, no DocumentService changes (data model only)
- [x] 50 new tests (753 total tests passing)

### Phase 28: Technical File Structure [DONE v182]
- [x] Add TechnicalFile model with 10 fixed sections
- [x] Section IDs: general-description, design-drawings, calculations, materials, essential-requirements, stability-buoyancy, electrical-systems, fuel-systems, steering-systems, conformity-assessment
- [x] Each section stores items: { kind: "attachmentRef"; attachmentId: string; note?: string }[]
- [x] Add technicalFile?: TechnicalFile to Project interface
- [x] Add createEmptyTechnicalFile() factory function
- [x] Add ensureTechnicalFile() for backward compatibility
- [x] Initialize technicalFile on new project creation in ProjectRepository
- [x] Update ExportImportService to migrate projects without technicalFile on import
- [x] ZIP export/import preserves section structure and item refs
- [x] Backward compatible: import project without technicalFile initializes 10 sections
- [x] No UI, no PDF, no doc generation (data structure only)
- [x] 18 new tests (703 total tests passing)

### Phase 27: Serial Production (Boat Instances) [DONE v181]
- [x] Add BoatInstance interface (id, label, win) to project model
- [x] Add boats?: BoatInstance[] to Project interface
- [x] Add migration logic: projects without boats get Boat 01
- [x] Migrate legacy project.win to boats[0].win when boats[0].win is empty
- [x] Keep project.win field for backward compatibility (deprecated)
- [x] Update WINRegisterService to return boat-based entries
- [x] Update getWINStatistics to count boats (totalBoats, boatsWithWIN, boatsWithoutWIN)
- [x] Update filterWINRegisterEntries to search by boat label
- [x] Update WINRegisterScreen to display boats (one row per boat)
- [x] Add Boat column to WIN Register table
- [x] Update statistics cards to show boat counts
- [x] Create BoatsSection component for ProjectDetailScreen
- [x] Add Boats section to Overview tab (NEW_BUILD only)
- [x] Editable label and WIN fields per boat
- [x] Add boat button (add-only, no delete/reorder)
- [x] Read-only when project is CLOSED
- [x] 5 migration tests (backward compatibility)
- [x] Updated selector tests for boat rows
- [x] Updated filter tests for boat label
- [x] Updated statistics tests
- [x] 685 total tests passing (+7 from previous)

### Phase 26: WIN Register (NEW_BUILD) [DONE v180]
- [x] Add `win` optional field to Project model for Watercraft Identification Number
- [x] Create WINRegisterService with getWINRegisterEntries selector
- [x] Returns only NEW_BUILD projects (excludes REFIT, MAINTENANCE)
- [x] Excludes archived projects
- [x] Sorted by WIN (alphabetically) then createdAt (descending) for entries without WIN
- [x] Create filterWINRegisterEntries pure function for search/filter
- [x] Search filters by WIN, project number, project title, boat model
- [x] Create WINRegisterScreen component
- [x] Table columns: WIN/CIN, Project (title + number), Boat Model, Status, Client
- [x] Statistics cards: Total New Builds, With WIN, Without WIN
- [x] Click-through to project details
- [x] Add WIN Register to sidebar navigation (Hash icon)
- [x] Add /win-register hash route
- [x] Permission: uses project:read (same as Projects screen)
- [x] 17 new tests (678 total tests passing)

### Phase 25.3: Production Feedback UX Polish [DONE v178]
- [x] Improved visual hierarchy for feedback entries (left border accent, card styling)
- [x] Added author avatar circle with initial letter
- [x] Better author/timestamp layout (inline with clearer hierarchy)
- [x] Improved tag display with rounded pills and consistent sizing
- [x] Enhanced empty state with icon and helpful text
- [x] Better add form layout with labeled sections
- [x] Improved quick-add tag buttons with clearer active/inactive states
- [x] Edit mode now has distinct blue background for visual separation
- [x] All 661 tests passing (no new tests needed - UI polish only)

### Phase 25.2: Stages Overview Table Columns [DONE v177]
- [x] Add Stages Overview table in ProductionTab between summary cards and stages list
- [x] Add "Planned Start" column showing stage.plannedStartDate
- [x] Add "Planned End" column showing stage.plannedEndDate
- [x] Empty cell (em-dash) when date not set
- [x] Display only (no inline editing in this table)
- [x] Date format: "DD Mon YYYY" (e.g., "1 Mar 2025")
- [x] Table includes: Stage, Status, Progress, Planned Start, Planned End, Est. Days
- [x] 6 new tests for table column data rendering
- [x] All 661 tests passing

### Phase 25.1: Planned Dates Header Display [DONE v176]
- [x] Display plannedStartDate/plannedEndDate inline in stage header (read-only)
- [x] Show Calendar icon with "DD Mon → DD Mon" format for both dates
- [x] Show "From DD Mon" when only start date exists
- [x] Show "Until DD Mon" when only end date exists
- [x] Show nothing when neither date exists
- [x] No validation, calculations, sorting, or dependencies
- [x] CLOSED projects remain read-only (display is fine)
- [x] 6 new tests for header display format
- [x] All 655 tests passing

### Phase 25: Article Attachment Access [DONE v175]
- [x] All users who can view an Article can download its attachments (read-only)
- [x] Added download/open buttons to ArticleDialog existing attachments list
- [x] ArticleDetailViewer already has download buttons (BOM click-through)
- [x] ArticleAttachmentsViewer already has download buttons (Production)
- [x] No role-based or ownership-based download restrictions
- [x] Approved ArticleVersions remain immutable (cannot add attachments)
- [x] Downloads return original file (no transformation)
- [x] No changes to LocalStorage or ZIP import/export
- [x] 24 new tests for attachment access permissions
- [x] All 649 tests passing

### Phase 24: Production Stage Planned Dates [DONE v172]
- [x] Verify ProductionStage interface already has plannedStartDate and plannedEndDate (optional strings, YYYY-MM-DD format)
- [x] Fields are informational only - no dependencies, validation, or scheduling logic
- [x] LocalStorage persistence automatic (whole-project JSON serialization)
- [x] ZIP export/import backward compatible (optional fields, older ZIPs import without errors)
- [x] Add test: export/import production stages with plannedStartDate/EndDate
- [x] Add test: backward compatibility for ZIPs without planned date fields
- [x] Add test: partial planned dates (only start or only end)
- [x] All 620 tests passing (3 new tests)

### Phase 23: Global PDF Branding [DONE v171]
- [x] Add Navisol watermark SVG as inline asset in PDFService
- [x] Add Navisol logo SVG as inline asset in PDFService
- [x] Add CSS for faded full-page background watermark (opacity 0.04, centered)
- [x] Add CSS for fixed header logo at top of every page
- [x] Update wrapInPDFDocument to include branding elements BEFORE content
- [x] Ensure branding renders on every page of multi-page PDFs (position: fixed)
- [x] Add print media query styles for branding persistence
- [x] Add padding-top to pdf-container to avoid header overlap
- [x] 10 new tests for PDF branding (617 total tests passing)
- [x] All existing tests continue to pass

### Phase 22: Quotation Category-Grouped Layout [DONE v170]
- [x] Add QuoteCategoryItem and QuoteCategoryGroup interfaces to PDFService
- [x] Add CSS for category-grouped quotation layout (category-header, article-row, category-total)
- [x] Update generateQuotePDF to support category-grouped layout when categoryGroups is provided
- [x] Article rows show description + quantity only (NO per-article prices)
- [x] Category total row shows "Totaal [Category]" with bold styling
- [x] Keep Grand Total and VAT summary unchanged
- [x] Update ProjectDetailScreen to build categoryGroups from quote lines
- [x] Backward compatible: legacy flat layout still works when categoryGroups is not provided
- [x] 8 new tests for category-grouped quotation
- [x] All 607 tests passing

### Phase 21.2: Timesheet Reporting Upgrade [DONE v169]
- [x] Add monthly aggregation helpers (getMonthlyProjectOverview, getProjectMonthlySummary) - DONE in service
- [x] Add month date helpers (getMonthStart, getMonthEnd) - DONE in model
- [x] Add Week/Month period toggle (TimesheetsPeriodToggle component)
- [x] Add project selector filter in Reports tab
- [x] Update Reports view for monthly mode
- [x] Add visual charts (TimesheetsOverviewChart bar chart, TimesheetsProjectSplitChart donut)
- [x] Add tests for monthly aggregation (3 tests)
- [x] Add tests for chart rendering (8 tests)
- [x] All 599 tests passing

### Phase 21.1: Timesheet Weekly Reports [DONE v167]
- [x] Add aggregation helpers to TimesheetService (groupByProject, groupByUserForProject, groupByTaskForProject)
- [x] Add report types to timesheet model (ProjectWeeklySummary, UserHoursSummary, TaskHoursSummary, WeeklyProjectOverview)
- [x] Add Reports tab to TimesheetsScreen
- [x] Implement Report A: Project Weekly Summary with user and task breakdowns
- [x] Implement Report B: Weekly Overview by Project with click-through
- [x] Permission scoping (own vs all for timesheet:view_all)
- [x] Add 8 tests for report aggregations (project totals, user breakdown, billable split, permission scoping, task breakdown)
- [x] All 588 tests passing

### Phase 21: Timesheets [DONE v166]
- [x] Add TimesheetEntry model
- [x] Add project.isInternal field (optional, backward-compatible)
- [x] Create TimesheetRepository with LocalStorage persistence
- [x] Create TimesheetService with CRUD operations
- [x] Add timesheet:view_all and timesheet:manage permissions
- [x] Add Timesheets screen navigation
- [x] Create TimesheetsScreen with entry form and weekly view
- [x] Update ExportImportService for timesheet ZIP export/import
- [x] Add tests for timesheet persistence, CLOSED project blocking, internal project defaults
- [x] Add tests for weekly grouping and date range queries
- [x] All 580 tests passing

### Phase 20.1: Duplicate Task Set Warning [DONE v165]
- [x] Add `isTaskSetAlreadyApplied` helper to ProductionProcedureService
- [x] Update `copyTaskSetToProject` to require `forceDuplicate` flag for duplicates
- [x] Add duplicate confirmation dialog in AddFromTaskSetDialog
- [x] Add 4 new tests for duplicate detection and force flag behavior
- [x] All 561 tests passing

### Phase 20: Standard Task Sets & Production Procedures [DONE v164]
- [x] Create ProductionProcedure and ProductionProcedureVersion models
- [x] Create TaskSetTemplate and TemplateTask models
- [x] Add task provenance fields to ProjectTask model (sourceProcedureId, sourceProcedureVersionId, sourceTaskSetTemplateId, copiedFromTemplateAt)
- [x] Create ProductionProcedureRepository with full CRUD and versioning
- [x] Create ProductionProcedureService with versioning and copy-to-project
- [x] Add NEW_BUILD gating for task set copying
- [x] Update ExportImportService to include production procedures
- [x] Create ProductionProceduresTab component for Library screen
- [x] Add "Task Templates" tab to Library screen
- [x] Create AddFromTaskSetDialog component for copying task sets to projects
- [x] Add "Add from Template" button in Production tab (NEW_BUILD only)
- [x] Create tests for approve locks version, copy creates tasks with provenance, NEW_BUILD gating
- [x] Add default production procedures (3 procedures, 8 task sets, 40+ tasks)
- [x] Idempotent seeding: only creates defaults if no procedures exist
- [x] 15 new tests (557 total tests passing)

### Phase 19: Resource Planner [DONE v219]
- [x] Created ResourcePlannerScreen.tsx with multi-project resource aggregation
- [x] Added 4-week window view with prev/next/today navigation
- [x] Table with rows=resources, columns=weeks showing task counts
- [x] Click-to-view task details dialog (project name, title, date range, status)
- [x] "Unassigned" row for tasks without assigned resources
- [x] Banner text: "Overview only — no automatic scheduling"
- [x] Empty state guidance when no planning data exists
- [x] Integrated into V4App navigation as "Resource Planner"
- [x] Added route parsing for /resource-planner hash route
- [x] Added minimal test for ResourcePlannerScreen aggregation logic (17 tests)
- [x] All 1001 existing tests pass
- [x] Click-through navigation from task details to project Planning tab (v218)
- [x] Project Status filter (All, DRAFT, CLOSED) (v219)
- [x] Project Type filter (All, NEW_BUILD, REFIT, MAINTENANCE) (v219)
- [x] Filter summary helper text (v219)
- [x] Capacity/load visualization display-only (v220)
  - [x] Show capacityPct next to resource name when set
  - [x] Show "Load: X" in cells for resources with capacity defined
  - [x] Resources without capacityPct show "N tasks" format
  - [x] Pure display, no warnings/validation

### Phase 19b: Project Planner (Portfolio Gantt) [DONE v221]
- [x] Created ProjectPlannerScreen.tsx with portfolio-level Gantt view
- [x] 4-week window navigation (prev/next/today)
- [x] Each row = project, showing task bars on timeline
- [x] Project span bar (min start to max end) shown as background
- [x] Individual task bars colored by status (TODO, IN_PROGRESS, DONE)
- [x] Click project row to navigate to project Planning tab
- [x] Project Status filter (All, DRAFT, CLOSED)
- [x] Project Type filter (All, NEW_BUILD, REFIT, MAINTENANCE)
- [x] Banner text: "Overview only — no automatic scheduling"
- [x] Empty state guidance when no planning data exists
- [x] Legend for task status colors
- [x] Integrated into V4App navigation as "Project Planner"
- [x] Added route parsing for /project-planner hash route
- [x] Read-only only (no data changes)

### Phase 19c: Shopfloor Board (Execution View) [DONE v224]
- [x] Created ShopfloorBoardScreen.tsx with kanban-style execution view
- [x] Week window toggle: "This Week" (default) / "Next Week"
- [x] Aggregate tasks across all projects where dates overlap selected week
- [x] Group tasks into columns by status: TODO / IN_PROGRESS / DONE
- [x] Task card shows: project name, task title, assignee (or "Unassigned"), date range
- [x] Click card navigates to project Planning tab
- [x] Banner text: "Execution view — drag cards between columns to update status"
- [x] Tasks without dates shown in separate "Tasks Without Dates" section
- [x] Empty state guidance when no planning data exists
- [x] Integrated into V4App navigation as "Shopfloor Board"
- [x] Added route parsing for /shopfloor-board hash route
- [x] Drag-and-drop status updates (v223)
  - [x] Drag task cards between columns to update status
  - [x] Visual drop target highlighting with dashed borders
  - [x] CLOSED projects show lock icon, not draggable
  - [x] Tasks Without Dates section read-only (no dragging)
  - [x] Grip handle icon on draggable cards
  - [x] Status updates via ProjectRepository.update (only status field changed)
- [x] Filters (v224)
  - [x] Assignee filter (All, specific names, Unassigned)
  - [x] Project filter (All, projects contributing tasks to week)
  - [x] Filters apply to all columns and Tasks Without Dates section
  - [x] Helper text: "Showing: <week> / <assignee> / <project>"
  - [x] Clear filters button when active
  - [x] In-memory only (no persistence)

---

## IN PROGRESS

### Phase 19: Neon/Postgres Migration
- [ ] Set up Neon database connection
- [ ] Create database schema migrations
- [ ] Update persistence adapter for PostgreSQL
- [ ] Implement data migration from localStorage to Neon
- [ ] Add connection pooling and error handling

### Other Pending Features
- [ ] Basic reports (export, analytics)
- [ ] Owner's Manual generator from compliance data
- [ ] Compliance wizard UI

---

## Current Version
- v224: Shopfloor Board filters - assignee and project filters with helper text ✅ COMPLETE
- v223: Shopfloor Board drag-and-drop status updates - drag cards between columns to update task status ✅ COMPLETE
- v222: Shopfloor Board (execution view) - kanban-style task board with This Week/Next Week toggle, tasks grouped by status ✅ COMPLETE
- v221: Project Planner (portfolio Gantt view) - read-only timeline view showing all projects with tasks on 4-week window ✅ COMPLETE
- v220: Resource Planner capacity/load visualization (capacityPct next to resource names, "Load: X" in cells for resources with capacity) ✅ COMPLETE
- v219: Resource Planner filters (Project Status and Type filters with summary text) ✅ COMPLETE
- v218: Resource Planner click-through navigation (project name in task dialog navigates to project Planning tab) ✅ COMPLETE
- v214: Dependency Visualization (Prod.P3.5) (Show dependencies toggle in GanttChart, SVG connectors between tasks, step path, dashed styling, visual updates during drag, works with swim lanes) ✅ COMPLETE
- v213: Resource Swim Lanes (Prod.P3.4) (Group by assignee toggle in GanttChart, swim lanes per PlanningResource, Unassigned lane for tasks without assignees, drag/resize unchanged) ✅ COMPLETE
- v212: Editable Gantt Timeline (Prod.P3.3) (Interactive GanttChart in PlanningTab, drag/resize bars, edit dialog, "Needs Dates" section, manual edits only, navigation controls, color/status, weekend/today highlighting, read-only when CLOSED) ✅ COMPLETE
- v209: Planning Tab Minimal UI (Prod.P3.2) (PlanningTab component with Tasks and Resources CRUD, add/edit/delete dialogs, multi-select assignees and dependencies, read-only when CLOSED, 26 new tests, 984 tests total) ✅ COMPLETE
- v208: Planning Data Model (Prod.P3.1) (Added project.planning optional container with PlanningTask and PlanningResource interfaces, 40 new tests, 958 tests passing) ✅ COMPLETE
- v207: Preview Index Dialog (micro-slice 3/3) (PreviewIndexDialog component with Owner's Manual, Applied Standards, Technical Dossier previews, "All Previews" button in Quick Actions) ✅ COMPLETE
- v206: Project Snapshot Deep Links (micro-slice 2/3) (Owner's Manual, Applied Standards, Attachments items now clickable with navigation, dotted underline visual feedback, Status remains display-only) ✅ COMPLETE
- v205: Project Snapshot (micro-slice 1/3) (Added Project Snapshot row in ProjectDetailScreen header, shows included/total blocks, Applied Standards count, Attachments count, Project Status badge, read-only display) ✅ COMPLETE
- v204: Attachments Used/Unused Indicators (Added Used/Unused badge to attachments, filter toggle All/Used/Unused, checks Applied Standards and Technical File references) ✅ COMPLETE
- v203: Project Quick Actions (Quick Actions row in ProjectDetailScreen, "Edit Owner's Manual" button, "Preview Owner's Manual" button, "Attachments" button, disabled when features not available, only for NEW_BUILD with templates) ✅ COMPLETE
- v202: Documents UX Cohesion micro-slice 1/3 (renamed "Edit Manual" to "Edit Owner's Manual", updated helper text to "Preview reflects the current draft blocks.") ✅ COMPLETE
- v199: Applied Standards Evidence Navigation (clickable filenames in evidence popover, opens attachment in new tab, read-only) ✅ COMPLETE
- v188: Resource Planner (multi-project resource aggregation, 4-week view, task count table, task details dialog, unassigned row, "Overview only" banner, empty state guidance, navigation integration, route parsing, 17 test) ✅ COMPLETE

## Previous Versions
- v198: Owner's Manual Preview Token Visibility (highlight unresolved {{FIELD}} and {{IMAGE:key}} tokens with yellow badge, tooltip "Value not set") ✅ COMPLETE
- v197: Vessel Systems → Owner's Manual Linkage Visibility (display-only system key indicators on blocks, helper text banner) ✅ COMPLETE
- v196: Owner's Manual HTML Preview (read-only HTML preview with included blocks, basic markdown, image rendering, preview button, build fixes) ✅ COMPLETE
- v194: Technical Dossier Section in Compliance (informational card, no functionality)
- v193: Technical Dossier UI Labels (Documents UI helper text)
- v192: Applied Standards (AppliedStandardsSection component, CRUD table with evidence linking, project type gating, 33 new tests, 918 tests passing)
- v191: AI-Assisted Banner (OwnerManualBlocksEditor shows banner for AI-seeded DRAFT content, 15 new tests, 885 tests passing)
- v190: Vessel Systems UI (VesselSystemsSection component, multi-select checklist, custom keys, ComplianceTab integration, user toggle preservation, 19 new tests, 870 tests passing)
- v189: Owner's Manual Catalogue (stable catalogue with 14 chapters/60+ subchapters, ensureOwnerManualBlocksFromCatalogue function, getChapterTitle/getSubchapterTitle helpers, ZIP import migration/repair, 42 new tests, 851 tests passing)
- v187: Production Mode Choice (single/serial production mode in project creation, serial creates Boat 01..NN with min 2, 13 new tests, 803 tests passing)
- v186: Delete Boat Action (delete button per boat, confirmation dialog with WIN warning, prevent last boat deletion, renumber default labels, 12 new tests, 790 tests passing)
- v185: Template Editor UI (DocumentTemplatesSection component, view/edit DRAFT templates, image slots panel with upload, APPROVED read-only, project type visibility, 19 new tests, 778 total tests passing)
- v184: Editable Template Skeletons (IMCI-required [FIXED] sentences, CIN instead of WIN, structured DoC/Manual, 6 new tests, 759 total tests passing)
- v183: CE Document Templates Model (4 template types with versioning, DRAFT→APPROVED immutable, content with placeholders, image slots, backward-compatible import, 50 new tests, 753 tests passing)
- v182: Technical File Structure (10 fixed sections for CE compliance documentation, attachmentRef items, auto-initialize on project creation, backward-compatible ZIP import, 18 new tests, 703 tests passing)
- v181: Serial Production - Boat Instances (multiple boats per NEW_BUILD project, per-boat WIN/CIN, migration from legacy project.win, updated WIN Register to list boats, 685 tests passing)
- v180: WIN Register (read-only list of NEW_BUILD projects with WIN/CIN numbers, search/filter, click-through to project, 17 new tests, 678 tests passing)

## Tests Summary
- 40 planning tests (model structure, data operations, serialization, legacy import safety)
- 984 total tests passing
- 19 Vessel Systems UI tests (UI, persistence, ZIP roundtrip, user toggle preservation)
- 42 Owner's Manual catalogue tests (structure, lookup, inclusion logic, block creation, ensure function, ZIP roundtrip, migration, seeding)
- 13 production mode tests (single boat, serial production, min enforcement, backward compat, ZIP roundtrip)
- 12 boat delete tests (basic delete, renumbering, last boat prevention, persistence)
- 19 document template UI tests (DRAFT editing, image slots, read-only, visibility)
- 50 CE document templates tests (structure, versioning, backward compat, ZIP roundtrip)
- 18 technical file tests (structure, backward compat, ZIP roundtrip)
- 7 new boat instance tests (5 migration + 2 selector/stats)
- 17 WIN Register tests (updated for boats)
- 41 production stage tests (29 service + 6 header display + 6 overview table)
- 24 article attachment access tests
- 38 timesheet-related tests (30 service + 8 charts)
- 8 quotation category-grouping tests
- 10 PDF branding tests
- 17 ResourcePlannerScreen tests (aggregation logic, multi-project view, empty state, navigation)

## GitHub Repository
- https://github.com/erikvandenbrand-cloud/navisol-boat-configurator

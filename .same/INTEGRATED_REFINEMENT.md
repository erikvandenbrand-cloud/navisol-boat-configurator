# Navisol v4 — Integrated Refinement Design Document

**Date:** 2026-01-14
**Version:** v307 (Design Only)

---

## 1) Reaffirmation of Locked Principles

1. **Manual > Automatic** — Every data change requires explicit user action; no background jobs or reactive sync
2. **Explicit > Implicit** — Data origins are always visible; source hints show where values come from
3. **One source per datum** — Each piece of information has exactly one owner; references only, no copies
4. **UI displays, services define truth** — Domain services own business logic; UI is purely derived
5. **Remove/merge > Add** — Simplify before extending; reduce entities rather than adding parallel structures

---

## 2) Analysis Table

| Data Item | Where It Exists Now | Origin | Correct Internal Owner | Current Friction |
|-----------|---------------------|--------|------------------------|------------------|
| **Vessel Identity (LOA, beam, draft, weight, category)** | `Project.vesselIdentity` | External (copied once from BoatModel) | **Project** | Manual re-entry from BoatModel; no "init from model" action in UI |
| **Applied Standards (EN-ISO codes)** | `Project.appliedStandards[]` | External (reference library) + Internal | **Project** | No internal Standards Library; suggestedStandards on BoatModel not yet implemented |
| **Article supplier cost** | `ArticleVersion.costPrice` | Internal (Library) | **ArticleVersion** | No semantic distinction between library default vs. project override in BOM; no `supplierCostExclVat` field |
| **Checklist ↔ Dossier navigation** | `ComplianceChecklistItem.technicalFileSectionId` + `subheadingId` | Internal | **ComplianceChecklistItem** | Mapping exists but no "open dossier location" action; evidence counts not visible inline |
| **Shop Floor Order Items** | Not yet implemented | Internal (operational) | **Portfolio / WorkItems context** | Missing entirely; cannot log ad-hoc purchasing needs |
| **AI generation controls** | Global "generate template" buttons | Internal (tool layer) | **User (explicit selection)** | Too coarse; all-or-nothing per document; no per-section controls; not user-gated |

---

## 3) Proposed Improvements (5 Total)

### 3.1 Vessel Identity — Initialize from Boat Model

**Goal:** One-time explicit copy of BoatModel specifications into Project.vesselIdentity, with visible source hint.

**UI Impact:**
- "Initialize from Model" button in Vessel Identity section (Compliance Inputs)
- Pre-fills LOA, beam, draft, weight, maxPersons, designCategory from selected BoatModel
- Badge: "Prefilled from {Model Name} — Editable"
- Fields remain fully editable after init
- Source tracked in `vesselIdentity.prefillSource: 'model:{modelId}'`

**Minimal Data Model Impact:**
- No schema change required; `prefillSource` field already exists
- BoatModelVersion already has all required specification fields

**Service / Truth Ownership:**
- `ProjectService.initVesselIdentityFromModel(projectId: string, modelVersionId: string)` — one-time copy, no sync
- Project owns vesselIdentity completely after init
- BoatModelService is read-only for this flow

**Why No Sync / No Hidden Logic:**
- Explicit user action ("Initialize from Model" button click)
- No background listener or subscription
- UI shows source hint but data is fully decoupled
- Edit on project never updates library model

---

### 3.2 Applied Standards — Internal Library with Suggested Standards

**Goal:** Create an internal Standards Library; BoatModels can suggest standards; Projects explicitly confirm/select.

**UI Impact:**
- Library → Standards tab with CRUD for internal standards
- When selecting a BoatModel during project creation: "Suggested Standards" info card
- "Apply Suggested Standards" button copies references to project (not synced)
- Badge per standard: "Library" or "Project-specific"
- Project standards remain fully editable

**Minimal Data Model Impact:**
```typescript
// New in Library
interface StandardsLibraryEntry extends Entity {
  code: string;              // "EN ISO 12217-1"
  title: string;             // "Stability and buoyancy..."
  year?: string;
  isHarmonised?: boolean;
  tags?: StandardTag[];
}

// Extension on BoatModelVersion
interface BoatModelVersion {
  // ... existing fields ...
  suggestedStandardIds?: string[];  // IDs from StandardsLibrary
}
```

**Service / Truth Ownership:**
- `StandardsLibraryService` — CRUD for library entries (new service)
- `BoatModelService.setSuggestedStandards(modelVersionId, standardIds[])` — explicit link
- `ProjectService.applyStandardsFromModel(projectId)` — one-time copy, creates AppliedStandard entries
- Project owns its `appliedStandards[]` after copy

**Why No Sync / No Hidden Logic:**
- Explicit "Apply" action; never automatic
- Library updates don't propagate to projects
- Projects can add/edit standards independently
- Source hint visible but data is decoupled

---

### 3.3 Article Supplier Cost — Optional Library Default with Explicit BOM Override

**Goal:** Library articles have optional `supplierCostExclVat`; BOM shows whether cost is Library / Estimated / Override.

**UI Impact:**
- ArticleVersion dialog: new optional field "Supplier Cost (excl. VAT)"
- BOM line items: badge showing cost source:
  - "Library" (green) — uses `supplierCostExclVat` from article version
  - "Estimated" (amber) — manually entered estimate in BOM, no library cost exists
  - "Override" (blue) — manually overridden from library value
- BOM export includes cost source column

**Minimal Data Model Impact:**
```typescript
// Extension on ArticleVersion
interface ArticleVersion {
  // ... existing fields ...
  supplierCostExclVat?: number;  // New: optional library default
}

// Extension on BOM line item (in ConfigurationItem or BOMLine)
interface BOMLineOverrides {
  costPriceOverride?: number;
  costPriceSource?: 'library' | 'estimated' | 'override';
}
```

**Service / Truth Ownership:**
- `LibraryV4Service.updateArticleVersion()` — sets `supplierCostExclVat` in library
- `BOMService.getBOMForProject()` — derives cost, applies overrides, tags source
- BOM line owns its override; library owns default

**Why No Sync / No Hidden Logic:**
- Library value is a default only; never pushed to existing BOMs
- Explicit user action to apply library cost or enter override
- Cost source badge makes origin visible
- No background recalculation

---

### 3.4 Shop Floor Order List — Manual Operational Purchasing

**Goal:** Enable shop floor to log purchasing needs manually, outside the BOM, with check-off on receipt.

**UI Impact:**
- New "Orders" tab in Portfolio sidebar (alongside Production, Timesheets)
- Order list view: filterable by project, status, date range
- Add order item form:
  - Optional link to Library Article (or free-text description)
  - Quantity, unit
  - Optional project assignment
  - Status: `not_ordered` | `ordered` | `received`
- Management overview: central list of all pending orders
- Check-off action: "Mark Received" button per item

**Minimal Data Model Impact:**
```typescript
// New operational entity (Portfolio-level, not project-scoped)
interface ShopFloorOrderItem extends Entity {
  description: string;            // Free-text or article name
  articleVersionId?: string;      // Optional link to library article
  qty: number;
  unit: string;
  projectId?: string;             // Optional project association
  status: 'not_ordered' | 'ordered' | 'received';
  orderedAt?: string;
  receivedAt?: string;
  receivedBy?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}
```

**Service / Truth Ownership:**
- `ShopFloorOrderService` — CRUD for order items
- No connection to BOM; no cost allocation
- No inventory tracking; this is a communication/logging tool only

**Why No Sync / No Hidden Logic:**
- Purely manual entry and status updates
- No automatic purchasing triggers
- No BOM mutation
- No accounting integration
- Accumulates as operational log, never feeds back into project costs

**Explicit Boundary:**
- NOT allowed: automatic order generation, inventory deduction, BOM sync
- NOT allowed: supplier integration, accounting export
- This is a lightweight shop floor communication tool only

---

### 3.5 Compliance UX & AI Tooling Pack

**Goal:** Improve Checklist ↔ Dossier navigation clarity AND replace coarse global AI buttons with scoped, user-gated, per-section AI helpers.

#### Part A: Checklist ↔ Dossier UX Improvements

**UI Impact:**
- **"Open Dossier Location" action** on each checklist item:
  - Small link/button: "View in Dossier →"
  - Navigates to Technical Dossier, scrolls to mapped subheading, applies highlight
  - Uses existing deep linking infrastructure (v305)
- **Evidence count hint per checklist item:**
  - Badge showing "2 attachments" or "No evidence" next to each item
  - Count derived from `technicalFileSectionId` + `subheadingId` → count attachments in dossier
- **Evidence count per subheading in Dossier view:**
  - Each subheading shows "(3 docs)" or similar inline
  - Derived at render time, no data duplication

**Minimal Data Model Impact:**
- None — uses existing mappings (`technicalFileSectionId`, `subheadingId`)
- Evidence counts derived via helper functions

**Service / Truth Ownership:**
- `ComplianceService.getEvidenceCountForItem(item)` — derive from dossier
- Deep link navigation via existing `information-linking.ts` helpers
- No new data storage

#### Part B: AI Scoped Redesign

**UI Impact:**
- **Remove global "Generate Template" buttons** from documents
- **Per-section/per-block "Suggest" button:**
  - Small icon button next to each text section (e.g., in Owner's Manual blocks, Dossier notes)
  - Click opens side panel with AI-generated draft
  - User actions: Accept (copies to field), Edit (modify before copy), Dismiss
- **User gating:**
  - "Suggest" buttons only visible to users with `aiEnabled: true` flag
  - Flag managed in Settings → Users
- **Suggestion-only behavior:**
  - AI never inserts directly into fields
  - AI-assisted content optionally shows subtle "AI-assisted" badge (toggleable)
  - No AI-driven workflows or automatic actions

**Minimal Data Model Impact:**
```typescript
// Extension on User
interface User {
  // ... existing fields ...
  aiEnabled?: boolean;  // New: gates AI helper visibility
}
```

**Service / Truth Ownership:**
- `AuthService` — manages `aiEnabled` flag on User
- AI helpers are UI-layer only; no domain model changes
- No AI service in domain layer — AI is a tool, not a system layer

**Why No Sync / No Hidden Logic:**
- Explicit user action (click "Suggest", then Accept/Edit/Dismiss)
- AI never auto-inserts; user is always final editor
- Gated per user; not available by default
- No background AI processing

---

## 4) What Is NOT Being Built

1. **No roles/permissions system** — UX boundaries defined; authorization implementation deferred
2. **No inventory management** — Shop Floor Order List is a log, not inventory
3. **No automatic purchasing** — All orders are manual entry only
4. **No background synchronization** — All data copies are one-time, user-initiated
5. **No ERP/accounting integration** — No cost allocation logic, no external system sync
6. **No new template/mapping systems for checklists** — Only UX clarity improvements on existing mappings
7. **No global AI buttons** — Replaced with scoped per-section helpers
8. **No AI-driven system behavior** — AI is suggestion-only, never automatic

---

## 5) Deferred / Later

### Staff → User Unification
- Eliminate Staff as separate entity; express staff behaviors via User flags
- One-time migration: StaffMember → User with role PRODUCTION
- **Reason for deferral:** Lower friction than initially assessed; existing dual structure works

### Model Templates Import (Sales Preparation)
- External sources (e.g., eagleboats.nl) allowed ONLY if:
  - Source is explicitly visible
  - Import is explicit and user-confirmed
  - After import, data becomes internally owned
- No scraping automation; no synchronization
- **Conceptual only — not in current scope**

### Brochure-Style Quote Document (Sales Preparation)
- Additional document alongside quotes
- Presentation-focused with equipment list
- NOT a legal contract
- AI may suggest templates (optional, user-gated)
- **Conceptual only — not in current scope**

---

## 6) Risks / Regressions

1. **Shop Floor Order List scope creep** — Easy to expand into inventory/purchasing. Mitigation: hard boundary in service (reject any inventory/BOM mutation attempts); UI clearly labeled as "Order Log" not "Inventory."

2. **Applied Standards Library fragmentation** — If not carefully curated, internal library may diverge from external sources. Mitigation: UI shows "External Reference" vs "Internal Definition" badges; periodic manual reconciliation encouraged (not automated).

3. **AI helper misuse expectations** — Users may expect AI to "do more." Mitigation: clear labeling as "Suggest" not "Generate"; explicit user action required for all insertions; no promise of accuracy.

---

## Appendix: Shop Floor UX Boundary (Functional Scope Only)

**Production Staff can:**
- View Portfolio (projects in production)
- Open and update production tasks
- View linked Work Instructions
- Upload photos to production stages
- Enter production feedback/observations
- Fill timesheets
- Fill Shop Floor Order List (request items)
- Mark order items as received

**Production Staff cannot:**
- Access quotes, pricing, or financial data
- Modify project configuration
- Create/delete projects
- Access library management
- Manage users or settings
- Approve compliance packs
- Finalize documents

> **Note:** This defines functional scope only. No roles system, no permissions enforcement layer designed at this time.

---

## Appendix: AI Usage Boundaries (Controlled & Selective)

**AI is available:**
- Per text block / section (not globally)
- As suggestion only (shows draft, user must accept/edit)
- To users with explicit `aiEnabled: true` flag

**AI is NOT:**
- A system layer (no AI-driven workflows)
- Automatic (never inserts without user action)
- Hidden (AI-generated content can be marked)
- Decision-making (only assists, user decides)

**UI Pattern:**
- Each text section has small "Suggest" icon (visible only if user has AI access)
- Click opens side panel with AI draft
- User can: Accept (copies to main), Edit (modifies before copy), Dismiss
- Accepted content has optional subtle "AI-assisted" indicator

---

## Implementation Priority

1. **Vessel Identity Init from Model** — Reduces data entry friction, already partially scaffolded, high visibility
2. **Compliance UX & AI Tooling Pack** — Immediate UX improvement, builds on existing deep linking
3. **Article Supplier Cost** — High value for BOM clarity, minimal schema change
4. **Applied Standards Library** — Medium effort, foundational for compliance workflows
5. **Shop Floor Order List** — New feature, can be deferred if needed

---

*This document adheres to the STOP CONDITION: No implicit behavior, no background sync, no abstract modules, no ERP/workflow automation introduced.*

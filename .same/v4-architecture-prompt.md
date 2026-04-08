# Navisol v4 Architecture Prompt

You are working on an existing Next.js app ("Navisol Boat Manufacturing System / Boat Configurator") that has grown organically and currently contains multiple parallel stores (v1/v2/v3), hardcoded workflow glue, and implicit connections between features.

Your task: build a clean **v4** that is **project-oriented** and **ERP-like**, with a strict separation between **Library (templates)** and **Project (instances/snapshots)**, while remaining **practical and flexible for a small company**.

---

## TOP GOALS

1. **Project is the hub (aggregate root).**
   Everything operational belongs to a Project: configuration/scope, quotes, BOM, planning, tasks, time entries, documents, delivery checklist, procedures used.

2. **Everything exists in two layers:**
   - **Library** (global templates, versioned, approved)
   - **Project** (project-specific instances and immutable snapshots pinned to library versions)

3. **Historical correctness is mandatory (when it matters).**
   Once a project reaches milestones (OfferSent, OrderConfirmed, Delivered), preserve exactly what was used. Library updates must never change historical projects.

4. **Build v4 isolated first.**
   Create a new route `/v4` that runs independently. Do NOT mount any legacy providers or stores inside v4.

5. **Database-ready design (Neon later).**
   Persist to LocalStorage now, but ALL persistence goes through an adapter for future Neon/Postgres swap.

---

## FLEXIBILITY REQUIREMENT (CRITICAL)

This system is for a **small company**, not a bureaucratic enterprise.

| Phase | Flexibility | Behavior |
|-------|-------------|----------|
| Before `OrderConfirmed` | **High** | Edit freely, warnings only |
| After `OrderConfirmed` | **Controlled** | Changes via Amendments |
| After `Delivered` | **Locked** | Read-only, emergency unlock only |

- Prefer **warnings and confirmations** over hard blocks
- After `OrderConfirmed`, changes via **Amendments**, not by blocking work
- Emergency overrides exist (Admin only) and must be logged

---

## NON-NEGOTIABLE RULES

- Do NOT add another "store-v4.tsx" monolith
- Do NOT sync or reuse v1/v2/v3 data models in v4
- Business logic must NOT live in UI components
- Approved library versions are immutable
- Projects reference specific version IDs (pinning), never "latest"
- Official documents stored as immutable snapshots with metadata
- Never hard-delete data — use soft-delete (archive) with reason
- All transitions must be atomic (all-or-nothing with rollback on failure)

---

## SCOPE — DELIVER THIS CRITICAL FLOW FIRST

```
1) Create Project (New Build)
   └── Choose or create Client
   └── Select Boat Model (from Library)

2) Configure equipment/scope
   └── From Library Catalog + custom line items

3) Generate Quote (versioned) + export PDF

4) Transition: QUOTED → OFFER_SENT
   └── Lock quote version + store PDF snapshot

5) Transition: OFFER_SENT → ORDER_CONFIRMED
   └── Freeze configuration snapshot
   └── Generate BOM baseline
   └── Pin all library versions

6) Generate delivery docs (drafts)
   └── Owner's Manual, CE Declaration, Technical File
```

---

## FOLDER STRUCTURE

```
/src
├── /domain                    # Business logic (NO React)
│   ├── /models               # TypeScript interfaces
│   ├── /schemas              # Zod validation
│   ├── /workflow             # Status machine & transitions
│   ├── /pricing              # Pricing calculations
│   ├── /rules                # Business rules & validation
│   ├── /auth                 # Authorization
│   ├── /services             # Domain services
│   └── /audit                # Audit logging
├── /data                      # Persistence layer
│   ├── /persistence          # Adapter pattern
│   └── /repositories         # Data access
├── /v4                        # UI layer (React only)
│   ├── /screens
│   ├── /components
│   └── /state                # UI state only
└── /app/v4/page.tsx          # Entry point
```

---

## DATA MODEL

### Client

```typescript
interface Client {
  id: string;
  clientNumber: string;
  name: string;
  type: 'company' | 'private';
  email?: string;
  phone?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country: string;
  vatNumber?: string;
  status: 'active' | 'prospect' | 'inactive';
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

### Library Layer (Versioned)

```typescript
interface LibraryBoatModel {
  id: string;
  name: string;
  range: string;
  currentVersionId?: string;
}

interface BoatModelVersion {
  id: string;
  modelId: string;
  version: string;                    // Semantic: "1.0.0"
  status: 'DRAFT' | 'APPROVED' | 'DEPRECATED';
  lengthM: number;
  beamM: number;
  draftM: number;
  weightKg: number;
  maxPersons: number;
  designCategory: 'A' | 'B' | 'C' | 'D';
  availablePropulsion: PropulsionType[];
  defaultPropulsion: PropulsionType;
  basePriceExclVat: number;
  approvedAt?: string;
  approvedBy?: string;
}

interface LibraryCatalog { id; name; currentVersionId; }
interface CatalogVersion { id; catalogId; version; status; items: CatalogItem[]; }
interface LibraryDocumentTemplate { id; type: DocumentType; currentVersionId; }
interface TemplateVersion { id; templateId; version; status; content; requiredFields; }
```

### Project Layer (Instances & Snapshots)

```typescript
interface Project {
  id: string;
  projectNumber: string;
  title: string;
  type: 'NEW_BUILD' | 'REFIT' | 'MAINTENANCE';
  status: ProjectStatus;
  clientId: string;

  configuration: ProjectConfiguration;
  configurationSnapshots: ConfigurationSnapshot[];
  quotes: ProjectQuote[];
  bomSnapshots: BOMSnapshot[];
  documents: ProjectDocument[];
  amendments: ProjectAmendment[];
  libraryPins?: LibraryPins;

  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

type ProjectStatus =
  | 'DRAFT' | 'QUOTED' | 'OFFER_SENT' | 'ORDER_CONFIRMED'
  | 'IN_PRODUCTION' | 'READY_FOR_DELIVERY' | 'DELIVERED' | 'CLOSED';

interface ProjectQuote {
  id: string;
  projectId: string;
  quoteNumber: string;
  version: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED';
  lines: QuoteLine[];
  subtotalExclVat: number;
  totalInclVat: number;
  templateVersionId: string;
  pdfRef?: string;
  pdfGeneratedAt?: string;
  sentAt?: string;
}

interface ProjectAmendment {
  id: string;
  projectId: string;
  amendmentNumber: number;
  type: 'EQUIPMENT_ADD' | 'EQUIPMENT_REMOVE' | 'SCOPE_CHANGE' | 'PRICE_ADJUSTMENT';
  reason: string;
  beforeSnapshotId: string;
  afterSnapshotId: string;
  priceImpactExclVat: number;
  requestedBy: string;
  approvedBy: string;
  approvedAt: string;
}

interface LibraryPins {
  boatModelVersionId: string;
  catalogVersionId: string;
  templateVersionIds: Record<DocumentType, string>;
  pinnedAt: string;
}
```

### Audit Log

```typescript
interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'ARCHIVE' | 'STATUS_TRANSITION' | 'APPROVE' | 'AMENDMENT' | 'EMERGENCY_UNLOCK';
  entityType: string;
  entityId: string;
  description: string;
  before?: object;
  after?: object;
}
```

---

## VERSION NUMBERING

| Entity | Format | Example |
|--------|--------|---------|
| Library versions | Semantic | `1.0.0` → `1.1.0` |
| Catalog versions | Year.Seq | `2025.1` → `2025.2` |
| Project quotes | Sequential | `v1` → `v2` → `v3` |
| Config snapshots | Sequential | `#1` → `#2` |
| Amendments | Sequential | `#1` → `#2` |

---

## WORKFLOW

```
DRAFT → QUOTED → OFFER_SENT → ORDER_CONFIRMED → IN_PRODUCTION → READY_FOR_DELIVERY → DELIVERED → CLOSED
```

### Milestone Effects

| Status | Effects |
|--------|---------|
| `OFFER_SENT` | Lock quote, store PDF snapshot, audit log |
| `ORDER_CONFIRMED` | Freeze config snapshot, generate BOM, pin library versions |
| `DELIVERED` | Finalize all docs, require checklist, lock project |

### Atomic Transitions

All transitions must be atomic. On failure: rollback to previous state, log error in audit.

---

## AMENDMENTS AFTER FREEZE

After `ORDER_CONFIRMED`:
- Frozen snapshots cannot be edited directly
- Changes happen via Amendments:
  - Record reason, approver, before/after snapshots
  - Create new configuration snapshot
  - Regenerate BOM if needed
- Emergency unlock exists (Admin only) with audit logging

---

## AUTHORIZATION

| Action | Admin | Manager | Sales | Production | Viewer |
|--------|-------|---------|-------|------------|--------|
| Approve library version | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create project | ✅ | ✅ | ✅ | ❌ | ❌ |
| Confirm order | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark delivered | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve amendment | ✅ | ✅ | ❌ | ❌ | ❌ |
| Emergency unlock | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add tasks/time | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## PERSISTENCE ADAPTER

```typescript
interface PersistenceAdapter {
  save<T>(namespace: string, entity: T): Promise<void>;
  getById<T>(namespace: string, id: string): Promise<T | null>;
  getAll<T>(namespace: string): Promise<T[]>;
  query<T>(namespace: string, filter: QueryFilter): Promise<T[]>;
  delete(namespace: string, id: string): Promise<void>;
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>;
}
```

LocalStorageAdapter now, NeonAdapter later — domain logic unchanged.

---

## UI REQUIREMENTS (MINIMAL)

1. **Project List Screen** — Table with filters, create button
2. **Project Detail Screen** — Tabs: Overview | Configuration | Quotes | BOM | Documents | History

---

## TESTS (REQUIRED)

1. Workflow transitions + milestone effects
2. Quote immutability after OFFER_SENT
3. Freeze snapshot + BOM baseline at ORDER_CONFIRMED
4. Amendment creates new snapshot without mutating history
5. Authorization enforcement

---

## SUCCESS CRITERIA

- ✅ `/v4` runs independently with no legacy stores
- ✅ Project is the hub; Library provides versioned templates
- ✅ Projects pin specific library versions, never "latest"
- ✅ Historical projects are stable and reproducible
- ✅ Flexible before OrderConfirmed, controlled after, locked at Delivered
- ✅ Amendments enable post-freeze changes with full audit trail
- ✅ All business logic in `/domain`, not in React components
- ✅ Persistence adapter allows future Neon swap
- ✅ Audit log captures all significant events
- ✅ Authorization is centralized and enforced

---

## IMPLEMENTATION ORDER

**Week 1:** Foundation — folder structure, models, schemas, persistence adapter, repositories, audit service

**Week 2:** Core Workflow — status transitions, milestone effects, quote service, configuration freeze, tests

**Week 3:** Library & Documents — boat models, catalog, templates with versioning, document generation, version pinning

**Week 4:** UI + Amendments — project list, project detail tabs, amendment service, authorization in UI

**Week 5:** Polish — error handling, responsive UI, test coverage, documentation

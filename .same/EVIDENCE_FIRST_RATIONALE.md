# Evidence-First Compliance Architecture - Rationale

## Mental Model

**Evidence first, certification as interpretation.**

The Technical Dossier is the PRIMARY compliance surface. Certification Packs are INTERPRETIVE VIEWS (lenses) on the same evidence - not separate workflows.

## What This Means

### Technical Dossier = Canonical Evidence
- Always visible as the main content
- Contains the 10 fixed sections per RCD 2013/53/EU
- Files, artifacts, and references are filed here
- This is the source of truth for compliance evidence

### Certification Packs = Verification Lenses
- Contextual overlays that interpret evidence
- Show as highlights, badges, and status indicators
- Do NOT replace the dossier view
- Do NOT imply a required order or workflow

## UI Principles Applied

### 1. No Workflow Implied
- Removed progress bars suggesting "completion"
- No "next steps" or sequential flow
- Evidence can be added at any time
- Certification status is derived, not dictated

### 2. Lens Selector (Not Tab Replacement)
- "View as: Evidence | CE | ES-TRIN | ..." selector
- Changing lens changes **rendering** only, not data
- Evidence view = default, shows all cert pack references
- Cert lens view = same dossier, with that pack's checks highlighted

### 3. Certification as Overlay
- When viewing through a lens (e.g., CE):
  - Same Technical Dossier sections/subheadings shown
  - Left border highlights sections with linked checks
  - Status badges show passed/todo/failed for that pack
  - Click badges to see linked checklist items
- When viewing as Evidence:
  - Subtle badges show which packs reference each section
  - No highlighting, no status emphasis

### 4. Single Surface, Multiple Perspectives
- One main panel (EvidenceFirstPanel) serves all views
- Certification pack "detail views" are dialogs/modals, not separate screens
- All navigation stays within the dossier context

## Architectural Constraints Respected

| Constraint | How It's Maintained |
|-----------|---------------------|
| No wizard | No step-by-step flows |
| No new domain models | Using existing structures |
| No new persistence | All lens data derived at render |
| No background sync | Computed on each render |
| Single write path | Evidence edits through dossier services |

## Lens Index Derivation

All certification-to-dossier relationships are computed at render time:

```typescript
// Build lens index: Map<sectionId, SectionLensContext>
const sectionLensIndex = buildSectionLensIndex(project, lensMode);

// Each section context contains:
interface SectionLensContext {
  checklistItems: LensChecklistItem[];
  stats: { passed, failed, inProgress, notStarted, na, total };
  subheadings: Map<string, SubheadingLensContext>;
  isHighlighted: boolean;
}
```

No state duplication. No cached relationships. Derived on every render from existing checklist item `dossierSectionId` and `dossierSubheadingId` fields.

## Benefits

1. **Unambiguous Primary Surface**: Users always know where evidence lives
2. **No Parallel Workflows**: Certification packs don't feel like "another place to work"
3. **Calm UI**: Subtle overlays, not competing attention
4. **Explicit Relationships**: Visible badges show what references what
5. **Flexible Workflow**: Work on evidence anytime, verify through any lens

## Component Structure

```
ComplianceTab
├── ComplianceScopePanel (inputs)
├── EvidenceFirstPanel (PRIMARY - with lens selector)
│   ├── Lens Selector ("View as: Evidence | CE | ...")
│   ├── Summary Stats (informational, no progress bars)
│   ├── Sections with lens overlays
│   └── Create Lens CTA (when no packs exist)
└── DeliverablesPanel (outputs)
```

## Deep Linking (v305)

Deep linking enables navigation directly to specific dossier sections/subheadings from anywhere in the application.

### URL Scheme

```
/projects/:id?tab=compliance&dossierSection=<section-id>&subheading=<subheading-id>&lens=<CE|ES_TRIN|LLOYDS|OTHER>
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `tab` | Yes | Always `compliance` for dossier navigation |
| `dossierSection` | Yes | Technical File section ID (e.g., `electrical-systems`) |
| `subheading` | No | Specific subheading ID within the section |
| `lens` | No | Certification lens to activate (`CE`, `ES_TRIN`, `LLOYDS`, `OTHER`) |

### Behavior

1. **Auto-expand**: Target section (and subheading if specified) expands automatically
2. **Smooth scroll**: View scrolls to bring target into center of viewport
3. **Subtle highlight**: 3-second teal ring highlights the target (calm UI)
4. **URL cleanup**: Deep link params removed from URL after navigation (keeps history clean)

### Helper Functions

```typescript
// Navigate to a dossier location
navigateToDossierSection(projectId, sectionId, subheadingId?, lens?);

// Build URL for linking
buildDossierDeepLinkUrl(projectId, sectionId, subheadingId?, lens?);

// Parse incoming params
parseDossierDeepLinkParams(searchParams);
```

### Link Sources

Components that can trigger deep link navigation:
- `EvidenceHint` - Shows evidence location in checklist items
- `DossierSectionHint` - Shows dossier section for compliance fields
- Certification pack badges (future: navigate from cert pack to dossier)

### No State Mutations

Deep linking is purely UI behavior:
- Read-only URL parsing
- Local component state for expand/highlight
- No domain model changes
- No persistence writes

---
*Implemented: January 2026 | Version: v305*

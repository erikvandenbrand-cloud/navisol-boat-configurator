# Information Linking Enhancement - Rationale

## Goal
Improve perceived flow by making relationships between Model data, Project inputs, Technical Dossier (evidence), and Certification Packs visible in the UI.

## What Was Implemented

### 1. Compliance Inputs - Source Hints
- Each compliance field now shows where its evidence is stored:
  - "Evidence in: Technical Dossier → Section X"
- Fields like `modelName`, `win`, `designCategory`, etc. show which dossier section holds their supporting evidence.
- **No new persistence** - derived from existing `COMPLIANCE_FIELD_DOSSIER_MAP`.

### 2. Technical Dossier - Certification Pack References
- Each section header shows aggregated stats from referencing cert packs:
  - "Referenced by X packs: ✓ Y passed / ○ Z todo / ✗ W failed"
- Each subheading shows compact cert pack badges (CE, ES-TRIN, LLOYDS) with pass counts.
- Clicking badges could navigate to the cert pack (navigation prepared but not yet wired to global state).
- **No state duplication** - counts computed at render time from existing checklist items.

### 3. Certification Pack Checklist Items - Evidence Location
- Each checklist item clearly shows its linked evidence:
  - "Evidence: Section Title → Subheading Title (N files)"
- Clicking navigates to the dossier subheading.
- Missing/archived links show warning indicator.
- **No mutations** - all read-only annotations.

## Alignment with v4 Principles

| Principle | How This Aligns |
|-----------|-----------------|
| **Explicit > Implicit** | Relationships that were previously hidden (requiring navigation) are now visible inline. Users see context without clicking away. |
| **Calm UI** | Small, unobtrusive hints that provide context on hover. No modal dialogs, no notifications, no interruptions. |
| **Single Write Path** | All linking is read-only. No new mutations, no auto-sync, no background jobs. Data flows only through existing services. |
| **No Wizard** | No step-by-step flows added. Users can still manually link/unlink as before. |
| **No Auto-Sync** | Stats are computed at render time, not stored. No background reconciliation needed. |

## New Files
- `/src/domain/utils/information-linking.ts` - Pure TypeScript helpers, no React dependencies
- `/src/v4/components/SourceHint.tsx` - FieldSource and EvidenceHint UI components
- `/src/v4/components/CertPackReferences.tsx` - CertPackReferences and CertStatsSummary components

## Modified Files
- `ComplianceInputsSection.tsx` - InfoField now shows dossier evidence hints
- `TechnicalDossierSection.tsx` - Section headers show cert pack stats, subheadings show cert pack badges
- `ComplianceTab.tsx` - ChecklistItemRow uses EvidenceHint for clearer evidence display

## Constraints Respected
- ✅ No wizard
- ✅ No auto-sync
- ✅ No background jobs
- ✅ No state mutations except existing explicit actions
- ✅ Single write path unchanged

## Future Enhancements (Not Implemented)
1. Global navigation state for deep linking across tabs
2. Highlighting target subheading when navigating from cert pack
3. Boat Model defaults comparison (requires Library data access)

---
*Implemented: January 2026 | Version: v303*

# Equipment List Feature Documentation

## Overview

The Equipment List feature generates **non-priced** equipment lists from project configuration.
These lists are informational and can be included with quotes for client reference.

**Contract Compliance:**
- ✅ NO pricing fields (no unitPrice, lineTotal, subtotal, VAT, discounts)
- ✅ Generated from configuration (or configuration snapshot)
- ✅ Project-scoped (with optional unit scope for multi-unit projects)
- ✅ Brand-aware output
- ✅ Can be linked to quotes
- ✅ No alerts/notifications
- ✅ Soft flows only (nothing blocks on this)
- ✅ Does NOT use deprecated Library "Equipment Catalog"

---

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `src/domain/models/equipment-list.ts` | Domain model for equipment lists |
| `src/domain/services/EquipmentListService.ts` | Service for generating and managing equipment lists |
| `src/v4/components/EquipmentListViewer.tsx` | Viewer component for displaying/printing lists |
| `src/v4/components/GenerateEquipmentListDialog.tsx` | Dialog for generating new equipment lists |

### Modified Files

| File | Changes |
|------|---------|
| `src/domain/models/project.ts` | Added `equipmentLists` field to Project, `equipmentListRef` to ProjectQuote |
| `src/domain/models/index.ts` | Added export for equipment-list module |
| `src/domain/services/index.ts` | Added export for EquipmentListService |
| `src/v4/screens/ProjectDetailScreen.tsx` | Added Equipment List section in Documents tab |

---

## Data Model

### EquipmentListDocument

```typescript
interface EquipmentListDocument {
  id: string;
  projectId: string;
  unitId?: string;                    // For multi-unit projects
  configurationSnapshotId?: string;   // For reproducibility
  brandKey: string;                   // Brand template used
  version: number;

  // Project metadata (copied at generation)
  projectNumber: string;
  projectTitle: string;
  clientName?: string;
  unitLabel?: string;
  boatModelName?: string;
  propulsionType?: string;

  // Content (NO PRICING)
  sections: EquipmentListSection[];
  totalItemCount: number;

  // Audit
  generatedAt: string;
  generatedBy: string;
  notes?: string;
}
```

### EquipmentListItem (NO PRICING)

```typescript
interface EquipmentListItem {
  id: string;
  configurationItemId: string;  // Traceability
  category: string;
  subcategory?: string;
  articleNumber?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  notes?: string;
  ceRelevant?: boolean;
  safetyCritical?: boolean;
  sortOrder: number;
  // NO unitPriceExclVat
  // NO lineTotalExclVat
}
```

---

## Generation Flow

### Where generation happens

`EquipmentListService.generate()` in `src/domain/services/EquipmentListService.ts`

### How it maps from configuration to list items

1. Load project and configuration (current or snapshot)
2. Filter to `isIncluded` items only
3. Group items by `category`
4. Map each `ConfigurationItem` → `EquipmentListItem`:
   - Copies: id, category, subcategory, articleNumber, name, description, quantity, unit, ceRelevant, safetyCritical
   - **STRIPS**: unitPriceExclVat, lineTotalExclVat (and all pricing)
5. Sort sections alphabetically, items by sortOrder then name
6. Create `EquipmentListDocument` with sections

### How brand template selection works

1. User selects brand in `GenerateEquipmentListDialog`
2. Available brands defined in `DEFAULT_EQUIPMENT_LIST_BRANDS`:
   - `default` - Standard Navisol branding
   - `premium` - Navisol Yacht Division
   - `nautique` - Nautique Marine Solutions
3. Brand affects visual styling (colors, company name, footer text)
4. Brand key stored in `document.brandKey`
5. `EquipmentListViewer` uses brand for rendering

### How it attaches to quotes

1. `ProjectQuote.equipmentListRef` holds reference:
   ```typescript
   interface QuoteEquipmentListRef {
     equipmentListId: string;
     includeAs: 'attachment' | 'link';
     linkedAt: string;
   }
   ```
2. Use `EquipmentListService.linkToQuote()` to link
3. Use `EquipmentListService.unlinkFromQuote()` to unlink

---

## UI Location

**Documents Tab** in Project Detail Screen:
1. Click "Generate" button
2. Select brand, optional unit, optional snapshot
3. View generated lists in the Equipment List card
4. Click "View" to see full printable document
5. Use Print/Download buttons in viewer

---

## Configuration Snapshots

For reproducibility, equipment lists can reference a configuration snapshot:
- `configurationSnapshotId` links to a frozen configuration state
- If omitted, uses current (live) configuration
- Useful for generating lists tied to ORDER_CONFIRMED milestone

---

## Multi-Unit Projects

For serial production (multiple boats):
- `unitId` scopes the list to a specific boat
- `unitLabel` shows the boat label (e.g., "Boat 01")
- Leave `unitId` empty for project-wide list

---

## Output Formats

1. **On-screen viewer** - Interactive with brand styling
2. **Print** - Uses browser print with print-friendly CSS
3. **Download** - Generates standalone HTML file with embedded styles

# Navisol v4 — Manual Regression Test Checklist

**Version:** v318
**Estimated Time:** ~60 minutes
**Purpose:** Verify all core features work correctly after recent improvements.
**Constraints:** No new features, no automation, no background sync.

---

## A) Smoke Tests (10–15 min)

### A1. Application Boot
| # | Step | Expected |
|---|------|----------|
| 1 | Open application URL | Login screen displays with demo accounts |
| 2 | Click "Use" on Admin account | Dashboard loads, sidebar visible |
| 3 | Verify sidebar sections visible | Projects, Portfolio, Library, System sections present |

### A2. Primary Navigation Routes
| # | Step | Expected |
|---|------|----------|
| 4 | Click "All Projects" | Project list screen loads |
| 5 | Click "Clients" | Client list screen loads |
| 6 | Click "WIN Register" | WIN register screen loads |
| 7 | Click "Timesheets" | Timesheets screen loads |
| 8 | Click "Shopfloor Board" | Shopfloor board loads |
| 9 | Click "Resource Planner" | Resource planner loads |
| 10 | Click "Project Planner" | Project planner loads |
| 11 | Click "Production" | Production kanban loads |
| 12 | Click "Shop Floor Orders" | Shop floor orders screen loads |
| 13 | Click "Library" | Library screen loads with tabs (Articles, Models, Standards, Work Instructions) |
| 14 | Click "Staff" | Staff screen loads |
| 15 | Click "Settings" | Settings screen loads |

### A3. Project Detail Access
| # | Step | Expected |
|---|------|----------|
| 16 | Navigate to All Projects | List appears |
| 17 | Click any project row | Project detail screen loads |
| 18 | Verify tabs visible | Overview, Compliance, BOM, Production, Orders, Documents, Quote tabs present |
| 19 | Click browser Back button | Returns to project list |

---

## B) Feature Regression Tests

---

### B1. Projects & Boat Model Linking

**Preconditions:** At least one Boat Model exists in Library.

| # | Step | Expected |
|---|------|----------|
| 1 | Navigate to All Projects | Project list loads |
| 2 | Click "+ New Project" | New project dialog opens |
| 3 | Fill required fields (title, number) | Fields accept input |
| 4 | Select a Boat Model from dropdown | Model name appears in field |
| 5 | Save project | Project created, redirects to detail |
| 6 | Verify Boat Model shown in Overview | Model name displayed in project header/info section |

**Edge Cases:**
- Create project WITHOUT Boat Model → should be allowed, Boat Model field empty
- Change Boat Model after creation → verify UI allows edit (if implemented)

---

### B2. Vessel Identity Init-Only Copy

**Preconditions:** Project exists with Boat Model selected. Boat Model has specifications (LOA, beam, draft, etc.).

#### B2.1 First-Time Init
| # | Step | Expected |
|---|------|----------|
| 1 | Open project detail → Compliance tab | Vessel Identity section visible |
| 2 | Click "Initialize from Boat Model" button | Confirmation dialog appears OR fields populate |
| 3 | Confirm action | Vessel Identity fields populate from Boat Model specs |
| 4 | Verify source hints show "Model" | Each initialized field shows "Model" source hint |
| 5 | Verify initialization metadata | "Initialized from {Model Name} on {date}" shown |

#### B2.2 Re-initialize Confirmation
| # | Step | Expected |
|---|------|----------|
| 6 | Edit one field (e.g., LOA) manually | Field updates, source hint changes to "Edited" |
| 7 | Click "Initialize from Boat Model" again | Confirmation dialog warns about overwrite |
| 8 | Cancel | No changes occur |
| 9 | Click again, confirm | Fields re-populated from Model |
| 10 | Verify manual edits were overwritten | Previously edited field now shows Model value |

#### B2.3 Preserved Fields Invariants
| # | Step | Expected |
|---|------|----------|
| 11 | Enter WIN number in Vessel Identity | WIN saved |
| 12 | Enter Year in Vessel Identity | Year saved |
| 13 | Enter Intended Use | Intended Use saved |
| 14 | Re-initialize from Boat Model | WIN, Year, Intended Use PRESERVED (not overwritten) |

#### B2.4 No Background Sync
| # | Step | Expected |
|---|------|----------|
| 15 | Note current Vessel Identity values | Values recorded |
| 16 | Go to Library → Boat Models | Model list loads |
| 17 | Edit the Boat Model specs (e.g., change LOA) | Model updated |
| 18 | Return to project Vessel Identity | Values UNCHANGED (no auto-sync) |

**Edge Cases:**
- Project with no Boat Model → "Initialize from Boat Model" button disabled or hidden
- Boat Model with empty specs → Empty fields initialized (no error)

---

### B3. Compliance Checklist ↔ Dossier UX

**Preconditions:** Project has Technical Dossier sections. At least one checklist item has dossierSectionId + dossierSubheadingId mapping.

#### B3.1 Open Dossier Location Navigation
| # | Step | Expected |
|---|------|----------|
| 1 | Open project → Compliance tab | Evidence-First panel visible |
| 2 | Open a Certification Pack checklist dialog | Checklist items listed |
| 3 | Find item with "Open Dossier Location" button | Button visible |
| 4 | Click "Open Dossier Location" | Dossier section expands, scrolls to subheading |
| 5 | Verify highlight effect | Target subheading shows brief highlight ring (~3 sec) |
| 6 | Check URL | Query params include dossierSection, subheading |

#### B3.2 Evidence Count Accuracy
| # | Step | Expected |
|---|------|----------|
| 7 | Note evidence count on checklist item | "Evidence: N files" displayed |
| 8 | Navigate to that exact dossier subheading | File count matches checklist hint |
| 9 | Upload a file to subheading | File added |
| 10 | Return to checklist | Evidence count incremented by 1 |

#### B3.3 No Dossier Link Indicator
| # | Step | Expected |
|---|------|----------|
| 11 | Find checklist item without dossier mapping | Item exists |
| 12 | Verify "Open Dossier Location" absent | Button not shown |
| 13 | Verify "No dossier link" indicator | Indicator or empty hint shown |

#### B3.4 File Presence ≠ Compliance Pass
| # | Step | Expected |
|---|------|----------|
| 14 | Note a checklist item status (e.g., TODO) | Status recorded |
| 15 | Upload file to linked dossier subheading | File added |
| 16 | Return to checklist | Status UNCHANGED (still TODO) |
| 17 | Manually set item to PASSED | Status updates to PASSED |
| 18 | Remove all files from dossier subheading | Files removed |
| 19 | Check checklist status | Still PASSED (no auto-revert) |

**Edge Cases:**
- Deep link to non-existent section → graceful handling (no crash)
- Checklist with 0 items → empty state shown

---

### B4. Technical Dossier File Handling

**Preconditions:** Project exists with Technical Dossier structure.

| # | Step | Expected |
|---|------|----------|
| 1 | Open project → Compliance tab → Dossier section | Sections visible |
| 2 | Expand a section with subheadings | Subheadings listed |
| 3 | Click upload button on a subheading | File picker opens |
| 4 | Select and upload a file | File appears in list, count updates |
| 5 | Verify evidence count badge updates | Badge shows new count |
| 6 | Click remove/delete on file | Confirmation dialog |
| 7 | Confirm deletion | File removed, count decrements |

**Edge Cases:**
- Upload very large file → verify handling (success or size limit message)
- Upload same file twice → should be allowed (or show duplicate warning)

---

### B5. Standards Library + Apply Suggested Standards

**Preconditions:** Standards Library exists with seed data.

#### B5.1 CRUD Standards
| # | Step | Expected |
|---|------|----------|
| 1 | Go to Library → Standards tab | Standards list loads |
| 2 | Click "Add Standard" | Dialog opens |
| 3 | Enter code, title, description, sourceNote | Fields populated |
| 4 | Save | Standard created, appears in list |
| 5 | Click Edit on a standard | Edit dialog opens |
| 6 | Change title, save | Title updated in list |
| 7 | Archive a standard (if supported) | Standard marked archived or removed from active list |

#### B5.2 Assign Suggested Standards to Boat Model
| # | Step | Expected |
|---|------|----------|
| 8 | Go to Library → Boat Models | Models list loads |
| 9 | Edit a Boat Model | Dialog opens |
| 10 | Expand "Suggested Standards" section | Multi-select or list visible |
| 11 | Select 2-3 standards | Standards highlighted/selected |
| 12 | Save Boat Model | Changes saved |
| 13 | Re-open Boat Model | Suggested standards persisted |

#### B5.3 Apply Suggested Standards to Project
| # | Step | Expected |
|---|------|----------|
| 14 | Open project linked to that Boat Model | Project detail loads |
| 15 | Navigate to Compliance → Applied Standards section | Section visible |
| 16 | Verify "Model suggestions available" banner | Banner shown (if unapplied suggestions exist) |
| 17 | Click "Apply suggested from Boat Model" | Preview dialog shows suggested standards |
| 18 | Confirm apply | Standards added to project's applied standards |
| 19 | Verify origin badge = "MODEL_SUGGESTED" | Badge displayed on applied standards |

#### B5.4 No Auto-Removal + Existing Standards Remain
| # | Step | Expected |
|---|------|----------|
| 20 | Add a manual standard to project | Standard added with "MANUAL" origin |
| 21 | Apply model suggestions again | Manual standard NOT removed |
| 22 | Add from Library directly | Standard added with "LIBRARY" origin |
| 23 | Verify all three origins coexist | MANUAL, LIBRARY, MODEL_SUGGESTED all visible |

#### B5.5 No Sync After Boat Model Changes
| # | Step | Expected |
|---|------|----------|
| 24 | Note project's applied standards | Standards recorded |
| 25 | Go to Library → edit Boat Model's suggested standards | Add or remove a standard |
| 26 | Return to project | Applied standards UNCHANGED |

**Edge Cases:**
- Boat Model with no suggested standards → "Apply suggested" button disabled or hidden
- Apply same standard twice → duplicate prevention or allowed with warning

---

### B6. Articles & Supplier Cost

**Preconditions:** Article Library exists.

#### B6.1 Set Supplier Cost in Library
| # | Step | Expected |
|---|------|----------|
| 1 | Go to Library → Articles tab | Articles list loads |
| 2 | Click "Add Article" or edit existing | Dialog opens |
| 3 | Enter supplierCostExclVat (e.g., €50.00) | Field accepts value |
| 4 | Enter supplierCostSourceNote (optional) | Field accepts text |
| 5 | Save | Article saved |
| 6 | Verify Supplier Cost column in list | €50.00 displayed |

#### B6.2 BOM Lines Use Supplier Cost
| # | Step | Expected |
|---|------|----------|
| 7 | Open project → BOM tab | BOM list loads |
| 8 | Add line using Article with supplierCostExclVat | Line added |
| 9 | Verify cost badge = "LIBRARY" | Badge shows "LIBRARY" |
| 10 | Verify cost value matches Article | Cost = €50.00 |

#### B6.3 Fallback Estimation
| # | Step | Expected |
|---|------|----------|
| 11 | Add BOM line with Article lacking supplierCost | Line added |
| 12 | Verify cost badge = "ESTIMATED" | Badge shows "ESTIMATED" |

#### B6.4 No Retroactive Library Changes
| # | Step | Expected |
|---|------|----------|
| 13 | Note existing BOM line cost (e.g., €50.00) | Value recorded |
| 14 | Go to Library → edit that Article's supplierCost to €75.00 | Article updated |
| 15 | Return to project BOM | Cost STILL €50.00 (not €75.00) |

**Edge Cases:**
- Article with supplierCost = 0 → treated as "has cost" or falls back?
- Delete article from library → BOM line orphaned (verify no crash)

---

### B7. BOM CSV Export

**Preconditions:** Project has BOM with multiple lines including LIBRARY and ESTIMATED sources.

| # | Step | Expected |
|---|------|----------|
| 1 | Open project → BOM tab | BOM loads |
| 2 | Click "Export CSV" button | CSV file downloads |
| 3 | Open CSV in spreadsheet | Data loads |
| 4 | Verify columns include: costSource, supplierCost | Columns present |
| 5 | Verify LIBRARY rows show "LIBRARY" in costSource | Matches UI |
| 6 | Verify ESTIMATED rows show "ESTIMATED" in costSource | Matches UI |
| 7 | Verify cost values match UI | No discrepancies |

**Edge Cases:**
- Empty BOM → CSV with headers only
- BOM with special characters in descriptions → properly escaped

---

### B8. AI Suggest (Scoped + Governance)

**Preconditions:** User exists with aiEnabled = false. Admin user available.

#### B8.1 AI Hidden for Disabled Users
| # | Step | Expected |
|---|------|----------|
| 1 | Login as user with aiEnabled = false | Dashboard loads |
| 2 | Open project → Compliance → Owner's Manual section | Section loads |
| 3 | Look for "Suggest" button with sparkle icon | NOT visible |
| 4 | Open any other text sections | No AI buttons anywhere |

#### B8.2 Enable AI for User
| # | Step | Expected |
|---|------|----------|
| 5 | Login as Admin | Dashboard loads |
| 6 | Go to Staff screen | User list loads |
| 7 | Edit test user, toggle aiEnabled = true | Setting changed |
| 8 | (Alternative: if no UI, modify user in dev tools/console) | aiEnabled = true |
| 9 | Login as test user | Dashboard loads |
| 10 | Open Owner's Manual section | "Suggest" button NOW visible |

#### B8.3 Suggest Produces Preview, Requires Accept
| # | Step | Expected |
|---|------|----------|
| 11 | Click "Suggest" button | Dialog opens with AI-generated content |
| 12 | Verify preview text displayed | Content shown in preview area |
| 13 | Verify "Accept" and "Dismiss" buttons | Both buttons present |
| 14 | Click "Dismiss" | Dialog closes, NO content inserted |
| 15 | Click "Suggest" again | New suggestion generated |
| 16 | Click "Accept" | Content inserted into field/block |

#### B8.4 No Auto-Insert
| # | Step | Expected |
|---|------|----------|
| 17 | Note current content before clicking Suggest | Content recorded |
| 18 | Click Suggest, wait for preview | Preview shows |
| 19 | Close dialog (X button) | Original content UNCHANGED |

#### B8.5 No AI on Spec Fields
| # | Step | Expected |
|---|------|----------|
| 20 | Open Vessel Identity dialog | Dialog opens |
| 21 | Check intendedUse field | NO "Suggest" button |
| 22 | Check specialConditions field | NO "Suggest" button |
| 23 | Check all numeric/spec fields | NO AI buttons on any |

**Edge Cases:**
- AI service timeout → graceful error message
- Accept then undo → content reverts (if undo supported)

---

### B9. Shop Floor Orders (Operational)

**Preconditions:** None (can start fresh).

#### B9.1 Create General Order
| # | Step | Expected |
|---|------|----------|
| 1 | Navigate to Shop Floor Orders | Screen loads |
| 2 | Use Quick Add: enter "Test general item" | Input accepted |
| 3 | Click "Add" | Item created with status NOT_ORDERED |
| 4 | Verify in "General" tab | Item appears |
| 5 | Verify projectId = null/empty | No project linked |

#### B9.2 Create Project Order
| # | Step | Expected |
|---|------|----------|
| 6 | Open project detail → Orders tab | ShopFloorOrdersTab loads |
| 7 | Click "Add Item" | Dialog opens |
| 8 | Enter description, quantity, supplier | Fields populated |
| 9 | Save | Item created for this project |
| 10 | Verify in portfolio Shop Floor Orders → "By Project" | Item appears under project |

#### B9.3 Status Transitions
| # | Step | Expected |
|---|------|----------|
| 11 | Find NOT_ORDERED item | Status badge = "Not Ordered" |
| 12 | Click "Mark Ordered" | Status changes to ORDERED |
| 13 | Verify orderedAt timestamp | Timestamp displayed |
| 14 | Click "Mark Received" | Status changes to RECEIVED |
| 15 | Verify receivedAt timestamp | Timestamp displayed |
| 16 | Verify RECEIVED item has no further action buttons | Only view/info available |

#### B9.4 Revert ORDERED → NOT_ORDERED
| # | Step | Expected |
|---|------|----------|
| 17 | Create new item, mark as ORDERED | Status = ORDERED |
| 18 | Click "⋮" menu → "Revert to Not Ordered" | Status reverts to NOT_ORDERED |
| 19 | Verify orderedAt cleared | Timestamp removed |

#### B9.5 Deletion Rules
| # | Step | Expected |
|---|------|----------|
| 20 | On NOT_ORDERED item, click Delete | Confirmation dialog |
| 21 | Confirm | Item deleted |
| 22 | On ORDERED item, look for Delete | Delete option NOT available |
| 23 | On RECEIVED item, look for Delete | Delete option NOT available |

#### B9.6 Supplier/Priority Are Inert
| # | Step | Expected |
|---|------|----------|
| 24 | Create item with priority = URGENT | Item created |
| 25 | Verify priority badge styling | Neutral slate color (NO red/amber urgency color) |
| 26 | Create item with supplier "Test Supplier" | Item created |
| 27 | Verify no autocomplete or suggestions | Free text only |

#### B9.7 No BOM Impact
| # | Step | Expected |
|---|------|----------|
| 28 | Note project BOM line count | Count recorded |
| 29 | Add shop floor order to project | Order created |
| 30 | Check BOM | Count UNCHANGED, no new lines |

**Edge Cases:**
- Delete all orders → empty state displayed
- Very long description → truncated in list, full in detail
- Filter by status + search simultaneously → both filters apply

---

## C) Invariants Checklist

Quick sanity checks for future regressions. Each should ALWAYS be true.

| # | Invariant | Verification |
|---|-----------|--------------|
| 1 | **No background sync** | Edit Library Article → project BOM unchanged |
| 2 | **No background sync** | Edit Boat Model specs → project Vessel Identity unchanged |
| 3 | **No background sync** | Edit Boat Model suggested standards → project applied standards unchanged |
| 4 | **Manual status only** | Shop Floor Order status requires explicit button click |
| 5 | **Manual status only** | Compliance checklist PASSED/FAILED requires explicit user action |
| 6 | **Evidence ≠ compliance pass** | Upload file to dossier → checklist status unchanged |
| 7 | **Evidence ≠ compliance pass** | Remove all files → checklist PASSED status remains |
| 8 | **One-time copy is explicit** | Vessel Identity init requires user confirmation |
| 9 | **One-time copy is explicit** | Apply suggested standards requires preview + confirm |
| 10 | **AI is gated** | aiEnabled=false users see no AI UI |
| 11 | **AI is suggestion-only** | AI content requires Accept to insert |
| 12 | **AI not persisted as truth** | No aiAssisted badges on saved content |
| 13 | **No ERP features** | Shop Floor Orders have no inventory/accounting fields |
| 14 | **No urgency colors** | Priority badges use neutral slate styling |
| 15 | **Audit logs invisible** | No audit history UI exposed to users |

---

## Test Execution Log

| Tester | Date | Sections Completed | Issues Found |
|--------|------|-------------------|--------------|
| | | | |

---

**End of Checklist**

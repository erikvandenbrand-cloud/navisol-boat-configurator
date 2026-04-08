# NAVISOL v2.0 - Big Bang Rebuild Specification

**Status**: Ready for implementation
**Approach**: Fresh start (no data migration)
**Models**: Real Eagle Boats lineup from eagleboats.nl

---

## 1. Core Architecture

### Project-Centric Design
- **Project** is the primary entity (not boat, not client)
- Vessel is optional (can create project before vessel exists)
- One vessel can have multiple projects over its lifetime

### Project Types
| Type | Status Flow | Build Mode |
|------|-------------|------------|
| NEW_BUILD | DRAFT → QUOTED → ACCEPTED → ENGINEERING → PRODUCTION → QA → DELIVERED → CLOSED | EXISTING_MODEL or CUSTOM_BOAT |
| REFIT | INTAKE → SCOPED → QUOTED → ACCEPTED → IN_PROGRESS → COMPLETE → CLOSED | N/A |
| MAINTENANCE | OPEN → IN_PROGRESS → COMPLETE → CLOSED | N/A |

### Equipment List = Contractual Truth
- Customer sees: Equipment List (frozen on quote acceptance)
- Production sees: BOM/Parts List (internal, derived from mapping)
- Clear separation between customer-facing and internal data

---

## 2. Navigation Structure

```
📊 Dashboard
   └── Dashboard

👥 CRM
   ├── Clients
   └── Contacts

📦 Catalog
   ├── Boat Models (Eagle 525T, 25TS, 28TS, 32TS, C550, C570, C720, C999, 28SG, Hybruut 28)
   ├── Parts Database
   ├── Equipment Templates
   └── Operating Procedures

📋 Projects
   ├── All Projects
   ├── New Builds
   ├── Refits
   └── Maintenance

📅 Planning
   ├── Production Calendar
   ├── Tasks
   └── Time Tracking

💰 Commercial
   ├── Quotations
   └── Cost Analysis

📄 Documentation
   ├── Documents Library
   ├── CE & Technical
   ├── Vessel Photos
   └── Checklist Templates

⚙️ Admin
   ├── Users & Roles
   └── Settings
```

---

## 3. Eagle Boats Models (from eagleboats.nl)

### TS Series - Flagship Electric
| Model | Length | Persons | Base Price | Propulsion |
|-------|--------|---------|------------|------------|
| Eagle 525T | 5.25m | 5 | €45,000 | Electric |
| Eagle 25TS ⭐ | 7.50m | 8 | €89,000 | Electric |
| Eagle 28TS | 8.50m | 10 | €125,000 | Electric/Hybrid |
| Eagle 32TS | 9.70m | 12 | €185,000 | Electric/Hybrid |

⭐ HISWA Electric Boat of the Year 2025

### Classic Series - Dutch Sloep
| Model | Length | Persons | Base Price | Propulsion |
|-------|--------|---------|------------|------------|
| Eagle C550 | 5.50m | 6 | €38,000 | Electric |
| Eagle C570 | 5.70m | 6 | €42,000 | Electric |
| Eagle C720 | 7.20m | 8 | €68,000 | Electric |
| Eagle C999 | 9.99m | 12 | €145,000 | Electric/Hybrid |

### SG Series - Sport Grand
| Model | Length | Persons | Base Price | Propulsion |
|-------|--------|---------|------------|------------|
| Eagle 28SG | 8.50m | 10 | €115,000 | Electric/Hybrid |

### Hybruut Series - Hybrid
| Model | Length | Persons | Base Price | Propulsion |
|-------|--------|---------|------------|------------|
| Eagle Hybruut 28 | 8.50m | 10 | €135,000 | Hybrid |

---

## 4. Key Business Rules (Hard Gates)

### Gate A: Quote Acceptance
When `quotation.status = ACCEPTED`:
- ✅ Equipment List → FROZEN
- ✅ Configuration → FROZEN
- ✅ Project → ACTIVE
- ❌ No further changes without Change Order

### Gate B: Delivery
Delivery blocked unless:
- ✅ Delivery checklist = 100% complete (or items waived with approval)
- ✅ Required CE documents attached
- ✅ Technical file complete

### Gate C: Changes After Freeze
Any change requires:
- ✅ Create Change Order
- ✅ New Equipment List version
- ✅ New Quotation revision (optional)
- ✅ Approval workflow
- ✅ Audit trail

---

## 5. Equipment → Parts Mapping

Hierarchical mapping at any level:
```
Category (e.g., "Navigation")
├── Subcategory (e.g., "Chartplotters")
│   ├── Sub-subcategory (e.g., "Garmin")
│   │   └── Mapping: 1x GPS unit needs [Part A, Part B, Part C]
```

Most specific match wins. Allows:
- Generic mappings at category level
- Specific mappings for brands/models
- Per-model overrides

---

## 6. Files Created

| File | Purpose |
|------|---------|
| `.same/new-structure-types.ts` | Complete TypeScript types (700+ lines) |
| `.same/eagle-boats-models.ts` | Real Eagle Boats model data |
| `.same/migration-plan.md` | Phase breakdown & feature mapping |
| `.same/REBUILD-SPEC.md` | This specification document |

---

## 7. Implementation Phases

### Phase 1: Foundation (Day 1-2)
- [ ] Create new stores (ProjectStore, CatalogStore, etc.)
- [ ] Set up new type imports
- [ ] Create sample data with real Eagle models

### Phase 2: Navigation & Layout (Day 2-3)
- [ ] New Sidebar with updated navigation
- [ ] Dashboard redesign for project-centric view
- [ ] Header updates

### Phase 3: Catalog Module (Day 3-4)
- [ ] Boat Models (with real Eagle data)
- [ ] Parts Database (hierarchical categories)
- [ ] Equipment Templates

### Phase 4: Projects Module (Day 4-6)
- [ ] Project list & detail views
- [ ] New Build wizard (8 steps)
- [ ] Refit flow
- [ ] Maintenance flow

### Phase 5: Commercial Module (Day 6-7)
- [ ] Equipment List generator
- [ ] Quotations with line items
- [ ] Freeze logic (Gate A)

### Phase 6: Planning Module (Day 7-8)
- [ ] Calendar (adapt existing)
- [ ] Tasks (adapt existing)
- [ ] Time tracking (adapt existing)

### Phase 7: Documentation Module (Day 8-9)
- [ ] Documents library
- [ ] CE & Technical files
- [ ] Vessel photos (adapt existing)
- [ ] Checklists (adapt existing)

### Phase 8: Business Logic (Day 9-10)
- [ ] Gate A: Freeze on acceptance
- [ ] Gate B: Delivery checklist
- [ ] Gate C: Change orders
- [ ] Equipment → Parts mapping engine

### Phase 9: Polish (Day 10-11)
- [ ] Testing all flows
- [ ] UI polish
- [ ] Sample data cleanup

---

## 8. Preserved Functionality

All current features will be included:

| Current | New Location |
|---------|--------------|
| Dashboard | Dashboard (redesigned) |
| Client Management | CRM → Clients + Contacts |
| Parts Database | Catalog → Parts Database |
| Boat Models | Catalog → Boat Models |
| Configurator | Projects → New Build (step 2) |
| Saved Configs | Projects → per project |
| Production Orders | Projects → All Projects |
| Production Calendar | Planning → Calendar |
| Tasks & Time | Planning → Tasks + Time Tracking |
| Maintenance | Projects → Maintenance |
| CE Documents | Documentation → CE & Technical |
| Technical File | Documentation → CE & Technical |
| Vessel Photos | Documentation → Vessel Photos |
| Operating Procedures | Catalog → Operating Procedures |
| Checklist Templates | Documentation → Checklists |
| Quotation | Commercial → Quotations |
| Cost Comparison | Commercial → Cost Analysis |
| User Management | Admin → Users & Roles |
| Settings | Admin → Settings |

---

## 9. Decisions Confirmed ✅

1. **Fresh start** - No data migration
2. **Real Eagle Boats models** from eagleboats.nl
3. **Refit statuses**: INTAKE → SCOPED → QUOTED → ACCEPTED → IN_PROGRESS → COMPLETE → CLOSED
4. **Vessel as separate entity** - Can have multiple projects
5. **Hierarchical category mapping** - Category → Subcategory → Sub-subcategory
6. **Current permissions** - Keep existing permission keys
7. **Change Orders** - Include tables for post-freeze changes

---

## Ready to Build?

Say **"Go"** and I'll start with Phase 1: Creating the new stores and foundation.

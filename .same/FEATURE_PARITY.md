# Navisol Feature Parity: v1-v3 vs v4

## Legend
- [x] = Implemented in v4
- [ ] = MISSING - Backlog item (NOT optional)
- [~] = Partially implemented

---

## 1. LIBRARY LAYER

### 1.1 Boat Models
| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| View boat model list | Yes | Yes | [x] Read-only display |
| View model specifications | Yes | Yes | [x] Length, beam, base price |
| View model version history | Yes | Yes | [x] Version list per model |
| Create new boat model | Yes | No | [ ] **MISSING** |
| Edit boat model | Yes | No | [ ] **MISSING** |
| Create new model version | Yes | No | [ ] **MISSING** |
| Approve model version | Yes | No | [ ] **MISSING** |
| Deprecate model version | Yes | No | [ ] **MISSING** |
| Model image upload | Yes | No | [ ] **MISSING** |
| Default equipment per model | Yes | No | [ ] **MISSING** |

### 1.2 Equipment Catalog
| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| View catalog items | Yes | Hardcoded | [~] Static list in dialog |
| Browse by category | Yes | Yes | [x] Filter in dialog |
| Search equipment | Yes | Yes | [x] Search in dialog |
| Create catalog item | Yes | No | [ ] **MISSING** |
| Edit catalog item | Yes | No | [ ] **MISSING** |
| Delete catalog item | Yes | No | [ ] **MISSING** |
| Version catalog | Yes | No | [ ] **MISSING** |
| Approve catalog version | Yes | No | [ ] **MISSING** |
| Import from Excel | Yes | No | [ ] **MISSING** |
| Export to Excel | Yes | No | [ ] **MISSING** |
| Supplier info | Yes | No | [ ] **MISSING** |
| Lead time tracking | Yes | No | [ ] **MISSING** |

### 1.3 Document Templates
| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Quote template | Yes | Hardcoded | [~] HTML template in code |
| Owner's Manual template | Yes | Hardcoded | [~] HTML template in code |
| CE Declaration template | Yes | Hardcoded | [~] HTML template in code |
| Technical File template | Yes | Hardcoded | [~] HTML template in code |
| Delivery Note template | Yes | No | [ ] **MISSING** |
| Invoice template | Yes | No | [ ] **MISSING** |
| Edit templates in UI | Yes | No | [ ] **MISSING** |
| Template versioning | Yes | No | [ ] **MISSING** |
| Template approval workflow | Yes | No | [ ] **MISSING** |
| Placeholder system | Yes | No | [ ] **MISSING** |
| Preview template | Yes | No | [ ] **MISSING** |

### 1.4 Operating Procedures
| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Procedure library | Yes | No | [ ] **MISSING** |
| Procedure categories | Yes | No | [ ] **MISSING** |
| Procedure versioning | Yes | No | [ ] **MISSING** |
| Link procedures to models | Yes | No | [ ] **MISSING** |
| Include in Owner's Manual | Yes | No | [ ] **MISSING** |

---

## 2. PROJECT LAYER

### 2.1 Project Management
| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Project list view | Yes | Yes | [x] |
| Project search | Yes | Yes | [x] |
| Project status filter | Yes | Yes | [x] |
| Create project | Yes | Yes | [x] |
| Edit project title | Yes | No | [ ] **MISSING** |
| Archive project | Yes | No | [ ] **MISSING** |
| Select boat model in creation | Yes | No | [ ] **MISSING** |
| Auto-populate base config | Yes | No | [ ] **MISSING** |
| Project status transitions | Yes | Yes | [x] With confirmation |
| Milestone effects | Yes | Yes | [x] Freeze, BOM, pins |

### 2.2 Configuration
| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| View configuration items | Yes | Yes | [x] Table view |
| Add item from catalog | Yes | Partial | [~] Hardcoded catalog |
| Add custom item | Yes | Yes | [x] |
| Edit item | Yes | No | [ ] **MISSING** |
| Remove item | Yes | No | [ ] **MISSING** |
| Reorder items | Yes | No | [ ] **MISSING** |
| Toggle item included | Yes | No | [ ] **MISSING** |
| Category grouping | Yes | No | [ ] **MISSING** |
| Pricing calculations | Yes | Yes | [x] Auto-calculated |
| Apply discount | Yes | No | [ ] **MISSING** |
| Configuration freeze | Yes | Yes | [x] At ORDER_CONFIRMED |
| View frozen snapshots | Yes | No | [ ] **MISSING** |
| Compare snapshots | Yes | No | [ ] **MISSING** |

### 2.3 Quotes
| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Create quote draft | Yes | Yes | [x] |
| View quote list | Yes | Yes | [x] |
| Edit quote lines | Yes | No | [ ] **MISSING** |
| Edit quote terms | Yes | No | [ ] **MISSING** |
| Apply discount | Yes | No | [ ] **MISSING** |
| Set validity period | Yes | No | [ ] **MISSING** |
| Mark quote as sent | Yes | Yes | [x] |
| Mark quote as accepted | Yes | Yes | [x] |
| Mark quote as rejected | Yes | No | [ ] **MISSING** |
| Create new version | Yes | No | [ ] **MISSING** |
| Compare quote versions | Yes | No | [ ] **MISSING** |
| Quote PDF generation | Yes | Yes | [x] HTML preview |
| Quote PDF download | Yes | No | [ ] **MISSING** (actual PDF) |
| Quote PDF email | Yes | No | [ ] **MISSING** |
| Quote immutability | Yes | Yes | [x] After SENT |

### 2.4 Amendments
| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Request amendment | Yes | Backend only | [~] Service exists |
| Amendment types | Yes | Yes | [x] 6 types defined |
| Amendment reason | Yes | Yes | [x] |
| Amendment approval | Yes | Backend only | [~] |
| View amendments | Yes | No | [ ] **MISSING** Tab |
| Amendment price impact | Yes | Backend only | [~] |
| Before/after snapshots | Yes | Backend only | [~] |
| Amendment dialog UI | Yes | No | [ ] **MISSING** |

### 2.5 BOM (Bill of Materials)
| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Auto-generate at ORDER_CONFIRMED | Yes | Partial | [~] Milestone defined |
| View BOM | Yes | Partial | [~] Empty state shown |
| BOM items list | Yes | No | [ ] **MISSING** |
| Expand equipment to parts | Yes | No | [ ] **MISSING** |
| BOM costs vs sell prices | Yes | No | [ ] **MISSING** |
| BOM export to CSV | Yes | No | [ ] **MISSING** |
| Print BOM | Yes | No | [ ] **MISSING** |
| BOM versioning | Yes | Backend only | [~] |

### 2.6 Documents
| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Generate Owner's Manual | Yes | Yes | [x] HTML |
| Generate CE Declaration | Yes | Yes | [x] HTML |
| Generate Technical File | Yes | Yes | [x] HTML |
| Generate Delivery Note | Yes | No | [ ] **MISSING** |
| Generate Invoice | Yes | No | [ ] **MISSING** |
| Document list view | Yes | Yes | [x] |
| View document | Yes | Yes | [x] New window |
| Download document PDF | Yes | No | [ ] **MISSING** |
| Document versioning | Yes | Yes | [x] |
| Document finalization | Yes | Backend only | [~] |
| Document status workflow | Yes | Backend only | [~] |
| Delivery Pack (bundle) | Yes | No | [ ] **MISSING** |
| Include procedures in docs | Yes | No | [ ] **MISSING** |

### 2.7 Production & Tasks
| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Tasks tab | Yes | No | [ ] **MISSING** |
| Task list per project | Yes | No | [ ] **MISSING** |
| Create task | Yes | No | [ ] **MISSING** |
| Assign task | Yes | No | [ ] **MISSING** |
| Task status updates | Yes | No | [ ] **MISSING** |
| Time logging | Yes | No | [ ] **MISSING** |
| Total hours per project | Yes | No | [ ] **MISSING** |
| Labor cost estimates | Yes | No | [ ] **MISSING** |
| Production milestones | Yes | No | [ ] **MISSING** |

---

## 3. CLIENT LAYER

| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Client list | Yes | Yes | [x] |
| Client search | Yes | Yes | [x] |
| Client status filter | Yes | Yes | [x] |
| Create client | Yes | Yes | [x] |
| Edit client | Yes | Yes | [x] |
| Archive client | Yes | Yes | [x] |
| Client type (company/private) | Yes | Yes | [x] |
| VAT number | Yes | Yes | [x] |
| Client projects view | Yes | No | [ ] **MISSING** |

---

## 4. SETTINGS & USERS

| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Settings screen | Yes | Disabled | [ ] **MISSING** |
| Company information | Yes | Hardcoded | [ ] **MISSING** |
| Default VAT rate | Yes | Hardcoded | [ ] **MISSING** |
| Quote validity defaults | Yes | Hardcoded | [ ] **MISSING** |
| Payment terms defaults | Yes | Hardcoded | [ ] **MISSING** |
| User management | Yes | No | [ ] **MISSING** |
| Role assignment | Yes | Demo only | [~] Single user |
| User preferences | Yes | No | [ ] **MISSING** |

---

## 5. AUDIT & HISTORY

| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Audit log | Yes | Yes | [x] |
| View history per project | Yes | Yes | [x] |
| Action types | Yes | Yes | [x] |
| User tracking | Yes | Yes | [x] |
| Timestamp tracking | Yes | Yes | [x] |
| Before/after data | Yes | Yes | [x] |
| Global audit view | Yes | No | [ ] **MISSING** |

---

## 6. DASHBOARD & REPORTS

| Feature | v1-v3 | v4 | Status |
|---------|-------|-----|--------|
| Dashboard screen | Yes | No | [ ] **MISSING** |
| Projects by status chart | Yes | No | [ ] **MISSING** |
| Revenue pipeline | Yes | No | [ ] **MISSING** |
| Recent activity | Yes | No | [ ] **MISSING** |
| Project summary report | Yes | No | [ ] **MISSING** |
| Quote conversion rate | Yes | No | [ ] **MISSING** |

---

## IMPLEMENTATION ORDER (Per User Request)

### Phase 1: Library Templates
1. [ ] Template editor UI in Library screen
2. [ ] Template versioning and approval
3. [ ] Placeholder system for dynamic content
4. [ ] CE Declaration template (editable)
5. [ ] Owner's Manual template (editable)
6. [ ] Technical File template (editable)
7. [ ] Delivery Note template
8. [ ] Invoice template

### Phase 2: Project Documents & Delivery Pack
1. [ ] Document finalization UI (DRAFT → FINAL)
2. [ ] Document status badges and workflow
3. [ ] PDF download (not just HTML preview)
4. [ ] Delivery Note generation
5. [ ] Invoice generation
6. [ ] Delivery Pack bundle (all docs as ZIP)
7. [ ] Include procedures in Owner's Manual

### Phase 3: Operating Procedures
1. [ ] Procedure library in Library screen
2. [ ] Procedure CRUD operations
3. [ ] Procedure versioning
4. [ ] Link procedures to boat models
5. [ ] Procedure viewer in project
6. [ ] Include in generated documents

### Phase 4: Quotes & Amendments
1. [ ] Quote editor dialog (edit lines, terms, discount)
2. [ ] Mark quote as rejected
3. [ ] Create new quote version
4. [ ] Actual PDF download
5. [ ] Amendment dialog UI
6. [ ] Amendments tab in project detail
7. [ ] View amendment snapshots
8. [ ] Amendment approval workflow

### Phase 5: BOM
1. [ ] BOM generation service
2. [ ] Parts explosion from equipment
3. [ ] BOM viewer with actual data
4. [ ] BOM costs calculation
5. [ ] BOM export to CSV
6. [ ] BOM print view

### Phase 6: Tasks & Production
1. [ ] Task model and repository
2. [ ] Tasks tab in project detail
3. [ ] Task CRUD operations
4. [ ] Task status updates
5. [ ] Time logging
6. [ ] Labor cost summary

### Phase 7: Dashboard/Reports
1. [ ] Dashboard screen as home
2. [ ] Projects by status chart
3. [ ] Revenue pipeline
4. [ ] Recent activity feed
5. [ ] Basic reports

---

## Summary

| Category | Total Features | Implemented | Missing |
|----------|----------------|-------------|---------|
| Library | 32 | 4 | 28 |
| Projects | 56 | 22 | 34 |
| Clients | 10 | 9 | 1 |
| Settings | 8 | 0 | 8 |
| Audit | 7 | 6 | 1 |
| Dashboard | 6 | 0 | 6 |
| **TOTAL** | **119** | **41** | **78** |

**Feature Parity: 34%** - Significant work remains to restore full v1-v3 functionality.

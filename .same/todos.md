# Navisol Boat Manufacturing System - TODO

## Completed
- [x] Fix client-side exceptions in Tasks section
- [x] Update Production Orders to use v2.0 Eagle Boats models
- [x] Address SSR localStorage access warnings/errors
- [x] Create Article Groups Manager with CRUD and sample groups
- [x] Replace old Eagle 750/850/1000/1200 models with real Eagle Boats models
- [x] Deploy app to Netlify
- [x] Add Reset to Sample Data button in Settings
- [x] Verify TaskManagement (timesheet) and other buttons work correctly
- [x] Create Quotation Generator with Navisol letterhead design
- [x] Update company details (IBAN, BTW, KvK) from letterhead image
- [x] Add Eagle Boats quotation template with eagle logo
- [x] Create quotation history and versioning system
- [x] Add upload sections for 3D models, cutouts, and PDF documents in parts
- [x] Add drag-and-drop file upload support
- [x] Update file validation: cutouts accept any file, documents accept PDFs and images
- [x] Fix QuotationGenerator preview button bug
- [x] Fix Cube icon import (changed to Box from lucide-react)
- [x] Create v3 Project-Centric Architecture types (types-v3.ts)
- [x] Create v3 Store with project history management (store-v3.tsx)
- [x] Create ProjectDetail view showing all project data
- [x] Create NewBuildWizard - step-by-step project creation
- [x] Create ProjectsList - projects overview with filtering
- [x] Integrate v3 store and components into AppV2
- [x] Deploy updated version with v3 architecture
- [x] Connect quotation generation to v3 projects
- [x] Create BOM (Bill of Materials) generator with Excel export and stock status
- [x] Fix NewBuildWizard workflow (deselect, search, reset on open)
- [x] Translate all UI text from Dutch to English
- [x] Create unified ProjectWizard for all project types (New Build, Refit, Maintenance)
- [x] Each project type has specific work items/equipment templates

## In Progress
- [x] Build CSV Import Tool for clients and parts
- [x] Build Data Export/Backup feature
- [x] Build Equipment Template Builder
- [ ] Import real client data
- [ ] Import real parts catalog
- [ ] Configure equipment templates per model

---

# FIRST LAUNCH PREPARATION CHECKLIST

## 1. Data Import & Configuration

### Clients Database
- [ ] Export existing client list from current system (if any)
- [ ] Format data: name, email, phone, address, type (company/private), VAT number
- [ ] Import via Settings > Import Data (to be built) or manually enter
- [ ] Verify all active clients are in the system

### Articles/Parts Database
- [ ] Export parts catalog from supplier/inventory system
- [ ] Required fields per part:
  - Part number (unique identifier)
  - Part name
  - Description
  - Category (Propulsion, Electrical, Safety, Navigation, Comfort, Deck, etc.)
  - Unit (pcs, set, m, kg, etc.)
  - Purchase price
  - Selling price
  - Current stock quantity
  - Minimum stock level
  - Supplier name
  - Brand/manufacturer
- [ ] Import parts (CSV import tool to be built)
- [ ] Verify categories match system categories
- [ ] Set initial stock levels

### Boat Models (Eagle Boats)
Models already configured:
- Eagle 25TS
- Eagle 28TS
- Eagle 32TS
- Eagle C720
- Eagle C999

For each model, verify:
- [ ] Accurate specifications (length, beam, draft, weight)
- [ ] Correct base pricing
- [ ] Available propulsion options
- [ ] Model images uploaded
- [ ] Standard equipment list defined

### Equipment Templates
- [ ] Create "Standard Package" for each boat model
- [ ] Create "Premium Package" options
- [ ] Define optional extras with pricing
- [ ] Mark CE-relevant items appropriately

### User Accounts
- [ ] Create real user accounts (not demo admin/admin123)
- [ ] Assign appropriate roles:
  - Admin: Full access
  - Production: Tasks, time tracking, production
  - Sales: Clients, quotations, projects
  - Workshop: Tasks, time tracking
  - Viewer: Read-only access
- [ ] Set secure passwords
- [ ] Document login credentials securely

## 2. Document Templates

### Quotation Template
- [x] Navisol letterhead implemented
- [ ] Verify company details are correct
- [ ] Add official logo in high resolution
- [ ] Review terms and conditions text
- [ ] Test PDF generation quality

### Invoice Template (if needed)
- [ ] Create invoice template matching quotation style
- [ ] Include proper VAT calculations
- [ ] Add payment terms

### CE Declaration
- [ ] Create proper CE marking document template
- [ ] Include all required ISO standards
- [ ] Manufacturer declaration text
- [ ] Signature block

### Delivery Checklist
- [ ] Review default checklist items
- [ ] Add model-specific items if needed
- [ ] Ensure CE-required items are marked as required

## 3. System Testing

### Create Test Projects
- [ ] Create one New Build project (full workflow)
- [ ] Create one Refit project
- [ ] Create one Maintenance project
- [ ] Test full quotation workflow for each

### Feature Testing
- [ ] Create and send quotation
- [ ] Generate BOM and export to Excel
- [ ] Add equipment items to project
- [ ] Freeze equipment configuration
- [ ] Progress through production stages
- [ ] Complete delivery checklist
- [ ] Sign off project

### Data Integrity
- [ ] Verify calculations are correct (VAT, totals, discounts)
- [ ] Check date formatting
- [ ] Verify PDF exports render correctly

## 4. Browser & Device Testing
- [ ] Test in Chrome (primary)
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Test on tablet (iPad)
- [ ] Verify responsive design on different screen sizes

## 5. Backup & Security
- [ ] Document how to backup localStorage data
- [ ] Plan for database migration when backend is ready
- [ ] Review access controls and permissions

## 6. Training Materials
- [ ] Create quick start guide for common tasks
- [ ] Document workflow: Quote → Order → Production → Delivery
- [ ] Prepare FAQ for common questions

---

# FUTURE ENHANCEMENTS (After Launch)

## Backend Integration
- [ ] Replace localStorage with proper database (PostgreSQL/Supabase)
- [ ] User authentication system (NextAuth)
- [ ] File storage (S3/Cloudinary for documents)

## Email Integration
- [ ] Send quotations via email
- [ ] Client notifications
- [ ] Internal alerts

## Accounting Integration
- [ ] Export to accounting software
- [ ] Invoice generation
- [ ] Payment tracking

## CRM Features
- [ ] Client communication history
- [ ] Lead tracking
- [ ] Follow-up reminders

## Mobile App
- [ ] Workshop mobile view for tasks
- [ ] Time tracking on the go
- [ ] Photo uploads for checklist items

---

## Current Deployment
- URL: https://same-1ymc7a7rfpv-latest.netlify.app
- Demo Credentials: admin / admin123
- Latest Version: 98

## Company Info
- Address: Industriestraat 25, 8081HH Elburg, Nederland
- Tel: +31(0)850600139
- IBAN: NL10INGB0106369652
- KvK: 91533716
- BTW: NL865686506B01

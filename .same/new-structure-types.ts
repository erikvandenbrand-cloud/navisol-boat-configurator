/**
 * NAVISOL BOAT MANUFACTURING SYSTEM - NEW STRUCTURE
 * Complete Type Definitions for Big Bang Rebuild
 *
 * Based on: Project-centric architecture with Equipment List as contractual truth
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

// Project Types
export type ProjectType = 'NEW_BUILD' | 'REFIT' | 'MAINTENANCE';

// Build Mode (for NEW_BUILD only)
export type BuildMode = 'EXISTING_MODEL' | 'CUSTOM_BOAT';

// Project Statuses per Type
export type NewBuildStatus =
  | 'DRAFT'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'ENGINEERING'
  | 'PRODUCTION'
  | 'QA'
  | 'DELIVERED'
  | 'CLOSED';

export type RefitStatus =
  | 'INTAKE'
  | 'SCOPED'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'CLOSED';

export type MaintenanceStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'CLOSED';

export type ProjectStatus = NewBuildStatus | RefitStatus | MaintenanceStatus;

// Status display info
export const PROJECT_STATUS_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  // New Build
  DRAFT: { label: 'Draft', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  QUOTED: { label: 'Quoted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  ACCEPTED: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-100' },
  ENGINEERING: { label: 'Engineering', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  PRODUCTION: { label: 'Production', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  QA: { label: 'Quality Assurance', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  CLOSED: { label: 'Closed', color: 'text-slate-500', bgColor: 'bg-slate-50' },
  // Refit
  INTAKE: { label: 'Intake', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  SCOPED: { label: 'Scoped', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  // Maintenance
  OPEN: { label: 'Open', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  COMPLETE: { label: 'Complete', color: 'text-green-700', bgColor: 'bg-green-100' },
};

// Version Statuses
export type VersionStatus = 'DRAFT' | 'OFFERED' | 'FROZEN' | 'SUPERSEDED';

// Quotation Statuses
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

// BOM Statuses
export type BOMStatus = 'DRAFT' | 'RELEASED' | 'LOCKED';

// Checklist Statuses
export type ChecklistStatus = 'OPEN' | 'COMPLETE';
export type ChecklistItemStatus = 'OPEN' | 'DONE' | 'WAIVED';

// Task Statuses
export type TaskStatus = 'TODO' | 'DOING' | 'BLOCKED' | 'DONE';

// Change Order Statuses
export type ChangeOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';

// Stock Movement Types
export type StockMovementType = 'RECEIVED' | 'RESERVED' | 'CONSUMED' | 'RETURNED' | 'ADJUSTMENT';

// Document Categories
export type DocumentCategory =
  | 'drawing'
  | 'contract'
  | 'manual'
  | 'checklist_export'
  | 'photo'
  | 'certificate'
  | 'technical'
  | 'quotation'
  | 'report'
  | 'other';

// Document Owner Types
export type DocumentOwnerType = 'CLIENT' | 'PROJECT' | 'VESSEL' | 'QUOTATION' | 'CONFIG' | 'TECHFILE';

// CE Document Types
export type CEDocumentType =
  | 'declaration_of_conformity'
  | 'risk_assessment'
  | 'supplier_declaration'
  | 'test_report'
  | 'stability_calculation'
  | 'electrical_diagram'
  | 'builders_plate';

// Photo Types
export type PhotoType = 'build' | 'serial' | 'damage' | 'delivery' | 'inspection' | 'before' | 'after';

// Propulsion Types
export type PropulsionType = 'Electric' | 'Diesel' | 'Hybrid' | 'Outboard';

// CE Design Categories
export type CECategory = 'A' | 'B' | 'C' | 'D';

// Recurrence Types (for maintenance schedules)
export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL' | 'ENGINE_HOURS' | 'CUSTOM';

// ============================================
// 1. CRM - CLIENTS & CONTACTS
// ============================================

export interface Client {
  id: string;

  // Basic Info
  name: string;
  client_type: 'company' | 'private';

  // Business Info
  vat_number?: string;
  kvk_number?: string; // Chamber of Commerce (NL)

  // Address
  street_address?: string;
  postal_code?: string;
  city?: string;
  country: string;

  // Communication
  phone?: string;
  email?: string;
  website?: string;

  // Status
  status: 'active' | 'prospect' | 'inactive';
  notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  client_id: string;

  // Personal
  first_name: string;
  last_name: string;

  // Role
  role?: string; // e.g., "Owner", "Technical Manager", "Purchasing"
  is_primary: boolean;

  // Communication
  email?: string;
  phone?: string;
  mobile?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================
// 2. CATALOG - MODELS
// ============================================

export interface Model {
  id: string;

  // Basic
  name: string;
  description?: string;

  // Specifications
  length_m?: number;
  beam_m?: number;
  draft_m?: number;
  weight_kg?: number;
  max_persons?: number;
  ce_category?: CECategory;

  // Propulsion Options
  available_propulsion: PropulsionType[];
  default_propulsion: PropulsionType;

  // Pricing
  base_price_excl_vat: number;

  // Documents
  base_spec_document_id?: string;
  image_url?: string;

  // Status
  is_active: boolean;
  is_default: boolean; // Built-in models

  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================
// 3. CATALOG - PARTS & STOCK
// ============================================

export interface Supplier {
  id: string;
  name: string;

  // Contact
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;

  // Address
  address?: string;
  city?: string;
  country?: string;

  // Terms
  default_lead_time_days?: number;
  payment_terms?: string;

  // Status
  is_active: boolean;
  notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface Part {
  id: string;

  // Identification
  part_number: string; // Unique internal SKU
  name: string;
  description?: string;

  // Classification (Hierarchical)
  category: string;
  subcategory?: string;
  sub_subcategory?: string;

  // Supplier
  default_supplier_id?: string;
  supplier_part_number?: string;

  // Pricing
  cost_price: number;
  currency: string;

  // Logistics
  lead_time_days?: number;
  unit: string; // 'pcs', 'meter', 'kg', 'liter', 'set', 'hour'
  weight_kg?: number;

  // Compliance
  ce_relevant: boolean;

  // Documentation
  datasheet_url?: string;
  image_url?: string;

  // Status
  is_active: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface PartStock {
  id: string;
  part_id: string;

  // Location (for future multi-warehouse)
  location: string; // Default: 'MAIN'

  // Quantities
  qty_on_hand: number;
  qty_reserved: number;  // Reserved for projects
  qty_on_order: number;  // Manually tracked (no PO system)
  min_stock_level: number;

  // Tracking
  last_received_at?: string;
  last_counted_at?: string;

  // Metadata
  updated_at: string;
}

export interface StockMovement {
  id: string;
  part_id: string;

  // Movement
  movement_type: StockMovementType;
  quantity: number; // Positive for in, negative for out

  // Reference
  reference_type?: 'PROJECT' | 'MANUAL' | 'COUNT';
  reference_id?: string;

  // Details
  notes?: string;

  // Metadata
  created_by_id: string;
  created_at: string;
}

// ============================================
// 4. CATALOG - CATEGORIES (Hierarchical)
// ============================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

export interface SubSubcategory {
  id: string;
  subcategory_id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
}

// ============================================
// 5. CATALOG - EQUIPMENT TEMPLATES
// ============================================

// Equipment templates define what's available for a model
export interface EquipmentTemplate {
  id: string;
  model_id: string;

  name: string; // e.g., "Standard Configuration", "Sport Package"
  description?: string;
  is_default: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface EquipmentTemplateItem {
  id: string;
  template_id: string;

  // Classification
  category: string;
  subcategory?: string;
  sub_subcategory?: string;

  // Customer-facing info
  name: string;
  description?: string;

  // Quantity
  qty: number;
  unit: string;

  // Options
  is_standard: boolean;  // Included by default
  is_optional: boolean;  // Can be added
  option_group?: string; // For mutually exclusive options

  // Pricing (customer-facing)
  price_excl_vat?: number;

  // Compliance
  ce_relevant: boolean;
  safety_critical: boolean;

  // Display
  sort_order: number;

  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================
// 6. CATALOG - EQUIPMENT TO PARTS MAPPING
// ============================================

// Maps equipment items to internal parts (BOM generation)
// Can be at category, subcategory, or sub-subcategory level
export interface EquipmentPartMapping {
  id: string;

  // What equipment this applies to (hierarchical, most specific wins)
  model_id?: string;  // Optional: model-specific mapping
  category?: string;
  subcategory?: string;
  sub_subcategory?: string;

  // Or direct link to template item
  equipment_template_item_id?: string;

  // What parts are needed
  part_id: string;
  qty_per_unit: number; // Parts needed per 1 equipment item

  // Notes
  notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================
// 7. VESSELS
// ============================================

export interface Vessel {
  id: string;

  // Identification
  vessel_number?: string;  // Internal tracking number
  hull_id?: string;        // HIN - assigned during production
  vessel_name?: string;

  // Classification
  model_id?: string;       // Null for external/custom vessels
  is_external: boolean;    // true = not built by us

  // Owner
  client_id?: string;

  // Specifications (can override model defaults)
  year_built?: number;
  propulsion_type?: PropulsionType;
  length_m?: number;
  beam_m?: number;

  // Status
  status: 'BUILDING' | 'ACTIVE' | 'SOLD' | 'DECOMMISSIONED';

  // For maintenance tracking
  engine_hours?: number;
  last_engine_hours_update?: string;

  // Notes
  notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

// ============================================
// 8. PROJECTS
// ============================================

export interface Project {
  id: string;

  // Identification
  project_number: string; // Unique, auto-generated
  title: string;
  description?: string;

  // Type & Mode
  project_type: ProjectType;
  build_mode?: BuildMode; // Only for NEW_BUILD

  // Relationships
  client_id?: string;     // Null for internal projects
  vessel_id?: string;     // Null if vessel doesn't exist yet
  model_id?: string;      // For NEW_BUILD EXISTING_MODEL

  // Status
  status: ProjectStatus;

  // Dates
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  target_delivery?: string;

  // Current versions (pointers)
  current_config_version_id?: string;
  current_equipment_list_id?: string;
  current_bom_id?: string;

  // Metadata
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// 9. CONFIGURATIONS (Project-level)
// ============================================

export interface Configuration {
  id: string;
  project_id: string;

  // Type
  config_type: 'EXISTING_MODEL_CONFIG' | 'CUSTOM_SPEC';
  model_id?: string; // For EXISTING_MODEL_CONFIG

  // Current version pointer
  current_version_id?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ConfigurationVersion {
  id: string;
  configuration_id: string;

  // Version
  version_no: number;
  status: VersionStatus;

  // Content (the actual configuration choices)
  propulsion_type?: PropulsionType;
  steering_type?: string;
  selected_options: string[]; // IDs of selected optional items
  custom_items: ConfigurationCustomItem[];

  // Change tracking
  change_summary?: string;

  // Metadata
  created_by_id: string;
  created_at: string;
}

export interface ConfigurationCustomItem {
  id: string;
  category: string;
  name: string;
  description?: string;
  qty: number;
  unit: string;
  price_excl_vat?: number;
}

// ============================================
// 10. EQUIPMENT LISTS (Customer-facing, Contractual)
// ============================================

export interface EquipmentList {
  id: string;
  project_id: string;

  // Source
  configuration_version_id?: string;

  // Version
  version_no: number;
  status: VersionStatus;

  // Notes
  notes?: string;

  // Metadata
  created_by_id: string;
  created_at: string;
  frozen_at?: string;
  frozen_by_id?: string;
}

export interface EquipmentItem {
  id: string;
  equipment_list_id: string;

  // Classification
  category: string;
  subcategory?: string;
  sub_subcategory?: string;

  // Customer-facing info
  name: string;
  description?: string;

  // Quantity
  qty: number;
  unit: string;

  // Options
  is_optional: boolean;
  option_group?: string;
  is_included: boolean; // Customer selected this option

  // Compliance
  ce_relevant: boolean;
  safety_critical: boolean;

  // Display
  sort_order: number;
}

// ============================================
// 11. BOM (Bill of Materials - Internal)
// ============================================

export interface BOMHeader {
  id: string;
  project_id: string;

  // Source
  equipment_list_id?: string;

  // Version
  version_no: number;
  status: BOMStatus;

  // Notes
  notes?: string;

  // Metadata
  created_by_id: string;
  created_at: string;
}

export interface BOMLine {
  id: string;
  bom_header_id: string;

  // Part
  part_id: string;

  // Quantity
  qty_required: number;
  qty_reserved: number;
  qty_consumed: number;

  // Notes
  notes?: string;
  alternative_group_id?: string; // For alternative parts

  // Source tracking
  equipment_item_id?: string; // Which equipment item this came from
}

// ============================================
// 12. QUOTATIONS
// ============================================

export interface Quotation {
  id: string;
  project_id: string;
  client_id: string;

  // Reference
  quote_number: string; // Unique

  // Linked documents
  equipment_list_id: string;

  // Status
  status: QuotationStatus;

  // Pricing
  currency: string;
  subtotal_excl_vat: number;
  discount_percent?: number;
  discount_amount?: number;
  total_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_incl_vat: number;

  // Terms
  valid_until: string;
  delivery_estimate?: string;
  payment_terms?: string;
  terms_document_id?: string;

  // Acceptance
  accepted_at?: string;
  accepted_by?: string; // Contact name

  // Notes
  notes?: string;
  internal_notes?: string;

  // Metadata
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationLine {
  id: string;
  quotation_id: string;

  // Item
  description: string;

  // Quantity
  qty: number;
  unit: string;

  // Pricing
  unit_price: number;
  line_total: number;

  // Internal (not shown to customer)
  cost_price?: number;
  margin_percent?: number;

  // Link to equipment
  equipment_item_id?: string;

  // Display
  sort_order: number;
}

export interface CostSnapshot {
  id: string;
  project_id: string;
  quotation_id?: string;
  equipment_list_id?: string;

  // Totals
  total_cost: number;
  total_hours: number;
  total_revenue: number;
  margin_amount: number;
  margin_percent: number;

  // Metadata
  created_by_id: string;
  created_at: string;
}

// ============================================
// 13. CHANGE ORDERS
// ============================================

export interface ChangeOrder {
  id: string;
  project_id: string;

  // Reference
  change_order_number: string;
  title: string;
  description: string;

  // What's changing
  changes: ChangeOrderChange[];

  // Impact
  cost_impact: number;
  schedule_impact_days?: number;

  // Status
  status: ChangeOrderStatus;

  // Approvals
  requested_by_id: string;
  requested_at: string;
  approved_by_id?: string;
  approved_at?: string;
  rejection_reason?: string;

  // Implementation
  implemented_at?: string;
  new_equipment_list_id?: string;
  new_quotation_id?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ChangeOrderChange {
  type: 'ADD' | 'REMOVE' | 'MODIFY';
  equipment_item_id?: string;
  description: string;
  qty_change?: number;
  price_change?: number;
}

// ============================================
// 14. TECHNICAL FILES & CE DOCUMENTS
// ============================================

export interface TechnicalFile {
  id: string;
  project_id: string;
  vessel_id?: string;

  // Status
  status: 'OPEN' | 'COMPLETE' | 'ARCHIVED';

  // Content (key fields from vessel specification)
  specifications?: VesselSpecification;

  // Notes
  notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  completed_at?: string;
  completed_by_id?: string;
}

export interface CEDocument {
  id: string;
  project_id: string;
  vessel_id?: string;

  // Type
  doc_type: CEDocumentType;

  // Document
  document_id: string; // FK to documents

  // Status
  status: 'DRAFT' | 'FINAL';

  // Validity
  issue_date?: string;
  expiry_date?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

// Vessel Specification (CE-compliant data)
export interface VesselSpecification {
  // General
  manufacturer: string;
  model_name: string;
  year_of_build?: number;
  hull_id?: string;
  ce_category?: CECategory;

  // Dimensions
  length_m?: number;
  beam_m?: number;
  draft_m?: number;
  weight_kg?: number;
  max_load_kg?: number;
  max_persons?: number;

  // Propulsion
  propulsion_type?: string;
  engine_power_kw?: number;
  fuel_type?: string;
  fuel_capacity_l?: number;

  // Electrical
  dc_voltage?: number;
  ac_voltage?: number;
  battery_capacity_kwh?: number;

  // Safety
  fire_extinguishers?: number;
  life_jackets?: number;
  liferaft_capacity?: number;

  // Additional (extensible)
  additional_specs?: Record<string, unknown>;
}

// ============================================
// 15. DOCUMENTS (Central Repository)
// ============================================

export interface Document {
  id: string;

  // Ownership
  owner_type: DocumentOwnerType;
  owner_id: string;

  // File
  file_name: string;
  file_url: string; // S3 key or URL
  file_size?: number;
  mime_type?: string;

  // Classification
  category: DocumentCategory;

  // Metadata
  title?: string;
  description?: string;

  // Tracking
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface VesselPhoto {
  id: string;
  project_id: string;
  vessel_id?: string;

  // Document
  document_id: string;

  // Classification
  photo_type: PhotoType;

  // Details
  caption?: string;
  taken_at?: string;

  // Location
  geotag_lat?: number;
  geotag_lon?: number;

  // Metadata
  created_by_id: string;
  created_at: string;
}

// ============================================
// 16. TASKS & TIME TRACKING
// ============================================

export interface TaskTemplate {
  id: string;

  // Applicability
  project_type: ProjectType;
  model_id?: string; // Optional: model-specific

  // Task
  name: string;
  description?: string;
  default_role?: string;
  estimated_hours?: number;

  // Sequencing
  default_order: number;
  depends_on_template_ids?: string[];

  // Checklist
  checklist_template_id?: string;

  // Metadata
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;

  // Reference
  template_id?: string;

  // Task
  name: string;
  description?: string;

  // Status
  status: TaskStatus;

  // Assignment
  assigned_to_id?: string;

  // Scheduling
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;

  // Time
  estimated_hours?: number;

  // Metadata
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  project_id: string;
  task_id?: string;

  // Who
  user_id: string;

  // When
  date: string;
  start_time?: string;
  end_time?: string;

  // Duration
  hours: number;
  minutes?: number;

  // Classification
  is_billable: boolean;

  // Notes
  notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface ActiveTimer {
  id: string;
  user_id: string;
  project_id: string;
  task_id?: string;

  // Timer state
  started_at: string;
  paused_at?: string;
  accumulated_minutes: number;
  is_paused: boolean;
}

// ============================================
// 17. CALENDAR
// ============================================

export interface CalendarEvent {
  id: string;
  project_id: string;

  // Event
  title: string;
  event_type: 'PRODUCTION' | 'SERVICE' | 'MILESTONE' | 'DELIVERY' | 'OTHER';

  // Timing
  start_datetime: string;
  end_datetime: string;
  is_all_day: boolean;

  // Resource
  resource?: string; // Workstation, team, etc.
  assigned_user_ids?: string[];

  // Status
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETE' | 'CANCELLED';

  // Notes
  notes?: string;

  // Metadata
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// 18. CHECKLISTS
// ============================================

export interface ChecklistTemplate {
  id: string;

  // Applicability
  project_type: ProjectType;
  model_id?: string; // Optional: model-specific

  // Template
  name: string;
  description?: string;
  is_delivery_template: boolean;

  // Auto-expand from equipment
  auto_expand_equipment: boolean;

  // Status
  is_active: boolean;

  // Metadata
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplateItem {
  id: string;
  template_id: string;

  // Item
  category: string;
  text: string;

  // Requirements
  is_required: boolean;
  requires_photo: boolean;
  photo_count?: number;
  requires_document: boolean;

  // Instructions
  instructions?: string;
  procedure_id?: string; // Link to SOP

  // Display
  sort_order: number;
}

export interface Checklist {
  id: string;
  project_id: string;

  // Source
  template_id?: string;

  // Checklist
  name: string;

  // Status
  status: ChecklistStatus;

  // Metadata
  created_by_id: string;
  created_at: string;
  completed_at?: string;
  completed_by_id?: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;

  // Item
  category: string;
  text: string;

  // Status
  status: ChecklistItemStatus;

  // Completion
  completed_by_id?: string;
  completed_at?: string;

  // Requirements
  is_required: boolean;

  // Evidence
  evidence_document_ids?: string[];
  note?: string;

  // Waiver (if waived)
  waived_by_id?: string;
  waived_at?: string;
  waiver_reason?: string;

  // Display
  sort_order: number;
}

// ============================================
// 19. MAINTENANCE SCHEDULES
// ============================================

export interface MaintenanceSchedule {
  id: string;
  vessel_id: string;

  // Schedule
  title: string;
  description?: string;

  // Recurrence
  recurrence_type: RecurrenceType;
  recurrence_interval?: number;
  engine_hours_interval?: number;
  custom_days?: number;

  // Timing
  first_due_date: string;
  last_completed_date?: string;
  next_due_date: string;

  // Alerts
  reminder_days_before: number;

  // Estimates
  estimated_hours?: number;
  estimated_cost?: number;

  // Template
  checklist_template_id?: string;
  task_template_ids?: string[];

  // Auto-create
  auto_create_project: boolean;

  // Status
  is_active: boolean;

  // Metadata
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// 20. OPERATING PROCEDURES (SOP)
// ============================================

export interface OperatingProcedure {
  id: string;

  // Classification
  title: string;
  description?: string;
  procedure_type: 'PRODUCTION' | 'SERVICE' | 'DELIVERY' | 'SAFETY' | 'QUALITY';

  // Category (hierarchical)
  category: string;
  subcategory?: string;
  sub_subcategory?: string;

  // Content
  document_id?: string;
  content_blocks?: ProcedureContentBlock[];

  // Applicability
  applicable_model_ids?: string[];
  applicable_project_types?: ProjectType[];

  // Version
  version: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ARCHIVED';

  // Tags
  tags: string[];

  // Metadata
  created_by_id: string;
  created_at: string;
  updated_at: string;
  approved_by_id?: string;
  approved_at?: string;
}

export interface ProcedureContentBlock {
  id: string;
  type: 'TEXT' | 'HEADING' | 'LIST' | 'IMAGE' | 'WARNING' | 'TIP' | 'STEPS';
  order: number;
  content?: string;
  items?: string[];
  image_url?: string;
  heading_level?: 1 | 2 | 3;
  steps?: { step: number; instruction: string; image_url?: string }[];
}

// ============================================
// 21. USERS & PERMISSIONS
// ============================================

export interface User {
  id: string;

  // Auth
  username: string;
  password_hash: string;

  // Profile
  first_name: string;
  last_name: string;
  email: string;

  // Status
  is_active: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  is_system: boolean; // Built-in roles can't be deleted
}

export interface UserRole {
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by_id: string;
}

export interface Permission {
  role_id: string;
  permission_key: string;
}

// Current permission keys (preserved)
export const PERMISSION_KEYS = [
  'viewDashboard',
  'viewClients',
  'manageClients',
  'viewArticles',
  'manageArticles',
  'viewConfigurations',
  'createConfigurations',
  'viewDocuments',
  'viewQuotations',
  'createQuotations',
  'viewCEDocs',
  'createCEDocs',
  'viewProduction',
  'updateProduction',
  'viewTasks',
  'manageTasks',
  'viewMedia',
  'manageMedia',
  'viewUsers',
  'viewSettings',
  'manageSettings',
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

// ============================================
// 22. SETTINGS
// ============================================

export interface Setting {
  key: string;
  value: string; // JSON serialized
  description?: string;
  updated_at: string;
  updated_by_id?: string;
}

// Global settings structure
export interface GlobalSettings {
  company: {
    name: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    website?: string;
    vat_number?: string;
    kvk_number?: string;
    logo_url?: string;
  };
  defaults: {
    currency: string;
    vat_rate: number;
    payment_terms: string;
    delivery_terms: string;
    quotation_validity_days: number;
  };
  numbering: {
    project_prefix: string;
    project_next: number;
    quotation_prefix: string;
    quotation_next: number;
    change_order_prefix: string;
    change_order_next: number;
  };
}

// ============================================
// 23. AUDIT LOG (Optional but recommended)
// ============================================

export interface AuditLog {
  id: string;

  // What
  entity_type: string;
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'FREEZE' | 'APPROVE';

  // Changes
  changes?: Record<string, { old: unknown; new: unknown }>;

  // Context
  project_id?: string;

  // Who & When
  user_id: string;
  timestamp: string;
  ip_address?: string;
}

// ============================================
// NAVIGATION STRUCTURE
// ============================================

export interface NavigationGroup {
  id: string;
  label: string;
  icon: string;
  items: NavigationItem[];
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  permission?: PermissionKey;
}

export const NAVIGATION_STRUCTURE: NavigationGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', permission: 'viewDashboard' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'Users',
    items: [
      { id: 'clients', label: 'Clients', icon: 'Building2', permission: 'viewClients' },
      { id: 'contacts', label: 'Contacts', icon: 'Users', permission: 'viewClients' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    icon: 'Package',
    items: [
      { id: 'models', label: 'Boat Models', icon: 'Ship', permission: 'viewConfigurations' },
      { id: 'parts', label: 'Parts Database', icon: 'Database', permission: 'viewArticles' },
      { id: 'equipment-templates', label: 'Equipment Templates', icon: 'ClipboardList', permission: 'viewConfigurations' },
      { id: 'procedures', label: 'Operating Procedures', icon: 'BookOpen', permission: 'viewCEDocs' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: 'FolderKanban',
    items: [
      { id: 'all-projects', label: 'All Projects', icon: 'FolderKanban', permission: 'viewProduction' },
      { id: 'new-builds', label: 'New Builds', icon: 'Ship', permission: 'viewProduction' },
      { id: 'refits', label: 'Refits', icon: 'Wrench', permission: 'viewProduction' },
      { id: 'maintenance', label: 'Maintenance', icon: 'Settings', permission: 'viewProduction' },
    ],
  },
  {
    id: 'planning',
    label: 'Planning',
    icon: 'Calendar',
    items: [
      { id: 'calendar', label: 'Production Calendar', icon: 'GanttChart', permission: 'viewProduction' },
      { id: 'tasks', label: 'Tasks', icon: 'ListTodo', permission: 'viewTasks' },
      { id: 'time-tracking', label: 'Time Tracking', icon: 'Clock', permission: 'viewTasks' },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    icon: 'Receipt',
    items: [
      { id: 'quotations', label: 'Quotations', icon: 'FileText', permission: 'viewQuotations' },
      { id: 'cost-analysis', label: 'Cost Analysis', icon: 'TrendingUp', permission: 'viewQuotations' },
    ],
  },
  {
    id: 'documentation',
    label: 'Documentation',
    icon: 'FileText',
    items: [
      { id: 'documents', label: 'Documents Library', icon: 'Files', permission: 'viewDocuments' },
      { id: 'technical-files', label: 'CE & Technical', icon: 'FileCheck', permission: 'viewCEDocs' },
      { id: 'vessel-photos', label: 'Vessel Photos', icon: 'Camera', permission: 'viewMedia' },
      { id: 'checklists', label: 'Checklist Templates', icon: 'ClipboardCheck', permission: 'createCEDocs' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: 'Settings',
    items: [
      { id: 'users', label: 'Users & Roles', icon: 'UserCog', permission: 'viewUsers' },
      { id: 'settings', label: 'Settings', icon: 'Settings', permission: 'viewSettings' },
    ],
  },
];

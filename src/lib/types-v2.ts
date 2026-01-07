/**
 * NAVISOL v2.0 - Type Definitions
 * Project-centric architecture with Equipment List as contractual truth
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type ProjectType = 'NEW_BUILD' | 'REFIT' | 'MAINTENANCE';
export type BuildMode = 'EXISTING_MODEL' | 'CUSTOM_BOAT';

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

export const PROJECT_STATUS_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: 'Draft', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  QUOTED: { label: 'Quoted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  ACCEPTED: { label: 'Accepted', color: 'text-green-700', bgColor: 'bg-green-100' },
  ENGINEERING: { label: 'Engineering', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  PRODUCTION: { label: 'Production', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  QA: { label: 'Quality Assurance', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  CLOSED: { label: 'Closed', color: 'text-slate-500', bgColor: 'bg-slate-50' },
  INTAKE: { label: 'Intake', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  SCOPED: { label: 'Scoped', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  OPEN: { label: 'Open', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  COMPLETE: { label: 'Complete', color: 'text-green-700', bgColor: 'bg-green-100' },
};

export type VersionStatus = 'DRAFT' | 'OFFERED' | 'FROZEN' | 'SUPERSEDED';
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type BOMStatus = 'DRAFT' | 'RELEASED' | 'LOCKED';
export type ChecklistStatus = 'OPEN' | 'COMPLETE';
export type ChecklistItemStatus = 'OPEN' | 'DONE' | 'WAIVED';
export type TaskStatus = 'TODO' | 'DOING' | 'BLOCKED' | 'DONE';
export type ChangeOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'IMPLEMENTED';
export type StockMovementType = 'RECEIVED' | 'RESERVED' | 'CONSUMED' | 'RETURNED' | 'ADJUSTMENT';
export type PropulsionType = 'Electric' | 'Diesel' | 'Hybrid' | 'Outboard';
export type CECategory = 'A' | 'B' | 'C' | 'D';
export type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL' | 'ENGINE_HOURS' | 'CUSTOM';

// ============================================
// BOAT BRANDS
// ============================================

export interface BoatBrand {
  id: string;
  name: string;
  logo_url?: string;
  website?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_BRANDS: Omit<BoatBrand, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Eagle Boats',
    logo_url: 'https://ext.same-assets.com/1354135331/3210280025.png',
    website: 'https://eagleboats.nl',
    description: 'Dutch-built aluminium boats with electric and hybrid propulsion',
    is_active: true,
  },
];

// ============================================
// BOAT RANGES
// ============================================

export type BoatRange = 'TS' | 'CLASSIC' | 'SG' | 'HYBRUUT' | 'FORCE' | 'SALOON' | 'CUSTOM';

export const BOAT_RANGES: Record<BoatRange, {
  name: string;
  description: string;
  propulsion_focus: PropulsionType[];
}> = {
  TS: {
    name: 'TS Series',
    description: 'T-Top Sport - Flagship electric line with modern styling',
    propulsion_focus: ['Electric'],
  },
  CLASSIC: {
    name: 'Classic Series',
    description: 'Traditional Dutch sloep style for canals and inland waters',
    propulsion_focus: ['Electric'],
  },
  SG: {
    name: 'SG Series',
    description: 'Sport Grand - Versatile elegance for all conditions',
    propulsion_focus: ['Electric', 'Hybrid'],
  },
  HYBRUUT: {
    name: 'Hybruut Series',
    description: 'Hybrid propulsion - Electric comfort with combustion range',
    propulsion_focus: ['Hybrid'],
  },
  FORCE: {
    name: 'Force Series',
    description: 'Commercial work boats for business and fleet operations',
    propulsion_focus: ['Electric', 'Hybrid'],
  },
  SALOON: {
    name: 'Saloon Series',
    description: 'Enclosed cabin models for year-round cruising',
    propulsion_focus: ['Electric', 'Hybrid'],
  },
  CUSTOM: {
    name: 'Custom',
    description: 'Custom model range',
    propulsion_focus: ['Electric', 'Hybrid', 'Diesel', 'Outboard'],
  },
};

// ============================================
// 1. CRM - CLIENTS & CONTACTS
// ============================================

export interface Client {
  id: string;
  name: string;
  client_type: 'company' | 'private';
  vat_number?: string;
  kvk_number?: string;
  street_address?: string;
  postal_code?: string;
  city?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  status: 'active' | 'prospect' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  role?: string;
  is_primary: boolean;
  email?: string;
  phone?: string;
  mobile?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// 2. CATALOG - MODELS
// ============================================

export interface Model {
  id: string;
  brand_id?: string; // Optional brand reference
  brand_name?: string; // Denormalized for display
  name: string;
  range: BoatRange;
  tagline?: string;
  description?: string;
  length_m?: number;
  beam_m?: number;
  draft_m?: number;
  weight_kg?: number;
  max_persons?: number;
  ce_category?: CECategory;
  available_propulsion: PropulsionType[];
  default_propulsion: PropulsionType;
  base_price_excl_vat: number;
  highlights?: string[];
  image_url?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// 3. CATALOG - PARTS & STOCK
// ============================================

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  default_lead_time_days?: number;
  payment_terms?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Part {
  id: string;
  part_number: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  sub_subcategory?: string;
  default_supplier_id?: string;
  supplier_part_number?: string;
  cost_price: number;
  sell_price?: number;
  currency: string;
  lead_time_days?: number;
  unit: string;
  weight_kg?: number;
  ce_relevant: boolean;
  datasheet_url?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartStock {
  id: string;
  part_id: string;
  location: string;
  qty_on_hand: number;
  qty_reserved: number;
  qty_on_order: number;
  min_stock_level: number;
  last_received_at?: string;
  last_counted_at?: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  part_id: string;
  movement_type: StockMovementType;
  quantity: number;
  reference_type?: 'PROJECT' | 'MANUAL' | 'COUNT';
  reference_id?: string;
  notes?: string;
  created_by_id: string;
  created_at: string;
}

// ============================================
// 4. CATALOG - CATEGORIES
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

export interface EquipmentTemplate {
  id: string;
  model_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipmentTemplateItem {
  id: string;
  template_id: string;
  category: string;
  subcategory?: string;
  sub_subcategory?: string;
  name: string;
  description?: string;
  qty: number;
  unit: string;
  is_standard: boolean;
  is_optional: boolean;
  option_group?: string;
  price_excl_vat?: number;
  ce_relevant: boolean;
  safety_critical: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// 6. VESSELS
// ============================================

export interface Vessel {
  id: string;
  vessel_number?: string;
  hull_id?: string;
  vessel_name?: string;
  model_id?: string;
  is_external: boolean;
  client_id?: string;
  year_built?: number;
  propulsion_type?: PropulsionType;
  length_m?: number;
  beam_m?: number;
  status: 'BUILDING' | 'ACTIVE' | 'SOLD' | 'DECOMMISSIONED';
  engine_hours?: number;
  last_engine_hours_update?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// 7. PROJECTS
// ============================================

export interface Project {
  id: string;
  project_number: string;
  title: string;
  description?: string;
  project_type: ProjectType;
  build_mode?: BuildMode;
  client_id?: string;
  vessel_id?: string;
  model_id?: string;
  status: ProjectStatus;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  target_delivery?: string;
  current_config_version_id?: string;
  current_equipment_list_id?: string;
  current_bom_id?: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// 8. CONFIGURATIONS
// ============================================

export interface Configuration {
  id: string;
  project_id: string;
  config_type: 'EXISTING_MODEL_CONFIG' | 'CUSTOM_SPEC';
  model_id?: string;
  current_version_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfigurationVersion {
  id: string;
  configuration_id: string;
  version_no: number;
  status: VersionStatus;
  propulsion_type?: PropulsionType;
  steering_type?: string;
  selected_options: string[];
  custom_items: ConfigurationCustomItem[];
  change_summary?: string;
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
// 9. EQUIPMENT LISTS
// ============================================

export interface EquipmentList {
  id: string;
  project_id: string;
  configuration_version_id?: string;
  version_no: number;
  status: VersionStatus;
  notes?: string;
  created_by_id: string;
  created_at: string;
  frozen_at?: string;
  frozen_by_id?: string;
}

export interface EquipmentItem {
  id: string;
  equipment_list_id: string;
  category: string;
  subcategory?: string;
  sub_subcategory?: string;
  name: string;
  description?: string;
  qty: number;
  unit: string;
  is_optional: boolean;
  option_group?: string;
  is_included: boolean;
  ce_relevant: boolean;
  safety_critical: boolean;
  sort_order: number;
}

// ============================================
// 10. BOM (Bill of Materials)
// ============================================

export interface BOMHeader {
  id: string;
  project_id: string;
  equipment_list_id?: string;
  version_no: number;
  status: BOMStatus;
  notes?: string;
  created_by_id: string;
  created_at: string;
}

export interface BOMLine {
  id: string;
  bom_header_id: string;
  part_id: string;
  qty_required: number;
  qty_reserved: number;
  qty_consumed: number;
  notes?: string;
  alternative_group_id?: string;
  equipment_item_id?: string;
}

// ============================================
// 11. QUOTATIONS
// ============================================

export interface Quotation {
  id: string;
  project_id: string;
  client_id: string;
  quote_number: string;
  equipment_list_id: string;
  status: QuotationStatus;
  currency: string;
  subtotal_excl_vat: number;
  discount_percent?: number;
  discount_amount?: number;
  total_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_incl_vat: number;
  valid_until: string;
  delivery_estimate?: string;
  payment_terms?: string;
  accepted_at?: string;
  accepted_by?: string;
  notes?: string;
  internal_notes?: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationLine {
  id: string;
  quotation_id: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
  line_total: number;
  cost_price?: number;
  margin_percent?: number;
  equipment_item_id?: string;
  sort_order: number;
}

// ============================================
// 12. CHANGE ORDERS
// ============================================

export interface ChangeOrder {
  id: string;
  project_id: string;
  change_order_number: string;
  title: string;
  description: string;
  changes: ChangeOrderChange[];
  cost_impact: number;
  schedule_impact_days?: number;
  status: ChangeOrderStatus;
  requested_by_id: string;
  requested_at: string;
  approved_by_id?: string;
  approved_at?: string;
  rejection_reason?: string;
  implemented_at?: string;
  new_equipment_list_id?: string;
  new_quotation_id?: string;
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
// 13. TASKS & TIME TRACKING
// ============================================

export interface Task {
  id: string;
  project_id: string;
  template_id?: string;
  name: string;
  description?: string;
  status: TaskStatus;
  assigned_to_id?: string;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  estimated_hours?: number;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  project_id: string;
  task_id?: string;
  user_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  hours: number;
  minutes?: number;
  is_billable: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveTimer {
  id: string;
  user_id: string;
  project_id: string;
  task_id?: string;
  started_at: string;
  paused_at?: string;
  accumulated_minutes: number;
  is_paused: boolean;
}

// ============================================
// 14. CALENDAR
// ============================================

export interface CalendarEvent {
  id: string;
  project_id: string;
  title: string;
  event_type: 'PRODUCTION' | 'SERVICE' | 'MILESTONE' | 'DELIVERY' | 'OTHER';
  start_datetime: string;
  end_datetime: string;
  is_all_day: boolean;
  resource?: string;
  assigned_user_ids?: string[];
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETE' | 'CANCELLED';
  notes?: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// 15. CHECKLISTS
// ============================================

export interface ChecklistTemplate {
  id: string;
  project_type: ProjectType;
  model_id?: string;
  name: string;
  description?: string;
  is_delivery_template: boolean;
  auto_expand_equipment: boolean;
  is_active: boolean;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplateItem {
  id: string;
  template_id: string;
  category: string;
  text: string;
  is_required: boolean;
  requires_photo: boolean;
  photo_count?: number;
  requires_document: boolean;
  instructions?: string;
  procedure_id?: string;
  sort_order: number;
}

export interface Checklist {
  id: string;
  project_id: string;
  template_id?: string;
  name: string;
  status: ChecklistStatus;
  created_by_id: string;
  created_at: string;
  completed_at?: string;
  completed_by_id?: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  category: string;
  text: string;
  status: ChecklistItemStatus;
  completed_by_id?: string;
  completed_at?: string;
  is_required: boolean;
  evidence_document_ids?: string[];
  note?: string;
  waived_by_id?: string;
  waived_at?: string;
  waiver_reason?: string;
  sort_order: number;
}

// ============================================
// 16. MAINTENANCE SCHEDULES
// ============================================

export interface MaintenanceSchedule {
  id: string;
  vessel_id: string;
  title: string;
  description?: string;
  recurrence_type: RecurrenceType;
  recurrence_interval?: number;
  engine_hours_interval?: number;
  custom_days?: number;
  first_due_date: string;
  last_completed_date?: string;
  next_due_date: string;
  reminder_days_before: number;
  estimated_hours?: number;
  estimated_cost?: number;
  checklist_template_id?: string;
  task_template_ids?: string[];
  auto_create_project: boolean;
  is_active: boolean;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// 17. USERS & AUTH
// ============================================

export interface User {
  id: string;
  username: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export type UserRole = 'admin' | 'manager' | 'sales' | 'production' | 'viewer';

export const USER_ROLES: Record<UserRole, { label: string; description: string; color: string }> = {
  admin: { label: 'Administrator', description: 'Full system access', color: 'bg-red-100 text-red-800' },
  manager: { label: 'Manager', description: 'Management access', color: 'bg-purple-100 text-purple-800' },
  sales: { label: 'Sales', description: 'Commercial access', color: 'bg-blue-100 text-blue-800' },
  production: { label: 'Production', description: 'Production floor access', color: 'bg-orange-100 text-orange-800' },
  viewer: { label: 'Viewer', description: 'Read-only access', color: 'bg-slate-100 text-slate-800' },
};

// Permissions
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
  'viewProjects',
  'manageProjects',
  'viewCatalog',
  'manageCatalog',
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  admin: [...PERMISSION_KEYS],
  manager: [
    'viewDashboard', 'viewClients', 'manageClients',
    'viewArticles', 'manageArticles', 'viewConfigurations', 'createConfigurations',
    'viewDocuments', 'viewQuotations', 'createQuotations',
    'viewCEDocs', 'createCEDocs', 'viewProduction', 'updateProduction',
    'viewTasks', 'manageTasks', 'viewMedia', 'manageMedia',
    'viewProjects', 'manageProjects', 'viewCatalog', 'manageCatalog',
  ],
  sales: [
    'viewDashboard', 'viewClients', 'manageClients',
    'viewArticles', 'viewConfigurations', 'createConfigurations',
    'viewDocuments', 'viewQuotations', 'createQuotations',
    'viewProjects', 'viewCatalog',
  ],
  production: [
    'viewDashboard', 'viewClients',
    'viewArticles', 'viewConfigurations',
    'viewDocuments', 'viewCEDocs',
    'viewProduction', 'updateProduction',
    'viewTasks', 'manageTasks', 'viewMedia', 'manageMedia',
    'viewProjects', 'viewCatalog',
  ],
  viewer: [
    'viewDashboard', 'viewClients', 'viewArticles',
    'viewConfigurations', 'viewDocuments', 'viewQuotations',
    'viewCEDocs', 'viewProduction', 'viewTasks', 'viewMedia',
    'viewProjects', 'viewCatalog',
  ],
};

// ============================================
// 18. SETTINGS
// ============================================

export interface GlobalSettings {
  company: {
    name: string;
    legal_name?: string;
    tagline?: string;
    address: string;
    city: string;
    postal_code?: string;
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
// NAVIGATION
// ============================================

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  permission?: PermissionKey;
  badge?: number;
}

export interface NavigationGroup {
  id: string;
  label: string;
  icon: string;
  items: NavigationItem[];
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
      { id: 'models', label: 'Boat Models', icon: 'Ship', permission: 'viewCatalog' },
      { id: 'parts', label: 'Parts Database', icon: 'Database', permission: 'viewArticles' },
      { id: 'article-groups', label: 'Article Groups', icon: 'Package', permission: 'viewArticles' },
      { id: 'equipment-templates', label: 'Equipment Templates', icon: 'ClipboardList', permission: 'viewCatalog' },
      { id: 'procedures', label: 'Operating Procedures', icon: 'BookOpen', permission: 'viewCEDocs' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: 'FolderKanban',
    items: [
      { id: 'all-projects', label: 'All Projects', icon: 'FolderKanban', permission: 'viewProjects' },
      { id: 'new-builds', label: 'New Builds', icon: 'Ship', permission: 'viewProjects' },
      { id: 'refits', label: 'Refits', icon: 'Wrench', permission: 'viewProjects' },
      { id: 'maintenance', label: 'Maintenance', icon: 'Settings', permission: 'viewProjects' },
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
      { id: 'data-management', label: 'Data Management', icon: 'Database', permission: 'viewSettings' },
      { id: 'users', label: 'Users & Roles', icon: 'UserCog', permission: 'viewUsers' },
      { id: 'settings', label: 'Settings', icon: 'Settings', permission: 'viewSettings' },
    ],
  },
];

// ============================================
// DEFAULT DATA - EAGLE BOATS
// ============================================

export const NAVISOL_COMPANY: GlobalSettings['company'] = {
  name: 'Navisol',
  legal_name: 'Navisol B.V.',
  tagline: 'Boat Manufacturing System',
  address: 'Industriestraat 25',
  city: 'Elburg',
  postal_code: '8081 HH',
  country: 'The Netherlands',
  phone: '+31 (0)85 0600 139',
  email: 'info@navisol.nl',
  website: 'https://navisol.nl',
  logo_url: '',
};

export const DEFAULT_SETTINGS: GlobalSettings = {
  company: NAVISOL_COMPANY,
  defaults: {
    currency: 'EUR',
    vat_rate: 21,
    payment_terms: '30 days net',
    delivery_terms: 'Ex Works Elburg',
    quotation_validity_days: 30,
  },
  numbering: {
    project_prefix: 'PRJ-',
    project_next: 1001,
    quotation_prefix: 'QUO-',
    quotation_next: 2001,
    change_order_prefix: 'CO-',
    change_order_next: 1,
  },
};

// Default Eagle Boats Models
export const DEFAULT_MODELS: Omit<Model, 'id' | 'created_at' | 'updated_at'>[] = [
  // TS Series
  {
    name: 'Eagle 525T',
    range: 'TS',
    tagline: 'Elegant day cruising',
    description: 'Compact yet sophisticated day cruiser with signature Eagle T-Top styling.',
    length_m: 5.25,
    beam_m: 2.10,
    draft_m: 0.35,
    weight_kg: 850,
    max_persons: 5,
    ce_category: 'C',
    available_propulsion: ['Electric'],
    default_propulsion: 'Electric',
    base_price_excl_vat: 45000,
    is_active: true,
    is_default: true,
    highlights: ['Compact T-Top design', 'Silent electric propulsion', 'Premium upholstery', 'Integrated swim platform'],
    image_url: 'https://ext.same-assets.com/1354135331/3705907936.jpeg',
  },
  {
    name: 'Eagle 25TS',
    range: 'TS',
    tagline: 'HISWA Electric Boat of the Year 2025',
    description: 'Award-winning electric boat combining Dutch engineering excellence with sustainable propulsion.',
    length_m: 7.50,
    beam_m: 2.50,
    draft_m: 0.45,
    weight_kg: 1800,
    max_persons: 8,
    ce_category: 'C',
    available_propulsion: ['Electric'],
    default_propulsion: 'Electric',
    base_price_excl_vat: 89000,
    is_active: true,
    is_default: true,
    highlights: ['HISWA Electric Boat of the Year 2025', 'Award-winning design', 'Premium aluminium construction', 'Extended range battery system'],
    image_url: 'https://ext.same-assets.com/1354135331/803860996.jpeg',
  },
  {
    name: 'Eagle 28TS',
    range: 'TS',
    tagline: 'Premium comfort',
    description: 'Spacious day cruiser with overnight capability. Perfect balance of performance and comfort.',
    length_m: 8.50,
    beam_m: 2.80,
    draft_m: 0.55,
    weight_kg: 2800,
    max_persons: 10,
    ce_category: 'C',
    available_propulsion: ['Electric', 'Hybrid'],
    default_propulsion: 'Electric',
    base_price_excl_vat: 125000,
    is_active: true,
    is_default: true,
    highlights: ['Overnight cabin option', 'Dual battery banks', 'Premium helm station', 'Full galley available'],
    image_url: 'https://ext.same-assets.com/1354135331/624305291.webp',
  },
  {
    name: 'Eagle 32TS',
    range: 'TS',
    tagline: 'Spacious luxury',
    description: 'Flagship of the TS series. Uncompromising luxury meets sustainable technology.',
    length_m: 9.70,
    beam_m: 3.20,
    draft_m: 0.65,
    weight_kg: 4200,
    max_persons: 12,
    ce_category: 'B',
    available_propulsion: ['Electric', 'Hybrid'],
    default_propulsion: 'Electric',
    base_price_excl_vat: 185000,
    is_active: true,
    is_default: true,
    highlights: ['Flagship model', 'Full standing headroom cabin', 'Separate heads compartment', 'Premium sound system'],
    image_url: 'https://ext.same-assets.com/1354135331/3150293400.jpeg',
  },
  // Classic Series
  {
    name: 'Eagle C550',
    range: 'CLASSIC',
    tagline: 'Canal pleasure',
    description: 'Compact classic sloep for Dutch canals and small waterways.',
    length_m: 5.50,
    beam_m: 2.00,
    draft_m: 0.30,
    weight_kg: 700,
    max_persons: 6,
    ce_category: 'D',
    available_propulsion: ['Electric'],
    default_propulsion: 'Electric',
    base_price_excl_vat: 38000,
    is_active: true,
    is_default: true,
    highlights: ['Traditional sloep design', 'Low bridge clearance', 'Silent canal cruising', 'Easy single-handed operation'],
    image_url: 'https://ext.same-assets.com/1354135331/618955806.jpeg',
  },
  {
    name: 'Eagle C570',
    range: 'CLASSIC',
    tagline: 'Canal pleasure plus',
    description: 'Slightly larger classic sloep with enhanced comfort features.',
    length_m: 5.70,
    beam_m: 2.10,
    draft_m: 0.32,
    weight_kg: 780,
    max_persons: 6,
    ce_category: 'D',
    available_propulsion: ['Electric'],
    default_propulsion: 'Electric',
    base_price_excl_vat: 42000,
    is_active: true,
    is_default: true,
    highlights: ['Enhanced seating capacity', 'Improved storage', 'Traditional craftsmanship', 'Electric efficiency'],
    image_url: 'https://ext.same-assets.com/1354135331/618955806.jpeg',
  },
  {
    name: 'Eagle C720',
    range: 'CLASSIC',
    tagline: 'Grand touring',
    description: 'Grand tourer of the Classic series. Spacious for extended day cruises.',
    length_m: 7.20,
    beam_m: 2.40,
    draft_m: 0.40,
    weight_kg: 1400,
    max_persons: 8,
    ce_category: 'C',
    available_propulsion: ['Electric'],
    default_propulsion: 'Electric',
    base_price_excl_vat: 68000,
    is_active: true,
    is_default: true,
    highlights: ['Spacious deck layout', 'Full sunbed option', 'Premium upholstery', 'Entertaining-ready'],
    image_url: 'https://ext.same-assets.com/1354135331/2734770259.jpeg',
  },
  {
    name: 'Eagle C999',
    range: 'CLASSIC',
    tagline: 'Ultimate freedom',
    description: 'Ultimate classic sloep. Nearly 10 meters of pure Dutch craftsmanship.',
    length_m: 9.99,
    beam_m: 3.00,
    draft_m: 0.55,
    weight_kg: 3500,
    max_persons: 12,
    ce_category: 'C',
    available_propulsion: ['Electric', 'Hybrid'],
    default_propulsion: 'Electric',
    base_price_excl_vat: 145000,
    is_active: true,
    is_default: true,
    highlights: ['Flagship classic model', 'Hybrid option available', 'Full cabin possibility', 'Ultimate comfort'],
    image_url: 'https://ext.same-assets.com/1354135331/3910772652.jpeg',
  },
  // SG Series
  {
    name: 'Eagle 28SG',
    range: 'SG',
    tagline: 'Versatile elegance',
    description: 'Sport Grand combines sporty performance with elegant classic lines.',
    length_m: 8.50,
    beam_m: 2.75,
    draft_m: 0.50,
    weight_kg: 2600,
    max_persons: 10,
    ce_category: 'C',
    available_propulsion: ['Electric', 'Hybrid'],
    default_propulsion: 'Electric',
    base_price_excl_vat: 115000,
    is_active: true,
    is_default: true,
    highlights: ['Sport-classic hybrid design', 'Versatile deck layout', 'Performance-oriented hull', 'Optional hardtop'],
    image_url: 'https://ext.same-assets.com/1354135331/3832940634.jpeg',
  },
  // Hybruut Series
  {
    name: 'Eagle Hybruut 28',
    range: 'HYBRUUT',
    tagline: 'Silent exploration',
    description: 'Best of both worlds: silent electric cruising with combustion range when needed.',
    length_m: 8.50,
    beam_m: 2.80,
    draft_m: 0.55,
    weight_kg: 3000,
    max_persons: 10,
    ce_category: 'C',
    available_propulsion: ['Hybrid'],
    default_propulsion: 'Hybrid',
    base_price_excl_vat: 135000,
    is_active: true,
    is_default: true,
    highlights: ['True hybrid system', 'Extended cruising range', 'Silent electric mode', 'Diesel generator charging'],
    image_url: 'https://ext.same-assets.com/1354135331/2291826846.jpeg',
  },
];

// Default categories for parts/equipment
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-hull', name: 'Hull & Structure', description: 'Aluminium hull, deck, superstructure', sort_order: 1, is_active: true },
  { id: 'cat-propulsion', name: 'Propulsion', description: 'Electric motors, batteries, hybrid systems', sort_order: 2, is_active: true },
  { id: 'cat-electrical', name: 'Electrical Systems', description: 'Wiring, panels, lighting, shore power', sort_order: 3, is_active: true },
  { id: 'cat-navigation', name: 'Navigation & Electronics', description: 'Chartplotters, radar, AIS, VHF', sort_order: 4, is_active: true },
  { id: 'cat-deck', name: 'Deck Equipment', description: 'Cleats, fenders, anchoring, covers', sort_order: 5, is_active: true },
  { id: 'cat-comfort', name: 'Comfort & Interior', description: 'Seating, upholstery, galley, heads', sort_order: 6, is_active: true },
  { id: 'cat-safety', name: 'Safety Equipment', description: 'Life jackets, fire extinguishers, flares', sort_order: 7, is_active: true },
  { id: 'cat-exterior', name: 'Exterior & Styling', description: 'Paint, graphics, T-top, bimini', sort_order: 8, is_active: true },
  { id: 'cat-accessories', name: 'Accessories', description: 'Options and add-ons', sort_order: 9, is_active: true },
];

// Default Users
export const DEFAULT_USERS: Omit<User, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    username: 'admin',
    password_hash: 'admin123',
    first_name: 'System',
    last_name: 'Administrator',
    email: 'admin@eagleboats.nl',
    role: 'admin',
    is_active: true,
  },
  {
    username: 'manager',
    password_hash: 'manager123',
    first_name: 'Production',
    last_name: 'Manager',
    email: 'manager@eagleboats.nl',
    role: 'manager',
    is_active: true,
  },
  {
    username: 'sales',
    password_hash: 'sales123',
    first_name: 'Sales',
    last_name: 'Representative',
    email: 'sales@eagleboats.nl',
    role: 'sales',
    is_active: true,
  },
];

/**
 * Navisol Boat Manufacturing System - Type Definitions
 */

// Quantity unit enum
export type QuantityUnit = 'pcs' | 'meter' | 'set' | 'liter' | 'kg' | 'm²' | 'hour' | 'other';

// Stock status enum
export type StockStatus = 'in_stock' | 'low_stock' | 'ordered' | 'out_of_stock';

// Stock status display info
export const STOCK_STATUS_INFO: Record<StockStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  in_stock: { label: 'In Stock', color: 'text-green-700', bgColor: 'bg-green-100' },
  low_stock: { label: 'Low Stock', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  ordered: { label: 'Ordered', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  out_of_stock: { label: 'Out of Stock', color: 'text-red-700', bgColor: 'bg-red-100' },
};

// Standard or optional enum
export type StandardOptional = 'Standard' | 'Optional';

// Propulsion type
export type PropulsionType = 'Electric' | 'Diesel' | 'Hybrid' | 'Outboard';

// Boat models - now supports custom models
export type BoatModel = string;

// Default boat models (built-in)
// Real Eagle Boats models from eagleboats.nl
export const DEFAULT_BOAT_MODELS = [
  // TS Series (Flagship Electric)
  'Eagle 525T',
  'Eagle 25TS',
  'Eagle 28TS',
  'Eagle 32TS',
  // Classic Series (Dutch Sloep)
  'Eagle C550',
  'Eagle C570',
  'Eagle C720',
  'Eagle C999',
  // SG Series (Sport Grand)
  'Eagle 28SG',
  // Hybruut Series (Hybrid)
  'Eagle Hybruut 28',
  // Custom
  'Custom',
] as const;

// Boat Model Definition - for custom models
export interface BoatModelDefinition {
  id: string;
  name: string;
  description?: string;
  base_price_excl_vat: number;

  // Specifications
  length_m?: number;
  beam_m?: number;
  draft_m?: number;
  weight_kg?: number;
  max_persons?: number;
  ce_category?: 'A' | 'B' | 'C' | 'D';

  // Propulsion options
  available_propulsion: PropulsionType[];
  default_propulsion: PropulsionType;

  // Standard parts for this model
  standard_part_ids: string[];

  // Optional parts for this model
  optional_part_ids: string[];

  // Metadata
  is_active: boolean;
  is_default: boolean; // Built-in models
  created_at: string;
  updated_at: string;
  image_url?: string;
}

// Steering type
export type SteeringType = 'Hydraulic' | 'Mechanical' | 'Electronic';

// Project Category - High-level distinction
export type ProjectCategory = 'new_build' | 'maintenance' | 'refit';

// Project Category display info
export const PROJECT_CATEGORY_INFO: Record<ProjectCategory, {
  label_en: string;
  label_nl: string;
  color: string;
  bgColor: string;
  description_en: string;
  description_nl: string;
}> = {
  new_build: {
    label_en: 'New Build',
    label_nl: 'Nieuwbouw',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description_en: 'New vessel production',
    description_nl: 'Nieuwe scheepsbouw',
  },
  maintenance: {
    label_en: 'Maintenance',
    label_nl: 'Onderhoud',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    description_en: 'Service and maintenance work',
    description_nl: 'Service en onderhoudswerk',
  },
  refit: {
    label_en: 'Refit',
    label_nl: 'Refit',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    description_en: 'Major refurbishment or upgrade',
    description_nl: 'Grote renovatie of upgrade',
  },
};

// Production Stage
export type ProductionStage =
  | 'order_confirmed'
  | 'hull_construction'
  | 'structural_work'
  | 'propulsion_installation'
  | 'electrical_systems'
  | 'interior_finishing'
  | 'deck_equipment'
  | 'quality_inspection'
  | 'sea_trial'
  | 'final_delivery';

// Production Timeline Entry
export interface ProductionTimelineEntry {
  id: string;
  stage: ProductionStage;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  notes?: string;
  completed_by?: string;
  // Resource allocation
  assigned_workers?: string[]; // User IDs
  estimated_hours?: number;
  actual_hours?: number;
}

// Worker/Resource for production
export interface ProductionWorker {
  id: string;
  name: string;
  role: string;
  skills: ProductionStage[];
  availability: 'available' | 'busy' | 'unavailable';
  color: string; // For visual identification
}

// Article Document - for PDFs and manuals attached to parts
export interface ArticleDocument {
  id: string;
  name: string; // e.g., "Installation Manual", "User Guide"
  type: 'installation_manual' | 'user_manual' | 'datasheet' | 'certificate' | 'warranty' | 'other';
  filename: string;
  url: string;
  file_size_kb?: number;
  uploaded_at: string;
}

export const DOCUMENT_TYPES: Record<ArticleDocument['type'], { label: string; icon: string }> = {
  installation_manual: { label: 'Installation Manual', icon: 'Wrench' },
  user_manual: { label: 'User Manual', icon: 'BookOpen' },
  datasheet: { label: 'Datasheet', icon: 'FileSpreadsheet' },
  certificate: { label: 'Certificate', icon: 'Award' },
  warranty: { label: 'Warranty', icon: 'Shield' },
  other: { label: 'Other', icon: 'File' },
};

// Article/Part interface - full data model
export interface Article {
  id: string;

  // A. Identification
  part_name: string;
  category: string;
  subcategory: string;
  brand?: string;
  manufacturer_article_no?: string;
  supplier?: string;
  supplier_article_no?: string;
  internal_sku?: string;

  // B. Pricing
  purchase_price_excl_vat: number;
  sales_price_excl_vat: number;
  margin_percent?: number;
  discount_percent?: number;
  currency: string;
  price_valid_from?: string;
  price_valid_to?: string;
  // Weight-based pricing (for materials like hull plating)
  price_per_kg?: number;
  sales_price_per_kg?: number;
  price_calculation: 'fixed' | 'per_kg' | 'per_hour';

  // C. Technical & Logistics
  quantity_unit: QuantityUnit;
  weight_kg?: number;
  dimensions_lxhxw_mm?: string;
  material?: string;
  voltage_power?: string;
  compatibility_notes?: string;
  electric_compatible: boolean;
  diesel_compatible: boolean;
  hybrid_compatible: boolean;

  // D. Documentation
  website_url?: string;
  datasheet_url?: string;
  image_url?: string;

  // E. Technical Files
  model_3d_url?: string; // 3D model file (STEP, STL, OBJ, etc.)
  model_3d_filename?: string;
  cutout_url?: string; // Technical cutout/diagram image
  cutout_filename?: string;
  pdf_documents?: ArticleDocument[]; // Instruction manuals, installation guides, etc.

  // F. Stock
  stock_qty: number;
  min_stock_level: number;
  lead_time_days?: number;
  supplier_delivery_time_days?: number;
  // Stock management
  stock_status?: StockStatus;
  quantity_on_order?: number;
  order_reference?: string; // PO number or reference
  expected_delivery_date?: string;
  last_restocked_at?: string;
  reserved_qty?: number; // Reserved for production orders

  // G. Project Classification
  parts_list_category: string;
  parts_list_subcategory: string;
  boat_model_compat: BoatModel[];
  standard_or_optional: StandardOptional;
}

// Article Group Item - individual article in a group/kit
export interface ArticleGroupItem {
  article_id: string;
  quantity: number;
}

// Article Group/Kit - a collection of articles that form a logical unit
export interface ArticleGroup {
  id: string;
  name: string; // e.g., "Shaft Seal 40"
  description?: string;
  category: string; // Same categories as articles
  subcategory: string; // Same subcategories as articles

  // Component articles
  items: ArticleGroupItem[];

  // Pricing - can override calculated total
  use_custom_price: boolean;
  custom_price_excl_vat?: number;

  // Boat compatibility
  boat_model_compat: BoatModel[];
  standard_or_optional: StandardOptional;

  // Metadata
  is_active: boolean;
  created_at: string;
  updated_at: string;
  internal_sku?: string;
  notes?: string;
}

// Configuration item with quantity
export interface ConfigurationItem {
  article: Article;
  quantity: number;
  included: boolean; // Whether included in totals
  notes?: string;
  // For weight-based pricing (e.g., hull plating)
  weight_kg?: number;
  // For labour items
  labour_hours?: number;
}

// Production Order Status
export type ProductionOrderStatus = 'draft' | 'confirmed' | 'in_production' | 'completed' | 'cancelled';

// Production Order - for ordering multiple boats
export interface ProductionOrder {
  id: string;
  order_number: string;
  client_id?: string;
  status: ProductionOrderStatus;

  // Order details
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  target_completion_date?: string;

  // Boats in this order
  boats: ProductionOrderBoat[];

  // Parts requirements (aggregated from all boats)
  parts_requirements: ProductionOrderPart[];

  // Pricing
  total_price_excl_vat: number;
  discount_percent?: number;
  notes?: string;
}

// Individual boat in a production order
export interface ProductionOrderBoat {
  id: string;
  boat_model: BoatModel;
  configuration_id?: string; // Link to saved configuration
  hull_number?: string;
  propulsion_type: PropulsionType;

  // Custom specifications
  custom_options?: string[];
  notes?: string;

  // Status
  status: 'pending' | 'in_production' | 'completed';

  // Parts list adjustments for this specific boat
  parts_adjustments: ProductionOrderPartAdjustment[];
}

// Part requirement for production order
export interface ProductionOrderPart {
  article_id: string;
  article_name: string;
  category: string;
  quantity_required: number;
  quantity_in_stock: number;
  quantity_to_order: number;
  quantity_reserved: number;
  unit_price: number;
  total_price: number;
  status: 'available' | 'partial' | 'to_order' | 'ordered';
}

// Part adjustment for specific boat in order
export interface ProductionOrderPartAdjustment {
  article_id: string;
  adjustment_type: 'add' | 'remove' | 'modify_qty';
  quantity: number;
  reason?: string;
}

// Stock movement for tracking
export interface StockMovement {
  id: string;
  article_id: string;
  movement_type: 'received' | 'reserved' | 'used' | 'returned' | 'adjustment';
  quantity: number;
  reference_type?: 'production_order' | 'purchase_order' | 'manual';
  reference_id?: string;
  notes?: string;
  created_at: string;
  created_by_id?: string;
  created_by_name?: string;
}

// Client
export interface Client {
  id: string;
  // Company/Personal Info
  company_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile?: string;

  // Address
  street_address: string;
  postal_code: string;
  city: string;
  country: string;

  // Business Info
  vat_number?: string;
  chamber_of_commerce?: string;

  // Notes
  notes?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  status: 'active' | 'prospect' | 'inactive';
}

// Checklist category types per project type
export type NewBuildChecklistCategory = 'safety' | 'documentation' | 'systems' | 'quality' | 'handover';
export type MaintenanceChecklistCategory = 'intake' | 'service' | 'testing' | 'completion';
export type RefitChecklistCategory = 'survey' | 'structural' | 'systems' | 'documentation' | 'quality' | 'handover';
export type AnyChecklistCategory = NewBuildChecklistCategory | MaintenanceChecklistCategory | RefitChecklistCategory;

// Vessel completion checklist item
export interface VesselChecklistItem {
  id: string;
  category: string; // Flexible to support all project types
  description: string;
  required: boolean;
  completed: boolean;
  completed_by_id?: string;
  completed_by_name?: string;
  completed_at?: string;
  notes?: string;
}

// Default vessel completion checklist - FOR NEW BUILDS ONLY
export const DEFAULT_VESSEL_COMPLETION_CHECKLIST: Omit<VesselChecklistItem, 'id' | 'completed' | 'completed_by_id' | 'completed_by_name' | 'completed_at' | 'notes'>[] = [
  // Safety
  { category: 'safety', description: 'Fire extinguishers installed and inspected', required: true },
  { category: 'safety', description: 'Life jackets on board (per max persons)', required: true },
  { category: 'safety', description: 'Navigation lights tested', required: true },
  { category: 'safety', description: 'Bilge pump operational', required: true },
  { category: 'safety', description: 'Emergency equipment checked', required: true },
  // Documentation
  { category: 'documentation', description: 'CE Declaration of Conformity prepared', required: true },
  { category: 'documentation', description: 'Owner\'s Manual printed', required: true },
  { category: 'documentation', description: 'Technical File complete', required: true },
  { category: 'documentation', description: 'Warranty documentation prepared', required: true },
  { category: 'documentation', description: 'Registration papers ready', required: false },
  // Systems
  { category: 'systems', description: 'Engine/propulsion system tested', required: true },
  { category: 'systems', description: 'Electrical systems tested', required: true },
  { category: 'systems', description: 'Steering system tested', required: true },
  { category: 'systems', description: 'Fuel system leak-tested', required: true },
  { category: 'systems', description: 'Navigation electronics calibrated', required: false },
  // Quality
  { category: 'quality', description: 'Final visual inspection completed', required: true },
  { category: 'quality', description: 'Sea trial completed successfully', required: true },
  { category: 'quality', description: 'Defects/snag list resolved', required: true },
  { category: 'quality', description: 'Gelcoat/paint finish inspected', required: true },
  // Handover
  { category: 'handover', description: 'Client walkthrough scheduled', required: true },
  { category: 'handover', description: 'Keys and access devices ready', required: true },
  { category: 'handover', description: 'Fuel tank filled to agreed level', required: false },
  { category: 'handover', description: 'Cleaning completed', required: true },
];

// Maintenance service checklist - FOR MAINTENANCE PROJECTS
export const DEFAULT_MAINTENANCE_CHECKLIST: Omit<VesselChecklistItem, 'id' | 'completed' | 'completed_by_id' | 'completed_by_name' | 'completed_at' | 'notes'>[] = [
  // Intake
  { category: 'intake', description: 'Vessel received and inspected', required: true },
  { category: 'intake', description: 'Customer requirements documented', required: true },
  { category: 'intake', description: 'Pre-service photos taken', required: true },
  { category: 'intake', description: 'Engine hours recorded', required: true },
  // Service Work
  { category: 'service', description: 'Requested service work completed', required: true },
  { category: 'service', description: 'Parts replaced as specified', required: true },
  { category: 'service', description: 'Fluids topped up/replaced', required: false },
  { category: 'service', description: 'Filters replaced', required: false },
  // Testing
  { category: 'testing', description: 'Systems tested after service', required: true },
  { category: 'testing', description: 'No leaks detected', required: true },
  { category: 'testing', description: 'Test run completed', required: false },
  // Completion
  { category: 'completion', description: 'Work area cleaned', required: true },
  { category: 'completion', description: 'Service report prepared', required: true },
  { category: 'completion', description: 'Next service date noted', required: false },
  { category: 'completion', description: 'Customer notified', required: true },
];

// Refit completion checklist - FOR REFIT PROJECTS
export const DEFAULT_REFIT_CHECKLIST: Omit<VesselChecklistItem, 'id' | 'completed' | 'completed_by_id' | 'completed_by_name' | 'completed_at' | 'notes'>[] = [
  // Survey & Planning
  { category: 'survey', description: 'Initial survey completed', required: true },
  { category: 'survey', description: 'Scope of work documented', required: true },
  { category: 'survey', description: 'Before photos taken', required: true },
  { category: 'survey', description: 'Customer approval received', required: true },
  // Structural Work
  { category: 'structural', description: 'Hull modifications completed', required: false },
  { category: 'structural', description: 'Structural integrity verified', required: true },
  { category: 'structural', description: 'Welds inspected', required: false },
  // Systems Upgrade
  { category: 'systems', description: 'New systems installed', required: true },
  { category: 'systems', description: 'Electrical modifications tested', required: true },
  { category: 'systems', description: 'Propulsion changes verified', required: false },
  // Documentation
  { category: 'documentation', description: 'Modification records complete', required: true },
  { category: 'documentation', description: 'Updated specifications documented', required: true },
  { category: 'documentation', description: 'CE documentation updated (if required)', required: false },
  // Quality & Testing
  { category: 'quality', description: 'Visual inspection completed', required: true },
  { category: 'quality', description: 'Sea trial after refit', required: true },
  { category: 'quality', description: 'After photos taken', required: true },
  // Handover
  { category: 'handover', description: 'Changes explained to owner', required: true },
  { category: 'handover', description: 'All documentation handed over', required: true },
  { category: 'handover', description: 'Warranty terms explained', required: true },
];

// Checklist category info per project type
export const CHECKLIST_CATEGORIES_BY_PROJECT: Record<ProjectCategory, Record<string, { label: string; icon: string; color: string; bgColor: string }>> = {
  new_build: {
    safety: { label: 'Safety Equipment', icon: 'shield', color: 'text-red-600', bgColor: 'bg-red-100' },
    documentation: { label: 'CE Documentation', icon: 'file-text', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    systems: { label: 'Systems Testing', icon: 'cog', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    quality: { label: 'Quality Control', icon: 'star', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    handover: { label: 'Handover', icon: 'handshake', color: 'text-green-600', bgColor: 'bg-green-100' },
  },
  maintenance: {
    intake: { label: 'Intake', icon: 'clipboard', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    service: { label: 'Service Work', icon: 'wrench', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    testing: { label: 'Testing', icon: 'check-circle', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    completion: { label: 'Completion', icon: 'check', color: 'text-green-600', bgColor: 'bg-green-100' },
  },
  refit: {
    survey: { label: 'Survey & Planning', icon: 'search', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    structural: { label: 'Structural Work', icon: 'hammer', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    systems: { label: 'Systems Upgrade', icon: 'zap', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    documentation: { label: 'Documentation', icon: 'file-text', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
    quality: { label: 'Quality & Testing', icon: 'star', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    handover: { label: 'Handover', icon: 'handshake', color: 'text-green-600', bgColor: 'bg-green-100' },
  },
};

// Get default checklist for project type
export function getDefaultChecklistForProject(category: ProjectCategory): typeof DEFAULT_VESSEL_COMPLETION_CHECKLIST {
  switch (category) {
    case 'new_build':
      return DEFAULT_VESSEL_COMPLETION_CHECKLIST;
    case 'maintenance':
      return DEFAULT_MAINTENANCE_CHECKLIST;
    case 'refit':
      return DEFAULT_REFIT_CHECKLIST;
    default:
      return DEFAULT_VESSEL_COMPLETION_CHECKLIST;
  }
}

// Client's Boat (registered boat for a client)
export interface ClientBoat {
  id: string;
  client_id: string;
  boat_name?: string;
  hull_identification_number?: string;
  boat_model: BoatModel;
  propulsion_type: PropulsionType;
  configuration_id?: string;
  year_built?: number;
  delivery_date?: string;
  registration_number?: string;
  home_port?: string;
  notes?: string;
  status: 'ordered' | 'in_production' | 'delivered' | 'warranty';
  // Project category - distinguishes new builds from maintenance
  project_category: ProjectCategory;
  // Production tracking
  production_timeline?: ProductionTimelineEntry[];
  production_start_date?: string;
  estimated_delivery_date?: string;
  // CE Documentation
  vessel_specification?: VesselSpecification;
  // Engine hours tracking (for maintenance scheduling)
  engine_hours?: number;
  last_engine_hours_update?: string;
  // Completion checklist for delivery sign-off
  completion_checklist?: VesselChecklistItem[];
  completion_signoff?: {
    completed: boolean;
    signoff_by_id?: string;
    signoff_by_name?: string;
    signoff_at?: string;
    notes?: string;
  };
  created_at: string;
  updated_at: string;
}

// Boat configuration
export interface BoatConfiguration {
  id: string;
  name: string;
  client_id?: string;
  client_boat_id?: string;
  boat_model: BoatModel;
  propulsion_type: PropulsionType;
  steering_type: SteeringType;
  items: ConfigurationItem[];
  created_at: string;
  updated_at: string;
}

// Quotation
export interface Quotation {
  id: string;
  quotation_number: string;
  client_id?: string;
  client_boat_id?: string;
  date: string;
  valid_until: string;
  customer_name?: string;
  customer_address?: string;
  configuration: BoatConfiguration;
  vat_rate: number;
  delivery_terms: string;
  payment_terms: string;
  notes?: string;
  subtotal_excl_vat: number;
  vat_amount: number;
  total_incl_vat: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
}

// CE Documentation types
export interface CEDocument {
  id: string;
  document_type: 'declaration_of_conformity' | 'technical_file' | 'risk_assessment' | 'test_report' | 'user_manual';
  title: string;
  boat_model: BoatModel;
  configuration_id?: string;
  version: string;
  date: string;
  status: 'draft' | 'review' | 'approved' | 'archived';
  content: string;
  attachments?: string[];
}

// Category structure
export interface CategoryDefinition {
  id: string;
  name: string;
  subcategories: SubcategoryDefinition[];
}

export interface SubcategoryDefinition {
  id: string;
  name: string;
  items: string[];
}

// Comparison result
export interface ComparisonResult {
  configA: {
    name: string;
    subtotal_excl_vat: number;
    total_incl_vat: number;
  };
  configB: {
    name: string;
    subtotal_excl_vat: number;
    total_incl_vat: number;
  };
  delta_euro: number;
  delta_percent: number;
  key_differences: string[];
}

// Language codes
export type LanguageCode = 'en' | 'nl';

// ============================================
// CE OWNER'S MANUAL - VESSEL SPECIFICATION TYPES
// ============================================

// Design Category (RCD 2013/53/EU)
export type DesignCategory = 'A' | 'B' | 'C' | 'D';

// Vessel Type
export type VesselTypeExtended = 'open' | 'console' | 'cabin' | 'sailing' | 'catamaran' | 'rib' | 'electric' | 'hybrid' | 'other';

// Intended Use
export type IntendedUse = 'leisure' | 'day_cruising' | 'offshore' | 'coastal' | 'inland' | 'fishing' | 'racing' | 'charter' | 'training' | 'other';

// Hull Material
export type HullMaterial = 'GRP' | 'Aluminium' | 'Steel' | 'Wood' | 'Carbon' | 'Composite' | 'Ferrocement' | 'Hypalon' | 'PVC' | 'HDPE' | 'Other';

// Deck Material
export type DeckMaterial = 'GRP' | 'Aluminium' | 'Steel' | 'Wood' | 'Carbon' | 'Composite' | 'Teak' | 'Synthetic' | 'Other';

// Hull Type
export type HullType = 'displacement' | 'semi_displacement' | 'planing' | 'rib' | 'monohull' | 'catamaran' | 'trimaran' | 'foiling' | 'pontoon' | 'other';

// Propulsion Type Extended
export type PropulsionTypeExtended = 'outboard' | 'inboard' | 'sterndrive' | 'saildrive' | 'pod' | 'jet' | 'electric' | 'hybrid' | 'human' | 'none';

// Fuel Type
export type FuelType = 'none' | 'petrol' | 'gasoline' | 'diesel' | 'lpg' | 'cng' | 'hydrogen' | 'other';

// Battery Chemistry
export type BatteryChemistry = 'LFP' | 'NMC' | 'NCA' | 'Lead_Acid_AGM' | 'Lead_Acid_GEL' | 'Other';

// Charging Methods
export type ChargingMethod = 'shore_power_ac' | 'dc_fast' | 'onboard_generator' | 'regenerative_sailing' | 'solar_pv' | 'wind_turbine' | 'dc_dc_charger' | 'other';

// Steering Type Extended
export type SteeringTypeExtended = 'tiller' | 'mechanical_cable' | 'hydraulic' | 'wheel' | 'joystick' | 'autopilot' | 'dual_station' | 'none';

// Visibility Type
export type VisibilityType = 'direct' | 'assisted_camera' | 'flybridge' | 'enclosed_helm';

// Tank Material
export type TankMaterial = 'polyethylene' | 'aluminium' | 'stainless_steel' | 'steel' | 'grp' | 'flexible_bladder' | 'other';

// Ventilation Type
export type VentilationType = 'none' | 'natural' | 'forced_blower';

// Filler Type
export type FillerType = 'flush_deck' | 'raised_deck' | 'quick_connect' | 'other';

// Gas Locker Location
export type GasLockerLocation = 'cockpit_locker' | 'aft_locker' | 'dedicated_vented' | 'external_mount' | 'other';

// Pipe Material
export type PipeMaterial = 'copper' | 'stainless_steel' | 'approved_flexible_hose' | 'none' | 'other';

// Toilet Type
export type ToiletType = 'none' | 'chemical_portable' | 'manual_marine' | 'electric_marine' | 'vacuum_toilet' | 'composting' | 'other';

// Bilge Pump Type
export type BilgePumpType = 'none' | 'manual' | 'electric' | 'automatic_electric' | 'both';

// Life Saving Equipment
export type LifeSavingEquipment = 'lifejackets' | 'lifebuoy' | 'throwable_device' | 'first_aid_kit' | 'flares' | 'fire_blanket' | 'epirb' | 'plb' | 'vhf_radio' | 'radar_reflector' | 'none' | 'other';

// Rig Type
export type RigType = 'sloop' | 'cutter' | 'ketch' | 'yawl' | 'cat' | 'schooner' | 'other' | 'none';

// Reefing System
export type ReefingSystem = 'slab_reefing' | 'roller_reefing_headsail' | 'in_mast' | 'in_boom' | 'lazy_jacks' | 'none' | 'other';

// ============================================
// VESSEL SPECIFICATION INTERFACE (CE Compliant)
// ============================================

export interface VesselSpecification {
  // General Information
  general: {
    manufacturer: string;
    model_name: string;
    year_of_build: number | null;
    cin_win: string; // CIN/WIN (Hull Identification Number)
    design_category: DesignCategory | '';
    vessel_type: VesselTypeExtended | '';
    intended_use: IntendedUse | '';
  };

  // Dimensions
  dimensions: {
    length_overall_m: number | null;
    beam_m: number | null;
    draft_m: number | null;
    light_craft_mass_kg: number | null;
    max_load_kg: number | null;
    hull_material: HullMaterial | '';
    deck_material: DeckMaterial | '';
    hull_type: HullType | '';
  };

  // Propulsion
  propulsion: {
    propulsion_type: PropulsionTypeExtended | '';
    number_of_motors: number | null;
    power_per_motor_kw: number | null;
    fuel_type: FuelType | '';
    max_speed_knots: number | null;
    cruising_speed_knots: number | null;
    range_nm: number | null;
    electric: {
      battery_capacity_kwh: number | null;
      battery_voltage_v: number | null;
      battery_chemistry: BatteryChemistry | '';
      charging_methods: ChargingMethod[];
      max_charging_power_kw: number | null;
    };
  };

  // Steering
  steering: {
    steering_type: SteeringTypeExtended | '';
    number_of_helm_stations: number | null;
    visibility_type: VisibilityType | '';
    autopilot_installed: boolean;
    emergency_steering: boolean;
  };

  // Electrical System
  electrical_system: {
    dc_system: boolean;
    dc_voltage: number | null; // 12V, 24V, 48V
    ac_system: boolean;
    ac_voltage: number | null; // 230V, 110V
    number_of_batteries: number | null;
    battery_switches: boolean;
    fuse_panels: boolean;
    shore_power_inlet: boolean;
    inverter_charger: boolean;
    generator_installed: boolean;
    generator_power_kw: number | null;
    solar_panels_installed: boolean;
    solar_capacity_w: number | null;
  };

  // Fuel System
  fuel_system: {
    has_fuel_tank: boolean;
    tank_capacity_l: number | null;
    tank_material: TankMaterial | '';
    ventilation: VentilationType | '';
    filler_type: FillerType | '';
    fuel_filter_installed: boolean;
    fuel_shutoff_valve: boolean;
  };

  // Gas Installation
  gas_installation: {
    has_gas_system: boolean;
    number_of_cylinders: number | null;
    gas_locker_location: GasLockerLocation | '';
    pipe_material: PipeMaterial | '';
    regulator_present: boolean;
    gas_detector_installed: boolean;
    appliances: string[];
  };

  // Water and Waste Systems
  water_waste: {
    fresh_water_tank: boolean;
    fresh_water_capacity_l: number | null;
    water_pump: boolean;
    pressure_water_system: boolean;
    boiler: boolean;
    boiler_capacity_l: number | null;
    toilet_type: ToiletType | '';
    holding_tank: boolean;
    holding_tank_capacity_l: number | null;
    waste_water_tank: boolean;
    waste_water_capacity_l: number | null;
    deck_drain: boolean;
  };

  // Safety Equipment
  safety: {
    navigation_lights: boolean;
    anchor_light: boolean;
    bilge_pump: BilgePumpType | '';
    fire_extinguishers: number | null;
    fire_blanket: boolean;
    kill_switch: boolean;
    life_saving_equipment: LifeSavingEquipment[];
    flares: boolean;
    first_aid_kit: boolean;
    vhf_radio: boolean;
    epirb: boolean;
    radar_reflector: boolean;
    horn_whistle: boolean;
    liferaft: boolean;
    liferaft_capacity: number | null;
    max_persons: number | null;
  };

  // Sailing Equipment
  sailing_equipment: {
    has_sails: boolean;
    rig_type: RigType | '';
    mainsail: boolean;
    mainsail_area_m2: number | null;
    headsail: boolean;
    headsail_area_m2: number | null;
    spinnaker: boolean;
    reefing_systems: ReefingSystem[];
    winches: number | null;
    furling_systems: boolean;
  };

  // Rental/Charter Information
  rental: {
    is_rental: boolean;
    rental_restrictions: string;
    renter_responsibilities: string;
    owner_responsibilities: string;
    required_license: string;
    minimum_age: number | null;
  };

  // Additional Equipment & Features
  additional: {
    bow_thruster: boolean;
    stern_thruster: boolean;
    trim_tabs: boolean;
    anchor_windlass: boolean;
    davits: boolean;
    cockpit_table: boolean;
    bimini_top: boolean;
    spray_hood: boolean;
    cockpit_cover: boolean;
    swimming_platform: boolean;
    swimming_ladder: boolean;
    deck_shower: boolean;
    refrigerator: boolean;
    stove: boolean;
    oven: boolean;
    microwave: boolean;
    heating: boolean;
    air_conditioning: boolean;
    stereo_system: boolean;
    chartplotter: boolean;
    depth_sounder: boolean;
    wind_instruments: boolean;
    ais: boolean;
  };
}

// Default empty vessel specification
export const DEFAULT_VESSEL_SPECIFICATION: VesselSpecification = {
  general: {
    manufacturer: 'NAVISOL B.V.',
    model_name: '',
    year_of_build: null,
    cin_win: '',
    design_category: '',
    vessel_type: '',
    intended_use: '',
  },
  dimensions: {
    length_overall_m: null,
    beam_m: null,
    draft_m: null,
    light_craft_mass_kg: null,
    max_load_kg: null,
    hull_material: '',
    deck_material: '',
    hull_type: '',
  },
  propulsion: {
    propulsion_type: '',
    number_of_motors: null,
    power_per_motor_kw: null,
    fuel_type: '',
    max_speed_knots: null,
    cruising_speed_knots: null,
    range_nm: null,
    electric: {
      battery_capacity_kwh: null,
      battery_voltage_v: null,
      battery_chemistry: '',
      charging_methods: [],
      max_charging_power_kw: null,
    },
  },
  steering: {
    steering_type: '',
    number_of_helm_stations: null,
    visibility_type: '',
    autopilot_installed: false,
    emergency_steering: false,
  },
  electrical_system: {
    dc_system: false,
    dc_voltage: null,
    ac_system: false,
    ac_voltage: null,
    number_of_batteries: null,
    battery_switches: false,
    fuse_panels: false,
    shore_power_inlet: false,
    inverter_charger: false,
    generator_installed: false,
    generator_power_kw: null,
    solar_panels_installed: false,
    solar_capacity_w: null,
  },
  fuel_system: {
    has_fuel_tank: false,
    tank_capacity_l: null,
    tank_material: '',
    ventilation: '',
    filler_type: '',
    fuel_filter_installed: false,
    fuel_shutoff_valve: false,
  },
  gas_installation: {
    has_gas_system: false,
    number_of_cylinders: null,
    gas_locker_location: '',
    pipe_material: '',
    regulator_present: false,
    gas_detector_installed: false,
    appliances: [],
  },
  water_waste: {
    fresh_water_tank: false,
    fresh_water_capacity_l: null,
    water_pump: false,
    pressure_water_system: false,
    boiler: false,
    boiler_capacity_l: null,
    toilet_type: '',
    holding_tank: false,
    holding_tank_capacity_l: null,
    waste_water_tank: false,
    waste_water_capacity_l: null,
    deck_drain: false,
  },
  safety: {
    navigation_lights: false,
    anchor_light: false,
    bilge_pump: '',
    fire_extinguishers: null,
    fire_blanket: false,
    kill_switch: false,
    life_saving_equipment: [],
    flares: false,
    first_aid_kit: false,
    vhf_radio: false,
    epirb: false,
    radar_reflector: false,
    horn_whistle: false,
    liferaft: false,
    liferaft_capacity: null,
    max_persons: null,
  },
  sailing_equipment: {
    has_sails: false,
    rig_type: '',
    mainsail: false,
    mainsail_area_m2: null,
    headsail: false,
    headsail_area_m2: null,
    spinnaker: false,
    reefing_systems: [],
    winches: null,
    furling_systems: false,
  },
  rental: {
    is_rental: false,
    rental_restrictions: '',
    renter_responsibilities: '',
    owner_responsibilities: '',
    required_license: '',
    minimum_age: null,
  },
  additional: {
    bow_thruster: false,
    stern_thruster: false,
    trim_tabs: false,
    anchor_windlass: false,
    davits: false,
    cockpit_table: false,
    bimini_top: false,
    spray_hood: false,
    cockpit_cover: false,
    swimming_platform: false,
    swimming_ladder: false,
    deck_shower: false,
    refrigerator: false,
    stove: false,
    oven: false,
    microwave: false,
    heating: false,
    air_conditioning: false,
    stereo_system: false,
    chartplotter: false,
    depth_sounder: false,
    wind_instruments: false,
    ais: false,
  },
};

// Design Category descriptions
export const DESIGN_CATEGORY_INFO: Record<DesignCategory, { name: string; description: string; wind_force: string; wave_height: string }> = {
  A: {
    name: 'Ocean',
    description: 'Designed for extended voyages where conditions may exceed wind force 8 (Beaufort scale) and significant wave height of 4 m and above.',
    wind_force: '> 8 Beaufort',
    wave_height: '> 4 m',
  },
  B: {
    name: 'Offshore',
    description: 'Designed for offshore voyages where conditions up to and including wind force 8 and significant wave heights up to and including 4 m may be experienced.',
    wind_force: '≤ 8 Beaufort',
    wave_height: '≤ 4 m',
  },
  C: {
    name: 'Inshore',
    description: 'Designed for voyages in coastal waters, large bays, estuaries, lakes, and rivers where conditions up to and including wind force 6 and significant wave heights up to and including 2 m may be experienced.',
    wind_force: '≤ 6 Beaufort',
    wave_height: '≤ 2 m',
  },
  D: {
    name: 'Sheltered Waters',
    description: 'Designed for voyages on sheltered coastal waters, small bays, small lakes, rivers, and canals where conditions up to and including wind force 4 and significant wave heights up to and including 0.3 m may be experienced.',
    wind_force: '≤ 4 Beaufort',
    wave_height: '≤ 0.3 m',
  },
};

// Extended BoatConfiguration with vessel specification
export interface BoatConfigurationExtended extends BoatConfiguration {
  vessel_specification?: VesselSpecification;
}

// ============================================
// MEDIA NOTES - INTERNAL PHOTOS MODULE
// ============================================

// Media status
export type MediaStatus = 'pending' | 'ready' | 'deleted';

// Media Note interface for internal photos
export interface MediaNote {
  id: string;
  vessel_instance_id: string; // Links to ClientBoat.id

  // File storage
  s3_key: string; // In demo: base64 data URL or blob URL
  thumb_key?: string; // Thumbnail version

  // Metadata
  labels: string[]; // Free-form, normalized (lowercase, trimmed)
  notes?: string; // Max 2000 chars, HTML stripped
  taken_at?: string; // ISO-8601 datetime
  geotag_lat?: number; // -90 to 90
  geotag_lon?: number; // -180 to 180

  // File info
  byte_size?: number;
  width?: number;
  height?: number;
  content_type: string; // image/jpeg, image/png, image/webp
  original_filename?: string;

  // Status & tracking
  status: MediaStatus;
  internal_only: true; // Always true
  uploader_id: string;
  uploaded_at: string;
  updated_at?: string;
  deleted_at?: string; // Soft delete timestamp
}

// Media upload request
export interface MediaUploadRequest {
  vessel_instance_id: string;
  labels?: string[];
  notes?: string;
  taken_at?: string;
  geotag_lat?: number;
  geotag_lon?: number;
}

// Presigned upload response (simulated)
export interface PresignedUploadResponse {
  media_id: string;
  upload_url: string; // In demo: not used, direct base64 storage
  s3_key: string;
}

// Media validation constants
export const MEDIA_VALIDATION = {
  MAX_FILE_SIZE_BYTES: 25 * 1024 * 1024, // 25 MB
  MAX_LABELS: 10,
  MAX_LABEL_LENGTH: 32,
  MAX_NOTES_LENGTH: 2000,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  PRESIGNED_URL_EXPIRY_SECONDS: 60,
};

// Audit log entry for media actions
export interface MediaAuditLog {
  id: string;
  action: 'upload' | 'update' | 'delete' | 'view';
  user_id: string;
  vessel_id: string;
  media_id: string;
  timestamp: string;
  summary: string;
  diff?: Record<string, { old: unknown; new: unknown }>;
}

// Helper function to normalize labels
export function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().slice(0, MEDIA_VALIDATION.MAX_LABEL_LENGTH);
}

// Helper function to validate and deduplicate labels
export function normalizeLabels(labels: string[]): string[] {
  const normalized = labels
    .map(normalizeLabel)
    .filter(l => l.length > 0);

  // Deduplicate case-insensitive
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const label of normalized) {
    if (!seen.has(label)) {
      seen.add(label);
      unique.push(label);
    }
  }

  return unique.slice(0, MEDIA_VALIDATION.MAX_LABELS);
}

// Helper function to strip HTML from notes
export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .slice(0, MEDIA_VALIDATION.MAX_NOTES_LENGTH);
}

// Helper function to validate media file
export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes: readonly string[] = MEDIA_VALIDATION.ALLOWED_TYPES;
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${MEDIA_VALIDATION.ALLOWED_TYPES.join(', ')}` };
  }
  if (file.size > MEDIA_VALIDATION.MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File too large. Maximum: ${MEDIA_VALIDATION.MAX_FILE_SIZE_BYTES / 1024 / 1024} MB` };
  }
  return { valid: true };
}

// Helper function to validate geotag
export function validateGeotag(lat?: number, lon?: number): boolean {
  if (lat !== undefined && (lat < -90 || lat > 90)) return false;
  if (lon !== undefined && (lon < -180 || lon > 180)) return false;
  return true;
}

// Global settings
export interface GlobalSettings {
  language: LanguageCode;
  currency: string;
  vat_rate: number;
  delivery_terms: string;
  quotation_validity_days: number;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  language: 'nl',
  currency: 'EUR',
  vat_rate: 0.21,
  delivery_terms: 'Ex works Elburg',
  quotation_validity_days: 30,
  company_name: 'NAVISOL B.V.',
  company_address: 'Industriestraat 25, 8081HH Elburg',
  company_phone: '+31 (0)85 0600 139',
  company_email: 'info@navisol.nl',
};

// Production stages with display names
export const PRODUCTION_STAGES: { id: ProductionStage; name_en: string; name_nl: string; order: number }[] = [
  { id: 'order_confirmed', name_en: 'Order Confirmed', name_nl: 'Order Bevestigd', order: 1 },
  { id: 'hull_construction', name_en: 'Hull Construction', name_nl: 'Cascobouw', order: 2 },
  { id: 'structural_work', name_en: 'Structural Work', name_nl: 'Constructiewerk', order: 3 },
  { id: 'propulsion_installation', name_en: 'Propulsion Installation', name_nl: 'Voortstuwing Installatie', order: 4 },
  { id: 'electrical_systems', name_en: 'Electrical Systems', name_nl: 'Elektrische Systemen', order: 5 },
  { id: 'interior_finishing', name_en: 'Interior Finishing', name_nl: 'Interieur Afwerking', order: 6 },
  { id: 'deck_equipment', name_en: 'Deck Equipment', name_nl: 'Dekuitrusting', order: 7 },
  { id: 'quality_inspection', name_en: 'Quality Inspection', name_nl: 'Kwaliteitscontrole', order: 8 },
  { id: 'sea_trial', name_en: 'Sea Trial', name_nl: 'Proefvaart', order: 9 },
  { id: 'final_delivery', name_en: 'Final Delivery', name_nl: 'Eindlevering', order: 10 },
];

// Maintenance-specific stages (subset/different workflow)
export type MaintenanceStage =
  | 'intake'
  | 'diagnosis'
  | 'parts_ordering'
  | 'repair_work'
  | 'testing'
  | 'delivery';

export const MAINTENANCE_STAGES: { id: MaintenanceStage; name_en: string; name_nl: string; order: number }[] = [
  { id: 'intake', name_en: 'Intake', name_nl: 'Intake', order: 1 },
  { id: 'diagnosis', name_en: 'Diagnosis', name_nl: 'Diagnose', order: 2 },
  { id: 'parts_ordering', name_en: 'Parts Ordering', name_nl: 'Onderdelen Bestellen', order: 3 },
  { id: 'repair_work', name_en: 'Repair Work', name_nl: 'Reparatiewerk', order: 4 },
  { id: 'testing', name_en: 'Testing', name_nl: 'Testen', order: 5 },
  { id: 'delivery', name_en: 'Delivery', name_nl: 'Oplevering', order: 6 },
];

// Get stages based on project category
export function getStagesForCategory(category: ProjectCategory): typeof PRODUCTION_STAGES | typeof MAINTENANCE_STAGES {
  if (category === 'maintenance') {
    return MAINTENANCE_STAGES;
  }
  return PRODUCTION_STAGES; // new_build and refit use full production stages
}

// ============================================
// TASK MANAGEMENT & TIME TRACKING
// ============================================

// Task status
export type TaskStatus = 'open' | 'in_progress' | 'done';

// Project type
export type ProjectType = 'internal' | 'external';

// Task interface
export interface Task {
  id: string;
  vessel_instance_id: string; // Links to ClientBoat.id
  title: string;
  description?: string;
  assigned_to_id?: string; // User ID
  status: TaskStatus;
  due_date?: string; // ISO-8601 date
  billable: boolean;
  project_type: ProjectType;
  created_at: string;
  updated_at: string;
  created_by_id: string;
}

// Time entry interface
export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  start_at: string; // ISO-8601 datetime
  end_at?: string; // ISO-8601 datetime (null if timer still running)
  duration_min: number; // Duration in minutes
  billable: boolean;
  notes?: string;
  created_at: string;
}

// Active timer state
export interface ActiveTimer {
  task_id: string;
  user_id: string;
  start_at: string;
  paused_at?: string;
  accumulated_min: number; // Time accumulated before current session
  is_paused: boolean;
}

// Task with time entries for display
export interface TaskWithTime extends Task {
  total_time_min: number;
  time_entries: TimeEntry[];
  vessel_name?: string;
  assigned_to_name?: string;
}

// Time report grouping options
export type TimeReportGroupBy = 'vessel' | 'task' | 'user';

// Time report filters
export interface TimeReportFilters {
  date_from?: string;
  date_to?: string;
  billable?: boolean;
  project_type?: ProjectType;
  vessel_id?: string;
  user_id?: string;
}

// Time report summary item
export interface TimeReportSummary {
  group_key: string;
  group_name: string;
  total_hours: number;
  total_entries: number;
  billable_hours: number;
  non_billable_hours: number;
}

// Task status display info
export const TASK_STATUS_INFO: Record<TaskStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-slate-500' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500' },
  done: { label: 'Done', color: 'bg-green-500' },
};

// Project type display info
export const PROJECT_TYPE_INFO: Record<ProjectType, { label: string; color: string }> = {
  internal: { label: 'Internal', color: 'bg-purple-500' },
  external: { label: 'External', color: 'bg-orange-500' },
};

// ============================================
// MAINTENANCE HISTORY & RECURRING SCHEDULES
// ============================================

// Maintenance record types
export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'upgrade' | 'warranty' | 'emergency';

export const MAINTENANCE_TYPE_INFO: Record<MaintenanceType, { label_en: string; label_nl: string; color: string; icon: string }> = {
  routine: { label_en: 'Routine Service', label_nl: 'Routineonderhoud', color: 'bg-blue-500', icon: 'wrench' },
  repair: { label_en: 'Repair', label_nl: 'Reparatie', color: 'bg-orange-500', icon: 'tool' },
  inspection: { label_en: 'Inspection', label_nl: 'Inspectie', color: 'bg-teal-500', icon: 'search' },
  upgrade: { label_en: 'Upgrade', label_nl: 'Upgrade', color: 'bg-purple-500', icon: 'arrow-up' },
  warranty: { label_en: 'Warranty Work', label_nl: 'Garantiewerk', color: 'bg-green-500', icon: 'shield' },
  emergency: { label_en: 'Emergency', label_nl: 'Noodgeval', color: 'bg-red-500', icon: 'alert' },
};

// Maintenance history record
export interface MaintenanceRecord {
  id: string;
  vessel_id: string;
  maintenance_type: MaintenanceType;
  title: string;
  description?: string;
  // Timing
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  // Work details
  work_performed: string;
  parts_used?: { article_id?: string; name: string; quantity: number; cost: number }[];
  // Costs
  labor_hours: number;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  // Status
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  // Linked data
  related_task_id?: string;
  related_schedule_id?: string;
  technician_id?: string;
  technician_name?: string;
  // Checklist completion
  checklist_items?: CompletedChecklistItem[];
  checklist_complete?: boolean; // All required items completed
  // Sign-off
  signoff_required?: boolean;
  signoff_completed?: boolean;
  signoff_by_id?: string;
  signoff_by_name?: string;
  signoff_at?: string;
  signoff_notes?: string;
  // Next service
  next_service_date?: string;
  next_service_notes?: string;
  // Metadata
  created_at: string;
  updated_at: string;
  created_by_id: string;
}

// Recurrence pattern for scheduled maintenance
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'engine_hours' | 'custom';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number; // e.g., every 2 weeks, every 3 months
  // For engine hours based
  engine_hours_interval?: number;
  // For custom
  custom_days?: number;
  // End conditions
  end_date?: string;
  occurrences?: number;
}

export const RECURRENCE_INFO: Record<RecurrenceType, { label_en: string; label_nl: string }> = {
  none: { label_en: 'One-time', label_nl: 'Eenmalig' },
  daily: { label_en: 'Daily', label_nl: 'Dagelijks' },
  weekly: { label_en: 'Weekly', label_nl: 'Wekelijks' },
  monthly: { label_en: 'Monthly', label_nl: 'Maandelijks' },
  quarterly: { label_en: 'Quarterly', label_nl: 'Per kwartaal' },
  biannual: { label_en: 'Every 6 months', label_nl: 'Halfjaarlijks' },
  annual: { label_en: 'Annual', label_nl: 'Jaarlijks' },
  engine_hours: { label_en: 'Engine Hours', label_nl: 'Motoruren' },
  custom: { label_en: 'Custom', label_nl: 'Aangepast' },
};

// Checklist item for maintenance
export interface ChecklistItem {
  id: string;
  description: string;
  required: boolean; // Must be completed for sign-off
  order: number;
}

// Completed checklist item (in a record)
export interface CompletedChecklistItem {
  item_id: string;
  description: string;
  required: boolean;
  completed: boolean;
  completed_by_id?: string;
  completed_by_name?: string;
  completed_at?: string;
  notes?: string;
}

// Maintenance schedule template
export interface MaintenanceSchedule {
  id: string;
  vessel_id: string;
  // Schedule definition
  title: string;
  description?: string;
  maintenance_type: MaintenanceType;
  recurrence: RecurrenceRule;
  // Timing
  first_due_date: string;
  last_completed_date?: string;
  next_due_date: string;
  // Alerts
  reminder_days_before: number; // Days before due to send reminder
  overdue_alert: boolean;
  // Estimated work
  estimated_hours: number;
  estimated_cost: number;
  // Checklist template items
  checklist: ChecklistItem[];
  // Sign-off requirements
  requires_signoff: boolean;
  signoff_role?: string; // e.g., 'manager', 'technician'
  // Status
  is_active: boolean;
  // Metadata
  created_at: string;
  updated_at: string;
  created_by_id: string;
}

// Maintenance alert/reminder
export interface MaintenanceAlert {
  id: string;
  schedule_id: string;
  vessel_id: string;
  vessel_name: string;
  title: string;
  due_date: string;
  days_until_due: number;
  is_overdue: boolean;
  maintenance_type: MaintenanceType;
  estimated_hours: number;
}

// Helper to calculate next due date based on recurrence
export function calculateNextDueDate(lastDate: string, recurrence: RecurrenceRule): string {
  const date = new Date(lastDate);
  const interval = recurrence.interval || 1;

  switch (recurrence.type) {
    case 'daily':
      date.setDate(date.getDate() + interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (7 * interval));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + interval);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + (3 * interval));
      break;
    case 'biannual':
      date.setMonth(date.getMonth() + (6 * interval));
      break;
    case 'annual':
      date.setFullYear(date.getFullYear() + interval);
      break;
    case 'custom':
      date.setDate(date.getDate() + (recurrence.custom_days || 30));
      break;
    default:
      // No recurrence
      break;
  }

  return date.toISOString().split('T')[0];
}

// ============================================
// OPERATING PROCEDURES / TASK INSTRUCTIONS
// ============================================

// Procedure categories - same as parts categories for consistency
export type ProcedureCategory =
  | 'hull_structural'
  | 'propulsion_drivetrain'
  | 'steering_system'
  | 'electrical_navigation'
  | 'deck_equipment'
  | 'interior_finishing'
  | 'safety_certification'
  | 'plumbing_ventilation'
  | 'project_operations';

export const PROCEDURE_CATEGORY_INFO: Record<ProcedureCategory, {
  label_en: string;
  label_nl: string;
  color: string;
  bgColor: string;
  partsCategory: string; // Maps to parts category name
}> = {
  hull_structural: {
    label_en: 'Hull & Structural',
    label_nl: 'Casco & Constructie',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    partsCategory: '1. Hull & Structural Components',
  },
  propulsion_drivetrain: {
    label_en: 'Propulsion & Drivetrain',
    label_nl: 'Voortstuwing & Aandrijving',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    partsCategory: '2. Propulsion & Drivetrain',
  },
  steering_system: {
    label_en: 'Steering System',
    label_nl: 'Stuursysteem',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    partsCategory: '3. Steering System',
  },
  electrical_navigation: {
    label_en: 'Electrical & Navigation',
    label_nl: 'Elektrisch & Navigatie',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    partsCategory: '4. Electrical System & Navigation',
  },
  deck_equipment: {
    label_en: 'Deck Equipment & Comfort',
    label_nl: 'Dekuitrusting & Comfort',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    partsCategory: '5. Deck Equipment & Comfort',
  },
  interior_finishing: {
    label_en: 'Interior & Finishing',
    label_nl: 'Interieur & Afwerking',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    partsCategory: '6. Interior & Finishing',
  },
  safety_certification: {
    label_en: 'Safety & Certification',
    label_nl: 'Veiligheid & Certificering',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    partsCategory: '7. Safety & Certification',
  },
  plumbing_ventilation: {
    label_en: 'Plumbing & Ventilation',
    label_nl: 'Sanitair & Ventilatie',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    partsCategory: '8. Plumbing & Ventilation',
  },
  project_operations: {
    label_en: 'Project & Operations',
    label_nl: 'Project & Operaties',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    partsCategory: '9. Project & Operational Costs',
  },
};

// Content block types for procedures
export type ContentBlockType = 'text' | 'heading' | 'list' | 'image' | 'pdf' | 'warning' | 'tip' | 'steps';

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  order: number;
  // For text/heading/warning/tip
  content?: string;
  // For lists
  items?: string[];
  listType?: 'bullet' | 'numbered';
  // For images
  image_url?: string;
  image_caption?: string;
  // For PDFs
  pdf_url?: string;
  pdf_name?: string;
  pdf_size?: number;
  // For headings
  heading_level?: 1 | 2 | 3;
  // For steps (numbered instructions)
  steps?: { step: number; instruction: string; image_url?: string }[];
}

// Operating Procedure
export interface OperatingProcedure {
  id: string;
  title: string;
  description?: string;
  category: ProcedureCategory;
  subcategory?: string; // Optional subcategory for further organization
  // Target audience
  applicable_models: BoatModel[];
  // Content
  content_blocks: ContentBlock[];
  // Version control
  version: string;
  revision_notes?: string;
  // Status
  status: 'draft' | 'review' | 'approved' | 'archived';
  // Metadata
  created_by_id: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  approved_by_id?: string;
  approved_by_name?: string;
  approved_at?: string;
  // Tags for search
  tags: string[];
}

// ============================================
// CHECKLIST TEMPLATES
// ============================================

export interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  boat_model: BoatModel | 'all';
  checklist_type: 'vessel_completion' | 'maintenance' | 'quality_check' | 'safety_inspection';
  items: ChecklistTemplateItem[];
  is_active: boolean;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplateItem {
  id: string;
  category: string;
  description: string;
  required: boolean;
  order: number;
  procedure_id?: string; // Link to operating procedure
  photo_required: boolean;
  photo_count?: number;
  instructions?: string;
}

// Photo attachment for checklist items
export interface ChecklistItemPhoto {
  id: string;
  checklist_item_id: string;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  uploaded_by_id: string;
  uploaded_by_name: string;
  uploaded_at: string;
}

// Extended completed checklist item with photos
export interface CompletedChecklistItemWithPhotos extends CompletedChecklistItem {
  photos?: ChecklistItemPhoto[];
  photo_required?: boolean;
}

// Extended vessel checklist item with photos
export interface VesselChecklistItemWithPhotos extends VesselChecklistItem {
  photos?: ChecklistItemPhoto[];
  photo_required?: boolean;
  instructions?: string;
  procedure_id?: string;
}

/**
 * Template Service - v4
 * Manages document templates with placeholder system and versioning
 */

import type {
  Project,
  Client,
  LibraryDocumentTemplate,
  TemplateVersion,
  DocumentType,
  VersionStatus,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { TemplateRepository } from '@/data/repositories/LibraryRepository';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';

// ============================================
// PLACEHOLDER DEFINITIONS (STATIC, NOT INFERRED)
// ============================================

export interface PlaceholderDefinition {
  key: string;
  label: string;
  description: string;
  category: 'project' | 'client' | 'company' | 'configuration' | 'date' | 'quote' | 'equipmentList' | 'model';
  example: string;
}

/**
 * STATIC placeholder documentation per document type.
 * Used in template editor to show available placeholders.
 * NOT inferred at runtime - explicitly defined for each document type.
 */
/**
 * Model specification placeholders - available when a boat model is associated with the project
 */
const MODEL_PLACEHOLDERS: PlaceholderDefinition[] = [
  // Basic model info
  { key: '{{model.name}}', label: 'Model Name', description: 'Boat model name', category: 'model', example: 'Eagle 32TS' },
  { key: '{{model.range}}', label: 'Model Range', description: 'Model series/range', category: 'model', example: 'TS Series' },
  { key: '{{model.version}}', label: 'Model Version', description: 'Specification version', category: 'model', example: '2.1.0' },

  // Hull specifications
  { key: '{{model.hull.material}}', label: 'Hull Material', description: 'Construction material', category: 'model', example: 'Marine Grade Aluminium' },
  { key: '{{model.hull.type}}', label: 'Hull Type', description: 'Hull design type', category: 'model', example: 'Semi-displacement' },
  { key: '{{model.hull.construction}}', label: 'Construction', description: 'Construction method', category: 'model', example: 'Welded' },

  // Dimensions
  { key: '{{model.dimensions.loa}}', label: 'Length Overall', description: 'LOA in meters', category: 'model', example: '9.70' },
  { key: '{{model.dimensions.lwl}}', label: 'Length Waterline', description: 'LWL in meters', category: 'model', example: '8.50' },
  { key: '{{model.dimensions.beam}}', label: 'Beam', description: 'Beam in meters', category: 'model', example: '3.20' },
  { key: '{{model.dimensions.draft}}', label: 'Draft', description: 'Draft in meters', category: 'model', example: '0.65' },
  { key: '{{model.dimensions.airDraft}}', label: 'Air Draft', description: 'Height above waterline', category: 'model', example: '2.80' },

  // Weight & Capacity
  { key: '{{model.weight.displacement}}', label: 'Displacement', description: 'Light ship weight in kg', category: 'model', example: '4,200' },
  { key: '{{model.weight.maxLoad}}', label: 'Max Load', description: 'Maximum load in kg', category: 'model', example: '1,200' },
  { key: '{{model.capacity.fuel}}', label: 'Fuel Capacity', description: 'Fuel tank in liters', category: 'model', example: '200' },
  { key: '{{model.capacity.water}}', label: 'Water Capacity', description: 'Water tank in liters', category: 'model', example: '100' },

  // Propulsion
  { key: '{{model.propulsion.type}}', label: 'Propulsion Type', description: 'Propulsion system type', category: 'model', example: 'Electric' },
  { key: '{{model.propulsion.maxPower}}', label: 'Max Power', description: 'Maximum power in kW', category: 'model', example: '60' },
  { key: '{{model.propulsion.maxSpeed}}', label: 'Max Speed', description: 'Maximum speed in knots', category: 'model', example: '22' },
  { key: '{{model.propulsion.range}}', label: 'Range', description: 'Cruising range in NM', category: 'model', example: '45' },

  // Electrical
  { key: '{{model.electrical.voltage}}', label: 'System Voltage', description: 'Main system voltage', category: 'model', example: '48V' },
  { key: '{{model.electrical.batteryCapacity}}', label: 'Battery Capacity', description: 'Battery capacity in Ah', category: 'model', example: '400' },
  { key: '{{model.electrical.batteryType}}', label: 'Battery Type', description: 'Battery chemistry', category: 'model', example: 'LiFePO4' },

  // Compliance
  { key: '{{model.compliance.ceCategory}}', label: 'CE Category', description: 'Design category A/B/C/D', category: 'model', example: 'B' },
  { key: '{{model.compliance.ceCategoryDesc}}', label: 'CE Category Description', description: 'Category explanation', category: 'model', example: 'Offshore - wind up to 8 Beaufort' },
  { key: '{{model.compliance.maxPersons}}', label: 'Max Persons', description: 'Maximum number of persons', category: 'model', example: '12' },
  { key: '{{model.compliance.standards}}', label: 'Applied Standards', description: 'List of applied ISO standards', category: 'model', example: 'ISO 12215, ISO 12217' },
  { key: '{{model.compliance.rcdModule}}', label: 'RCD Module', description: 'Conformity assessment module', category: 'model', example: 'A1' },

  // Safety equipment
  { key: '{{model.safety.lifeJackets}}', label: 'Life Jackets', description: 'Required life jackets', category: 'model', example: '12' },
  { key: '{{model.safety.lifebuoys}}', label: 'Lifebuoys', description: 'Required lifebuoys', category: 'model', example: '2' },
  { key: '{{model.safety.fireExtinguishers}}', label: 'Fire Extinguishers', description: 'Required fire extinguishers', category: 'model', example: '2' },
  { key: '{{model.safety.requirementsHtml}}', label: 'Safety Requirements', description: 'Full safety requirements list', category: 'model', example: '<ul>...</ul>' },

  // Full specification tables
  { key: '{{model.specificationsTable}}', label: 'Specifications Table', description: 'Full specs in table format', category: 'model', example: '<table>...</table>' },
];

export const PLACEHOLDER_DOCS_BY_TYPE: Record<DocumentType, PlaceholderDefinition[]> = {
  // Common placeholders available in all document types
  CE_DECLARATION: [
    { key: '{{project.number}}', label: 'Project Number', description: 'Project reference number', category: 'project', example: 'PRJ-2026-0001' },
    { key: '{{project.title}}', label: 'Project Title', description: 'Name of the project', category: 'project', example: 'Eagle 32 Sport' },
    { key: '{{client.name}}', label: 'Client Name', description: 'Full client name', category: 'client', example: 'Marina Rotterdam B.V.' },
    { key: '{{client.address}}', label: 'Client Address', description: 'Full address', category: 'client', example: 'Havenstraat 25, Rotterdam' },
    { key: '{{company.name}}', label: 'Company Name', description: 'Manufacturer name', category: 'company', example: 'Eagle Boats B.V.' },
    { key: '{{company.address}}', label: 'Company Address', description: 'Manufacturer address', category: 'company', example: 'Industriestraat 25, Elburg' },
    { key: '{{date.today}}', label: 'Today', description: 'Current date', category: 'date', example: '7 January 2026' },
    // Model placeholders for CE Declaration
    ...MODEL_PLACEHOLDERS.filter(p =>
      p.key.includes('model.name') ||
      p.key.includes('model.compliance') ||
      p.key.includes('model.dimensions') ||
      p.key.includes('model.hull') ||
      p.key.includes('model.propulsion.type') ||
      p.key.includes('specificationsTable')
    ),
  ],
  OWNERS_MANUAL: [
    { key: '{{project.number}}', label: 'Project Number', description: 'Project reference number', category: 'project', example: 'PRJ-2026-0001' },
    { key: '{{project.title}}', label: 'Project Title', description: 'Name of the project', category: 'project', example: 'Eagle 32 Sport' },
    { key: '{{company.name}}', label: 'Company Name', description: 'Manufacturer name', category: 'company', example: 'Eagle Boats B.V.' },
    { key: '{{date.today}}', label: 'Today', description: 'Current date', category: 'date', example: '7 January 2026' },
    // All model placeholders for Owner's Manual
    ...MODEL_PLACEHOLDERS,
  ],
  TECHNICAL_FILE: [
    { key: '{{project.number}}', label: 'Project Number', description: 'Project reference number', category: 'project', example: 'PRJ-2026-0001' },
    { key: '{{project.title}}', label: 'Project Title', description: 'Name of the project', category: 'project', example: 'Eagle 32 Sport' },
    { key: '{{company.name}}', label: 'Company Name', description: 'Manufacturer name', category: 'company', example: 'Eagle Boats B.V.' },
    { key: '{{date.today}}', label: 'Today', description: 'Current date', category: 'date', example: '7 January 2026' },
    // All model placeholders for Technical File
    ...MODEL_PLACEHOLDERS,
  ],
  DELIVERY_NOTE: [
    { key: '{{project.number}}', label: 'Project Number', description: 'Project reference number', category: 'project', example: 'PRJ-2026-0001' },
    { key: '{{project.title}}', label: 'Project Title', description: 'Name of the project', category: 'project', example: 'Eagle 32 Sport' },
    { key: '{{client.name}}', label: 'Client Name', description: 'Full client name', category: 'client', example: 'Marina Rotterdam B.V.' },
    { key: '{{client.address}}', label: 'Client Address', description: 'Full address', category: 'client', example: 'Havenstraat 25, Rotterdam' },
    { key: '{{company.name}}', label: 'Company Name', description: 'Manufacturer name', category: 'company', example: 'Eagle Boats B.V.' },
    { key: '{{date.today}}', label: 'Today', description: 'Current date', category: 'date', example: '7 January 2026' },
  ],
  INVOICE: [
    { key: '{{project.number}}', label: 'Project Number', description: 'Project reference number', category: 'project', example: 'PRJ-2026-0001' },
    { key: '{{project.title}}', label: 'Project Title', description: 'Name of the project', category: 'project', example: 'Eagle 32 Sport' },
    { key: '{{client.name}}', label: 'Client Name', description: 'Full client name', category: 'client', example: 'Marina Rotterdam B.V.' },
    { key: '{{client.address}}', label: 'Client Address', description: 'Full address', category: 'client', example: 'Havenstraat 25, Rotterdam' },
    { key: '{{client.vat}}', label: 'Client VAT', description: 'VAT registration number', category: 'client', example: 'NL123456789B01' },
    { key: '{{company.name}}', label: 'Company Name', description: 'Your company name', category: 'company', example: 'Eagle Boats B.V.' },
    { key: '{{company.address}}', label: 'Company Address', description: 'Your company address', category: 'company', example: 'Industriestraat 25, Elburg' },
    { key: '{{company.vat}}', label: 'Company VAT', description: 'Your VAT number', category: 'company', example: 'NL123456789B01' },
    { key: '{{company.kvk}}', label: 'Company KvK', description: 'Chamber of Commerce number', category: 'company', example: '12345678' },
    { key: '{{config.totalExclVat}}', label: 'Total excl. VAT', description: 'Configuration total before VAT', category: 'configuration', example: '€ 125.000,00' },
    { key: '{{config.totalInclVat}}', label: 'Total incl. VAT', description: 'Configuration total with VAT', category: 'configuration', example: '€ 151.250,00' },
    { key: '{{config.allItemsTable}}', label: 'Items Table', description: 'Table of all configuration items', category: 'configuration', example: '<table>...</table>' },
    { key: '{{date.today}}', label: 'Today', description: 'Current date', category: 'date', example: '7 January 2026' },
  ],
  QUOTE: [
    { key: '{{project.number}}', label: 'Project Number', description: 'Project reference number', category: 'project', example: 'PRJ-2026-0001' },
    { key: '{{project.title}}', label: 'Project Title', description: 'Name of the project', category: 'project', example: 'Eagle 32 Sport' },
    { key: '{{client.name}}', label: 'Client Name', description: 'Full client name', category: 'client', example: 'Marina Rotterdam B.V.' },
    { key: '{{client.address}}', label: 'Client Address', description: 'Full address', category: 'client', example: 'Havenstraat 25, Rotterdam' },
    { key: '{{client.vat}}', label: 'Client VAT', description: 'VAT registration number', category: 'client', example: 'NL123456789B01' },
    { key: '{{company.name}}', label: 'Company Name', description: 'Your company name', category: 'company', example: 'Eagle Boats B.V.' },
    { key: '{{company.address}}', label: 'Company Address', description: 'Your company address', category: 'company', example: 'Industriestraat 25, Elburg' },
    { key: '{{company.phone}}', label: 'Company Phone', description: 'Phone number', category: 'company', example: '+31 85 0600 139' },
    { key: '{{company.email}}', label: 'Company Email', description: 'Email address', category: 'company', example: 'info@eagleboats.nl' },
    { key: '{{company.vat}}', label: 'Company VAT', description: 'Your VAT number', category: 'company', example: 'NL123456789B01' },
    { key: '{{company.kvk}}', label: 'Company KvK', description: 'Chamber of Commerce number', category: 'company', example: '12345678' },
    { key: '{{quote.number}}', label: 'Quote Number', description: 'Quotation reference', category: 'quote', example: 'QUO-2026-0001-v1' },
    { key: '{{quote.date}}', label: 'Quote Date', description: 'Date quote was created', category: 'quote', example: '7 January 2026' },
    { key: '{{quote.validUntil}}', label: 'Valid Until', description: 'Quote expiry date', category: 'quote', example: '7 February 2026' },
    { key: '{{quote.statusBadge}}', label: 'Status Badge', description: 'DRAFT or FINAL badge HTML', category: 'quote', example: '<span>DRAFT</span>' },
    { key: '{{quote.itemsTable}}', label: 'Items Table', description: 'Category-grouped items table', category: 'quote', example: '<table>...</table>' },
    { key: '{{quote.subtotal}}', label: 'Subtotal', description: 'Total before discount', category: 'quote', example: '€ 125.000,00' },
    { key: '{{quote.discountRow}}', label: 'Discount Row', description: 'Discount line (if any)', category: 'quote', example: '<div>-10%</div>' },
    { key: '{{quote.totalExclVat}}', label: 'Total excl. VAT', description: 'Total after discount', category: 'quote', example: '€ 112.500,00' },
    { key: '{{quote.vatRate}}', label: 'VAT Rate', description: 'VAT percentage', category: 'quote', example: '21' },
    { key: '{{quote.vatAmount}}', label: 'VAT Amount', description: 'Calculated VAT', category: 'quote', example: '€ 23.625,00' },
    { key: '{{quote.totalInclVat}}', label: 'Total incl. VAT', description: 'Final total with VAT', category: 'quote', example: '€ 136.125,00' },
    { key: '{{quote.paymentTerms}}', label: 'Payment Terms', description: 'Payment conditions', category: 'quote', example: '50% on order, 50% on delivery' },
    { key: '{{quote.deliveryTerms}}', label: 'Delivery Terms', description: 'Delivery conditions', category: 'quote', example: 'Ex Works' },
    { key: '{{quote.deliveryWeeks}}', label: 'Delivery Weeks', description: 'Estimated delivery time', category: 'quote', example: '12' },
    { key: '{{quote.notesSection}}', label: 'Notes Section', description: 'Notes HTML (if any)', category: 'quote', example: '<div>...</div>' },
    { key: '{{date.today}}', label: 'Today', description: 'Current date', category: 'date', example: '7 January 2026' },
  ],
  EQUIPMENT_LIST: [
    { key: '{{project.number}}', label: 'Project Number', description: 'Project reference number', category: 'project', example: 'PRJ-2026-0001' },
    { key: '{{project.title}}', label: 'Project Title', description: 'Name of the project', category: 'project', example: 'Eagle 32 Sport' },
    { key: '{{client.name}}', label: 'Client Name', description: 'Full client name', category: 'client', example: 'Marina Rotterdam B.V.' },
    { key: '{{company.name}}', label: 'Company Name', description: 'Your company name', category: 'company', example: 'Eagle Boats B.V.' },
    { key: '{{company.address}}', label: 'Company Address', description: 'Your company address', category: 'company', example: 'Industriestraat 25, Elburg' },
    { key: '{{company.phone}}', label: 'Company Phone', description: 'Phone number', category: 'company', example: '+31 85 0600 139' },
    { key: '{{company.email}}', label: 'Company Email', description: 'Email address', category: 'company', example: 'info@eagleboats.nl' },
    { key: '{{equipmentList.version}}', label: 'Version', description: 'Equipment list version number', category: 'equipmentList', example: '1' },
    { key: '{{equipmentList.unitLabel}}', label: 'Unit Label', description: 'Optional unit identifier', category: 'equipmentList', example: 'Unit 001' },
    { key: '{{equipmentList.date}}', label: 'Generated Date', description: 'Date of generation', category: 'equipmentList', example: '7 January 2026' },
    { key: '{{equipmentList.totalItems}}', label: 'Total Items', description: 'Number of equipment items', category: 'equipmentList', example: '24' },
    { key: '{{equipmentList.totalCategories}}', label: 'Total Categories', description: 'Number of categories', category: 'equipmentList', example: '6' },
    { key: '{{equipmentList.sectionsHtml}}', label: 'Sections HTML', description: 'Category sections with items', category: 'equipmentList', example: '<div>...</div>' },
    { key: '{{equipmentList.ceItems}}', label: 'CE Items Count', description: 'Number of CE-relevant items', category: 'equipmentList', example: '8' },
    { key: '{{equipmentList.safetyItems}}', label: 'Safety Items Count', description: 'Number of safety-critical items', category: 'equipmentList', example: '3' },
    { key: '{{date.today}}', label: 'Today', description: 'Current date', category: 'date', example: '7 January 2026' },
    // Model placeholders for Equipment List
    ...MODEL_PLACEHOLDERS.filter(p =>
      p.key.includes('model.name') ||
      p.key.includes('model.range') ||
      p.key.includes('specificationsTable')
    ),
  ],
};

/**
 * Get placeholder documentation for a specific document type.
 * Returns a static, pre-defined list - NOT inferred at runtime.
 */
export function getPlaceholderDocsForType(type: DocumentType): PlaceholderDefinition[] {
  return PLACEHOLDER_DOCS_BY_TYPE[type] || [];
}

export const TEMPLATE_PLACEHOLDERS: PlaceholderDefinition[] = [
  // Project placeholders
  { key: '{{project.number}}', label: 'Project Number', description: 'e.g. PRJ-2026-0001', category: 'project', example: 'PRJ-2026-0001' },
  { key: '{{project.title}}', label: 'Project Title', description: 'Name of the project', category: 'project', example: 'Eagle 32 Sport for Marina Rotterdam' },
  { key: '{{project.type}}', label: 'Project Type', description: 'NEW_BUILD, REFIT, etc.', category: 'project', example: 'NEW BUILD' },
  { key: '{{project.status}}', label: 'Project Status', description: 'Current status', category: 'project', example: 'In Production' },
  { key: '{{project.propulsion}}', label: 'Propulsion Type', description: 'Electric, Hybrid, etc.', category: 'project', example: 'Electric' },

  // Client placeholders
  { key: '{{client.name}}', label: 'Client Name', description: 'Full client name', category: 'client', example: 'Marina Rotterdam B.V.' },
  { key: '{{client.address}}', label: 'Client Address', description: 'Full address', category: 'client', example: 'Havenstraat 25, 3011 Rotterdam' },
  { key: '{{client.city}}', label: 'Client City', description: 'City name', category: 'client', example: 'Rotterdam' },
  { key: '{{client.country}}', label: 'Client Country', description: 'Country name', category: 'client', example: 'Netherlands' },
  { key: '{{client.email}}', label: 'Client Email', description: 'Email address', category: 'client', example: 'info@marina-rotterdam.nl' },
  { key: '{{client.vat}}', label: 'Client VAT Number', description: 'VAT registration', category: 'client', example: 'NL123456789B01' },

  // Company placeholders
  { key: '{{company.name}}', label: 'Company Name', description: 'Your company name', category: 'company', example: 'Eagle Boats B.V.' },
  { key: '{{company.address}}', label: 'Company Address', description: 'Full address', category: 'company', example: 'Industriestraat 25, 8081HH Elburg' },
  { key: '{{company.phone}}', label: 'Company Phone', description: 'Phone number', category: 'company', example: '+31 (0)85 0600 139' },
  { key: '{{company.email}}', label: 'Company Email', description: 'Email address', category: 'company', example: 'info@eagleboats.nl' },
  { key: '{{company.vat}}', label: 'Company VAT', description: 'VAT number', category: 'company', example: 'NL123456789B01' },
  { key: '{{company.kvk}}', label: 'Company KvK', description: 'Chamber of Commerce', category: 'company', example: '12345678' },

  // Configuration placeholders
  { key: '{{config.totalExclVat}}', label: 'Total excl. VAT', description: 'Configuration total', category: 'configuration', example: '€ 125.000,00' },
  { key: '{{config.totalInclVat}}', label: 'Total incl. VAT', description: 'Configuration total with VAT', category: 'configuration', example: '€ 151.250,00' },
  { key: '{{config.itemCount}}', label: 'Item Count', description: 'Number of items', category: 'configuration', example: '24' },
  { key: '{{config.ceItemsTable}}', label: 'CE Items Table', description: 'Table of CE-relevant items', category: 'configuration', example: '<table>...</table>' },
  { key: '{{config.safetyItemsTable}}', label: 'Safety Items Table', description: 'Table of safety-critical items', category: 'configuration', example: '<table>...</table>' },
  { key: '{{config.allItemsTable}}', label: 'All Items Table', description: 'Table of all configuration items', category: 'configuration', example: '<table>...</table>' },

  // Date placeholders
  { key: '{{date.today}}', label: 'Today', description: 'Current date', category: 'date', example: '7 January 2026' },
  { key: '{{date.year}}', label: 'Year', description: 'Current year', category: 'date', example: '2026' },
  { key: '{{date.month}}', label: 'Month', description: 'Current month', category: 'date', example: 'January' },
];

// ============================================
// DEFAULT TEMPLATES
// ============================================

const DEFAULT_CE_DECLARATION = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.6; }
    .container { padding: 60px; max-width: 700px; margin: 0 auto; border: 3px solid #0d9488; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { font-size: 24pt; color: #0d9488; margin-bottom: 10px; }
    .header h2 { font-size: 14pt; color: #64748b; font-weight: normal; }
    .ce-mark { font-size: 48pt; font-weight: bold; color: #0d9488; text-align: center; margin: 30px 0; }
    .section { margin-bottom: 25px; }
    .section h3 { font-size: 10pt; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.5px; }
    .section p { margin: 0; }
    .signature { margin-top: 60px; display: flex; justify-content: space-between; }
    .signature-box { width: 45%; }
    .signature-line { border-top: 1px solid #1e293b; margin-top: 60px; padding-top: 8px; font-size: 9pt; color: #64748b; }
    .footer { margin-top: 40px; text-align: center; font-size: 9pt; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EC DECLARATION OF CONFORMITY</h1>
      <h2>In accordance with Recreational Craft Directive 2013/53/EU</h2>
    </div>

    <div class="ce-mark">CE</div>

    <div class="section">
      <h3>Manufacturer</h3>
      <p><strong>{{company.name}}</strong></p>
      <p>{{company.address}}</p>
    </div>

    <div class="section">
      <h3>Product Identification</h3>
      <p><strong>Project:</strong> {{project.title}}</p>
      <p><strong>Project Number:</strong> {{project.number}}</p>
      <p><strong>Type:</strong> {{project.type}}</p>
      <p><strong>Propulsion:</strong> {{project.propulsion}}</p>
    </div>

    <div class="section">
      <h3>Owner</h3>
      <p>{{client.name}}</p>
      <p>{{client.city}}, {{client.country}}</p>
    </div>

    <div class="section">
      <h3>Declaration</h3>
      <p>We hereby declare that the above-mentioned recreational craft, when placed on the market, complies with the essential safety requirements of the Recreational Craft Directive 2013/53/EU and all other applicable EU directives.</p>
    </div>

    <div class="section">
      <h3>Applied Standards</h3>
      <p>ISO 12215 - Small craft hull construction and scantlings</p>
      <p>ISO 12217 - Small craft stability and buoyancy assessment</p>
      <p>ISO 10240 - Small craft owner's manual</p>
      <p>ISO 13297 - Small craft electrical systems</p>
    </div>

    <div class="signature">
      <div class="signature-box">
        <div class="signature-line">Place and Date</div>
        <p style="margin-top: 8px;">Elburg, {{date.today}}</p>
      </div>
      <div class="signature-box">
        <div class="signature-line">Authorized Signatory</div>
        <p style="margin-top: 8px;">{{company.name}}</p>
      </div>
    </div>

    <div class="footer">
      <p>This declaration is issued under the sole responsibility of the manufacturer.</p>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_OWNERS_MANUAL = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.6; }
    .container { padding: 40px; max-width: 800px; margin: 0 auto; }
    .cover { text-align: center; padding: 100px 40px; page-break-after: always; }
    .cover h1 { font-size: 32pt; color: #0d9488; margin-bottom: 20px; }
    .cover h2 { font-size: 18pt; color: #64748b; margin-bottom: 40px; }
    .cover .project { font-size: 14pt; color: #0f172a; }
    h1 { font-size: 18pt; color: #0d9488; margin: 30px 0 15px; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
    h2 { font-size: 14pt; color: #0f172a; margin: 20px 0 10px; }
    p { margin-bottom: 12px; }
    ul { margin-left: 20px; margin-bottom: 12px; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .warning h3 { color: #b45309; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; border: 1px solid #e2e8f0; text-align: left; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>OWNER'S MANUAL</h1>
    <h2>Operation and Maintenance Guide</h2>
    <p class="project">{{project.title}}</p>
    <p>Project: {{project.number}}</p>
    <p>Owner: {{client.name}}</p>
    <p>Date: {{date.month}} {{date.year}}</p>
  </div>

  <div class="container">
    <h1>1. Introduction</h1>
    <p>Welcome to your new Eagle Boat. This manual provides essential information for the safe operation and maintenance of your vessel.</p>
    <p>Please read this manual carefully before operating the boat and keep it on board at all times.</p>

    <h1>2. Vessel Specifications</h1>
    <table>
      <tr><th>Project Number</th><td>{{project.number}}</td></tr>
      <tr><th>Project Type</th><td>{{project.type}}</td></tr>
      <tr><th>Propulsion</th><td>{{project.propulsion}}</td></tr>
      <tr><th>Owner</th><td>{{client.name}}</td></tr>
    </table>

    <h1>3. Safety Instructions</h1>
    <div class="warning">
      <h3>Warning</h3>
      <p>Always wear appropriate safety equipment including life jackets when on board.</p>
    </div>
    <ul>
      <li>Familiarize yourself with all safety equipment locations</li>
      <li>Check weather conditions before departure</li>
      <li>Ensure adequate fuel/battery charge for your journey</li>
      <li>File a float plan with someone ashore</li>
      <li>Carry all required safety equipment as per regulations</li>
    </ul>

    <h1>4. Equipment Installed</h1>
    {{config.allItemsTable}}

    <h1>5. Maintenance Schedule</h1>
    <h2>Daily Checks</h2>
    <ul>
      <li>Visual inspection of hull and deck</li>
      <li>Check battery charge level</li>
      <li>Verify navigation lights operation</li>
    </ul>
    <h2>Monthly Checks</h2>
    <ul>
      <li>Inspect all safety equipment</li>
      <li>Check bilge pump operation</li>
      <li>Clean and inspect battery terminals</li>
    </ul>
    <h2>Annual Service</h2>
    <ul>
      <li>Full electrical system check</li>
      <li>Antifouling renewal</li>
      <li>Safety equipment certification</li>
    </ul>

    <h1>6. Contact Information</h1>
    <p><strong>{{company.name}}</strong></p>
    <p>{{company.address}}</p>
    <p>Phone: {{company.phone}}</p>
    <p>Email: {{company.email}}</p>
  </div>
</body>
</html>`;

const DEFAULT_TECHNICAL_FILE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #1e293b; line-height: 1.5; }
    .container { padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #0d9488; padding-bottom: 20px; }
    .header h1 { font-size: 24pt; color: #0d9488; margin-bottom: 10px; }
    .header h2 { font-size: 12pt; color: #64748b; font-weight: normal; }
    h1 { font-size: 14pt; color: #0d9488; margin: 25px 0 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    h2 { font-size: 12pt; color: #0f172a; margin: 15px 0 10px; }
    p { margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9pt; }
    th, td { padding: 8px; border: 1px solid #e2e8f0; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    .section { margin-bottom: 30px; }
    .toc { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .toc h2 { margin-top: 0; }
    .toc ul { margin: 0; padding-left: 20px; }
    .toc li { margin: 5px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TECHNICAL FILE</h1>
      <h2>Recreational Craft Directive 2013/53/EU</h2>
      <p><strong>{{project.title}}</strong></p>
      <p>{{project.number}}</p>
    </div>

    <div class="toc">
      <h2>Table of Contents</h2>
      <ul>
        <li>1. General Description</li>
        <li>2. Design and Construction</li>
        <li>3. Stability Information</li>
        <li>4. Propulsion System</li>
        <li>5. Electrical Installation</li>
        <li>6. CE-Relevant Equipment</li>
        <li>7. Safety Equipment</li>
        <li>8. Risk Assessment</li>
        <li>9. Test Reports</li>
        <li>10. Manufacturer Declaration</li>
      </ul>
    </div>

    <div class="section">
      <h1>1. General Description</h1>
      <table>
        <tr><th width="30%">Project Number</th><td>{{project.number}}</td></tr>
        <tr><th>Project Title</th><td>{{project.title}}</td></tr>
        <tr><th>Project Type</th><td>{{project.type}}</td></tr>
        <tr><th>Owner</th><td>{{client.name}}</td></tr>
        <tr><th>Manufacturer</th><td>{{company.name}}</td></tr>
        <tr><th>Date</th><td>{{date.today}}</td></tr>
      </table>
    </div>

    <div class="section">
      <h1>2. Design and Construction</h1>
      <p>This vessel has been designed and constructed in accordance with the essential requirements of the Recreational Craft Directive 2013/53/EU.</p>
      <h2>Applied Standards</h2>
      <table>
        <tr><th>Standard</th><th>Title</th></tr>
        <tr><td>ISO 12215</td><td>Small craft - Hull construction and scantlings</td></tr>
        <tr><td>ISO 12217</td><td>Small craft - Stability and buoyancy assessment</td></tr>
        <tr><td>ISO 8665</td><td>Small craft - Marine propulsion engines and systems</td></tr>
        <tr><td>ISO 10133</td><td>Small craft - Electrical systems - Extra-low-voltage DC</td></tr>
        <tr><td>ISO 13297</td><td>Small craft - Electrical systems - AC installations</td></tr>
        <tr><td>ISO 10240</td><td>Small craft - Owner's manual</td></tr>
      </table>
    </div>

    <div class="section">
      <h1>3. Stability Information</h1>
      <p>Stability calculations have been performed in accordance with ISO 12217. The vessel meets the requirements for the designated design category.</p>
    </div>

    <div class="section">
      <h1>4. Propulsion System</h1>
      <table>
        <tr><th>Propulsion Type</th><td>{{project.propulsion}}</td></tr>
      </table>
    </div>

    <div class="section">
      <h1>5. Electrical Installation</h1>
      <p>The electrical installation complies with ISO 10133 (DC) and ISO 13297 (AC where applicable).</p>
    </div>

    <div class="section">
      <h1>6. CE-Relevant Equipment</h1>
      {{config.ceItemsTable}}
    </div>

    <div class="section">
      <h1>7. Safety Equipment</h1>
      {{config.safetyItemsTable}}
    </div>

    <div class="section">
      <h1>8. Risk Assessment</h1>
      <p>A risk assessment has been performed in accordance with the essential requirements of the RCD 2013/53/EU. Identified risks have been mitigated through design measures or warnings in the owner's manual.</p>
    </div>

    <div class="section">
      <h1>9. Test Reports</h1>
      <p>The following tests have been / will be performed:</p>
      <ul>
        <li>Stability test</li>
        <li>Watertightness test</li>
        <li>Electrical system test</li>
        <li>Propulsion system test</li>
        <li>Sea trials</li>
      </ul>
    </div>

    <div class="section">
      <h1>10. Manufacturer Declaration</h1>
      <p>{{company.name}} declares that this technical file contains all information required by the Recreational Craft Directive 2013/53/EU and that the vessel described herein meets the essential requirements.</p>
      <p style="margin-top: 40px;">
        <strong>{{company.name}}</strong><br>
        {{company.address}}<br>
        Date: {{date.today}}
      </p>
    </div>

    <div class="footer">
      <p>Technical File - {{project.number}} - Confidential</p>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_DELIVERY_NOTE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.6; }
    .container { padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24pt; font-weight: bold; color: #0d9488; }
    .document-title { font-size: 20pt; color: #0d9488; margin-bottom: 30px; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .meta-section h3 { font-size: 10pt; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; border: 1px solid #e2e8f0; text-align: left; }
    th { background: #f1f5f9; }
    .signature-section { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
    .signature-box { border-top: 1px solid #1e293b; padding-top: 10px; }
    .signature-box p { font-size: 10pt; color: #64748b; }
    .footer { margin-top: 40px; text-align: center; font-size: 9pt; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">{{company.name}}</div>
      <div style="text-align: right; font-size: 10pt; color: #64748b;">
        <p>{{company.address}}</p>
        <p>{{company.phone}}</p>
      </div>
    </div>

    <div class="document-title">DELIVERY NOTE</div>

    <div class="meta-grid">
      <div class="meta-section">
        <h3>Delivered To</h3>
        <p><strong>{{client.name}}</strong></p>
        <p>{{client.address}}</p>
      </div>
      <div class="meta-section">
        <h3>Delivery Details</h3>
        <p><strong>Project:</strong> {{project.title}}</p>
        <p><strong>Project Number:</strong> {{project.number}}</p>
        <p><strong>Date:</strong> {{date.today}}</p>
      </div>
    </div>

    <h3 style="margin-top: 30px; color: #0d9488;">Items Delivered</h3>
    {{config.allItemsTable}}

    <h3 style="margin-top: 30px; color: #0d9488;">Documents Provided</h3>
    <table>
      <tr><th>Document</th><th>Version</th><th>Provided</th></tr>
      <tr><td>Owner's Manual</td><td>1.0</td><td>Yes</td></tr>
      <tr><td>CE Declaration of Conformity</td><td>1.0</td><td>Yes</td></tr>
      <tr><td>Technical File</td><td>1.0</td><td>On request</td></tr>
    </table>

    <div class="signature-section">
      <div class="signature-box">
        <p>Delivered by ({{company.name}})</p>
        <p style="margin-top: 40px;">Name: _____________________</p>
        <p>Signature: _____________________</p>
        <p>Date: {{date.today}}</p>
      </div>
      <div class="signature-box">
        <p>Received by ({{client.name}})</p>
        <p style="margin-top: 40px;">Name: _____________________</p>
        <p>Signature: _____________________</p>
        <p>Date: _____________________</p>
      </div>
    </div>

    <div class="footer">
      <p>{{company.name}} - {{company.address}} - VAT: {{company.vat}}</p>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_INVOICE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #1e293b; line-height: 1.5; }
    .container { padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24pt; font-weight: bold; color: #0d9488; }
    .invoice-title { font-size: 28pt; color: #0d9488; margin-bottom: 20px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .meta-section h3 { font-size: 8pt; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f1f5f9; padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 9pt; text-transform: uppercase; color: #64748b; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .totals { margin-left: auto; width: 300px; margin-top: 30px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .totals-row.final { border-top: 2px solid #0d9488; border-bottom: none; padding-top: 12px; font-size: 14pt; font-weight: bold; color: #0d9488; }
    .payment-info { margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; }
    .footer { margin-top: 40px; text-align: center; font-size: 8pt; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo">{{company.name}}</div>
        <p style="color: #64748b; font-size: 9pt; margin-top: 5px;">{{company.address}}</p>
      </div>
      <div style="text-align: right; font-size: 9pt; color: #64748b;">
        <p>{{company.phone}}</p>
        <p>{{company.email}}</p>
        <p>VAT: {{company.vat}}</p>
        <p>KvK: {{company.kvk}}</p>
      </div>
    </div>

    <div class="invoice-title">INVOICE</div>

    <div class="meta-grid">
      <div class="meta-section">
        <h3>Bill To</h3>
        <p><strong>{{client.name}}</strong></p>
        <p>{{client.address}}</p>
        <p>VAT: {{client.vat}}</p>
      </div>
      <div class="meta-section">
        <h3>Invoice Details</h3>
        <p><strong>Invoice Number:</strong> INV-{{project.number}}</p>
        <p><strong>Invoice Date:</strong> {{date.today}}</p>
        <p><strong>Due Date:</strong> 30 days</p>
        <p><strong>Project:</strong> {{project.title}}</p>
      </div>
    </div>

    {{config.allItemsTable}}

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>{{config.totalExclVat}}</span>
      </div>
      <div class="totals-row">
        <span>VAT (21%)</span>
        <span>Calculated</span>
      </div>
      <div class="totals-row final">
        <span>Total</span>
        <span>{{config.totalInclVat}}</span>
      </div>
    </div>

    <div class="payment-info">
      <h3 style="margin: 0 0 10px 0; color: #0f172a;">Payment Information</h3>
      <p><strong>Bank:</strong> ING Bank N.V.</p>
      <p><strong>IBAN:</strong> NL00 INGB 0000 0000 00</p>
      <p><strong>BIC:</strong> INGBNL2A</p>
      <p><strong>Reference:</strong> {{project.number}}</p>
    </div>

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>{{company.name}} - {{company.address}} - KvK: {{company.kvk}}</p>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_QUOTE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #1e293b; line-height: 1.5; }
    .container { padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24pt; font-weight: bold; color: #0d9488; }
    .quote-title { font-size: 28pt; color: #0d9488; margin-bottom: 20px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 9pt; font-weight: bold; margin-left: 10px; }
    .status-draft { background: #fef3c7; color: #92400e; }
    .status-final { background: #d1fae5; color: #065f46; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .meta-section h3 { font-size: 8pt; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f1f5f9; padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 9pt; text-transform: uppercase; color: #64748b; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .category-header { background: #f8fafc; font-weight: bold; }
    .category-total { text-align: right; font-weight: bold; color: #0d9488; }
    .optional { color: #64748b; font-style: italic; }
    .totals { margin-left: auto; width: 300px; margin-top: 30px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .totals-row.discount { color: #059669; }
    .totals-row.final { border-top: 2px solid #0d9488; border-bottom: none; padding-top: 12px; font-size: 14pt; font-weight: bold; color: #0d9488; }
    .terms { margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; }
    .terms h3 { margin: 0 0 15px 0; color: #0f172a; }
    .terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .notes-section { margin-top: 30px; padding: 15px; background: #fffbeb; border-left: 4px solid #f59e0b; }
    .notes-title { font-weight: bold; color: #92400e; margin-bottom: 8px; }
    .footer { margin-top: 40px; text-align: center; font-size: 8pt; color: #94a3b8; }
    .validity { margin-top: 20px; padding: 15px; background: #fef2f2; border-radius: 8px; text-align: center; }
    .validity strong { color: #dc2626; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo">{{company.name}}</div>
        <p style="color: #64748b; font-size: 9pt; margin-top: 5px;">{{company.address}}</p>
      </div>
      <div style="text-align: right; font-size: 9pt; color: #64748b;">
        <p>{{company.phone}}</p>
        <p>{{company.email}}</p>
        <p>VAT: {{company.vat}}</p>
        <p>KvK: {{company.kvk}}</p>
      </div>
    </div>

    <div class="quote-title">QUOTATION {{quote.statusBadge}}</div>

    <div class="meta-grid">
      <div class="meta-section">
        <h3>Quote For</h3>
        <p><strong>{{client.name}}</strong></p>
        <p>{{client.address}}</p>
        <p>VAT: {{client.vat}}</p>
      </div>
      <div class="meta-section">
        <h3>Quote Details</h3>
        <p><strong>Quote Number:</strong> {{quote.number}}</p>
        <p><strong>Quote Date:</strong> {{quote.date}}</p>
        <p><strong>Valid Until:</strong> {{quote.validUntil}}</p>
        <p><strong>Project:</strong> {{project.title}}</p>
      </div>
    </div>

    {{quote.itemsTable}}

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>{{quote.subtotal}}</span>
      </div>
      {{quote.discountRow}}
      <div class="totals-row">
        <span>Total excl. VAT</span>
        <span>{{quote.totalExclVat}}</span>
      </div>
      <div class="totals-row">
        <span>VAT ({{quote.vatRate}}%)</span>
        <span>{{quote.vatAmount}}</span>
      </div>
      <div class="totals-row final">
        <span>Total incl. VAT</span>
        <span>{{quote.totalInclVat}}</span>
      </div>
    </div>

    <div class="terms">
      <h3>Terms & Conditions</h3>
      <div class="terms-grid">
        <div>
          <p><strong>Payment Terms:</strong></p>
          <p>{{quote.paymentTerms}}</p>
        </div>
        <div>
          <p><strong>Delivery:</strong></p>
          <p>{{quote.deliveryTerms}}</p>
          <p>Estimated: {{quote.deliveryWeeks}} weeks</p>
        </div>
      </div>
    </div>

    {{quote.notesSection}}

    <div class="validity">
      <p>This quotation is valid until <strong>{{quote.validUntil}}</strong></p>
      <p style="font-size: 9pt; color: #64748b; margin-top: 5px;">Prices are subject to change after this date.</p>
    </div>

    <div class="footer">
      <p>{{company.name}} - {{company.address}} - KvK: {{company.kvk}}</p>
      <p>Thank you for considering our services.</p>
    </div>
  </div>
</body>
</html>`;

const DEFAULT_EQUIPMENT_LIST = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #1e293b; line-height: 1.5; }
    .container { padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0d9488; }
    .logo { font-size: 24pt; font-weight: bold; color: #0d9488; }
    .document-title { font-size: 22pt; color: #0d9488; margin-bottom: 20px; text-align: center; }
    .subtitle { text-align: center; color: #64748b; margin-bottom: 30px; }
    .meta-section { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .meta-item label { font-size: 8pt; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 3px; }
    .meta-item span { font-weight: 500; }
    .category-section { margin-bottom: 25px; }
    .category-header { background: #0d9488; color: white; padding: 10px 15px; font-weight: bold; font-size: 11pt; margin-bottom: 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f1f5f9; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 9pt; text-transform: uppercase; color: #64748b; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .item-name { font-weight: 500; }
    .item-description { font-size: 9pt; color: #64748b; margin-top: 3px; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 8pt; font-weight: bold; margin-left: 5px; }
    .badge-ce { background: #dbeafe; color: #1e40af; }
    .badge-safety { background: #fee2e2; color: #dc2626; }
    .summary { margin-top: 30px; padding: 20px; background: #f0fdfa; border-radius: 8px; }
    .summary-title { font-weight: bold; color: #0d9488; margin-bottom: 10px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; text-align: center; }
    .summary-item { padding: 10px; background: white; border-radius: 6px; }
    .summary-value { font-size: 18pt; font-weight: bold; color: #0d9488; }
    .summary-label { font-size: 8pt; color: #64748b; text-transform: uppercase; }
    .footer { margin-top: 40px; text-align: center; font-size: 8pt; color: #94a3b8; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .no-price-notice { background: #fef3c7; padding: 10px 15px; border-radius: 6px; text-align: center; margin-bottom: 20px; font-size: 9pt; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo">{{company.name}}</div>
        <p style="color: #64748b; font-size: 9pt; margin-top: 5px;">{{company.address}}</p>
      </div>
      <div style="text-align: right; font-size: 9pt; color: #64748b;">
        <p>{{company.phone}}</p>
        <p>{{company.email}}</p>
      </div>
    </div>

    <div class="document-title">Equipment List</div>
    <div class="subtitle">{{project.title}} - {{equipmentList.unitLabel}}</div>

    <div class="meta-section">
      <div class="meta-grid">
        <div class="meta-item">
          <label>Project Number</label>
          <span>{{project.number}}</span>
        </div>
        <div class="meta-item">
          <label>Client</label>
          <span>{{client.name}}</span>
        </div>
        <div class="meta-item">
          <label>Generated</label>
          <span>{{equipmentList.date}}</span>
        </div>
        <div class="meta-item">
          <label>Version</label>
          <span>v{{equipmentList.version}}</span>
        </div>
        <div class="meta-item">
          <label>Total Items</label>
          <span>{{equipmentList.totalItems}}</span>
        </div>
        <div class="meta-item">
          <label>Categories</label>
          <span>{{equipmentList.totalCategories}}</span>
        </div>
      </div>
    </div>

    <div class="no-price-notice">
      This is an equipment specification list. Prices are not included.
    </div>

    {{equipmentList.sectionsHtml}}

    <div class="summary">
      <div class="summary-title">Summary</div>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value">{{equipmentList.totalItems}}</div>
          <div class="summary-label">Total Items</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{equipmentList.totalCategories}}</div>
          <div class="summary-label">Categories</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{equipmentList.ceItems}}</div>
          <div class="summary-label">CE Relevant</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{equipmentList.safetyItems}}</div>
          <div class="summary-label">Safety Critical</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>{{company.name}} - {{company.address}}</p>
      <p>Generated on {{date.today}} - Version {{equipmentList.version}}</p>
    </div>
  </div>
</body>
</html>`;

// ============================================
// TEMPLATE SERVICE
// ============================================

// Import types from BoatModelService for specifications
import type {
  BoatModelVersion,
  BoatModel,
  ModelSpecifications,
  HullSpecifications,
  ComplianceSpecifications,
  SafetyEquipmentRequirements,
} from './BoatModelService';

export const TemplateService = {
  /**
   * Get all placeholders grouped by category
   */
  getPlaceholders(): PlaceholderDefinition[] {
    return TEMPLATE_PLACEHOLDERS;
  },

  /**
   * Get model-specific placeholders
   */
  getModelPlaceholders(): PlaceholderDefinition[] {
    return MODEL_PLACEHOLDERS;
  },

  /**
   * Get placeholders by category
   */
  getPlaceholdersByCategory(category: PlaceholderDefinition['category']): PlaceholderDefinition[] {
    if (category === 'model') {
      return MODEL_PLACEHOLDERS;
    }
    return TEMPLATE_PLACEHOLDERS.filter(p => p.category === category);
  },

  /**
   * Get equipment list template (convenience helper)
   */
  getEquipmentListTemplate(): string {
    return DEFAULT_EQUIPMENT_LIST;
  },

  /**
   * Build model specification replacements for template rendering
   */
  buildModelReplacements(
    model: BoatModel | null,
    version: BoatModelVersion | null
  ): Record<string, string> {
    const replacements: Record<string, string> = {};

    if (!model || !version) {
      // Return empty placeholders
      MODEL_PLACEHOLDERS.forEach(p => {
        replacements[p.key] = '';
      });
      return replacements;
    }

    const specs = version.specifications || {};

    // Basic model info
    replacements['{{model.name}}'] = model.name;
    replacements['{{model.range}}'] = model.range;
    replacements['{{model.version}}'] = version.versionLabel;

    // Hull specifications
    const hull = specs.hull || {} as HullSpecifications;
    const hullMaterialMap: Record<string, string> = {
      ALUMINIUM: 'Marine Grade Aluminium',
      FIBREGLASS: 'Fibreglass',
      STEEL: 'Steel',
      COMPOSITE: 'Composite',
      OTHER: hull.materialDescription || 'Other',
    };
    replacements['{{model.hull.material}}'] = hull.material
      ? (hull.materialDescription || hullMaterialMap[hull.material] || hull.material)
      : '';

    const hullTypeMap: Record<string, string> = {
      PLANING: 'Planing',
      SEMI_DISPLACEMENT: 'Semi-displacement',
      DISPLACEMENT: 'Displacement',
      CATAMARAN: 'Catamaran',
      OTHER: 'Other',
    };
    replacements['{{model.hull.type}}'] = hull.hullType ? hullTypeMap[hull.hullType] || hull.hullType : '';

    const constructionMap: Record<string, string> = {
      WELDED: 'Welded',
      RIVETED: 'Riveted',
      LAMINATED: 'Laminated',
      MOULDED: 'Moulded',
      OTHER: 'Other',
    };
    replacements['{{model.hull.construction}}'] = hull.constructionType
      ? constructionMap[hull.constructionType] || hull.constructionType
      : '';

    // Dimensions - from specifications (canonical source, PATCH 6)
    const dims = specs.dimensions;
    replacements['{{model.dimensions.loa}}'] = dims?.lengthOverallM?.toFixed(2) || '';
    replacements['{{model.dimensions.lwl}}'] = dims?.lengthWaterlineM?.toFixed(2) || '';
    replacements['{{model.dimensions.beam}}'] = dims?.beamOverallM?.toFixed(2) || '';
    replacements['{{model.dimensions.draft}}'] = dims?.draftM?.toFixed(2) || '';
    replacements['{{model.dimensions.airDraft}}'] = dims?.airDraftM?.toFixed(2) || '';

    // Weight & Capacity - from specifications (canonical source, PATCH 6)
    const weight = specs.weightCapacity;
    replacements['{{model.weight.displacement}}'] = weight?.displacementLightKg?.toLocaleString() || '';
    replacements['{{model.weight.maxLoad}}'] = weight?.maxLoadKg?.toLocaleString() || '';
    replacements['{{model.capacity.fuel}}'] = weight?.fuelCapacityL?.toLocaleString() || '';
    replacements['{{model.capacity.water}}'] = weight?.waterCapacityL?.toLocaleString() || '';

    // Propulsion
    const prop = specs.propulsion;
    const propTypeMap: Record<string, string> = {
      ELECTRIC: 'Electric',
      HYBRID: 'Hybrid',
      OUTBOARD: 'Outboard',
      INBOARD: 'Inboard',
      POD: 'Pod Drive',
      SAIL: 'Sail',
    };
    replacements['{{model.propulsion.type}}'] = prop?.propulsionType
      ? propTypeMap[prop.propulsionType] || prop.propulsionType
      : '';
    replacements['{{model.propulsion.maxPower}}'] = prop?.maxPowerKw?.toString() || '';
    replacements['{{model.propulsion.maxSpeed}}'] = prop?.maxSpeedKn?.toString() || '';
    replacements['{{model.propulsion.range}}'] = prop?.rangeNm?.toString() || '';

    // Electrical
    const elec = specs.electrical;
    replacements['{{model.electrical.voltage}}'] = elec?.systemVoltage ? `${elec.systemVoltage}V` : '';
    replacements['{{model.electrical.batteryCapacity}}'] = elec?.batteryCapacityAh?.toString() || '';
    const batteryTypeMap: Record<string, string> = {
      LEAD_ACID: 'Lead Acid',
      AGM: 'AGM',
      GEL: 'Gel',
      LITHIUM: 'Lithium-ion',
      LIFEPO4: 'LiFePO4',
    };
    replacements['{{model.electrical.batteryType}}'] = elec?.batteryType
      ? batteryTypeMap[elec.batteryType] || elec.batteryType
      : '';

    // Compliance - from specifications (canonical source, PATCH 6)
    const comp = specs.compliance || {} as ComplianceSpecifications;
    const ceCategory = comp.designCategory || '';
    replacements['{{model.compliance.ceCategory}}'] = ceCategory;

    const ceCategoryDescMap: Record<string, string> = {
      A: 'Ocean - Wind force exceeding 8 Beaufort and wave heights exceeding 4m',
      B: 'Offshore - Wind force up to 8 Beaufort and wave heights up to 4m',
      C: 'Inshore - Wind force up to 6 Beaufort and wave heights up to 2m',
      D: 'Sheltered waters - Wind force up to 4 Beaufort and wave heights up to 0.3m',
    };
    replacements['{{model.compliance.ceCategoryDesc}}'] = comp.designCategoryDescription
      || ceCategoryDescMap[ceCategory]
      || '';
    replacements['{{model.compliance.maxPersons}}'] = comp.maxPersons?.toString() || '';
    replacements['{{model.compliance.standards}}'] = comp.applicableStandards?.join(', ') || '';
    replacements['{{model.compliance.rcdModule}}'] = comp.rcdModuleApplied || '';

    // Safety equipment
    const safety = specs.safetyEquipment || {} as SafetyEquipmentRequirements;
    replacements['{{model.safety.lifeJackets}}'] = safety.lifeJacketsAdult?.toString() || '';
    replacements['{{model.safety.lifebuoys}}'] = safety.lifebuoys?.toString() || '';
    replacements['{{model.safety.fireExtinguishers}}'] = safety.fireExtinguishers?.toString() || '';

    // Build safety requirements HTML
    const safetyItems: string[] = [];
    if (safety.lifeJacketsAdult) safetyItems.push(`${safety.lifeJacketsAdult} adult life jackets`);
    if (safety.lifeJacketsChild) safetyItems.push(`${safety.lifeJacketsChild} child life jackets`);
    if (safety.lifebuoys) safetyItems.push(`${safety.lifebuoys} lifebuoys`);
    if (safety.fireExtinguishers) safetyItems.push(`${safety.fireExtinguishers} fire extinguishers${safety.fireExtinguisherType ? ` (${safety.fireExtinguisherType})` : ''}`);
    if (safety.firstAidKit) safetyItems.push('First aid kit');
    if (safety.distressFlares) safetyItems.push(`${safety.distressFlares} distress flares`);
    if (safety.epirb) safetyItems.push('EPIRB');
    if (safety.vhfRadio) safetyItems.push('VHF Radio');
    if (safety.radarReflector) safetyItems.push('Radar reflector');
    if (safety.navigationLights) safetyItems.push('Navigation lights');
    if (safety.anchor) safetyItems.push('Anchor and rode');
    if (safety.bilgePump) safetyItems.push('Bilge pump');
    if (safety.soundSignalDevice) safetyItems.push('Sound signal device');
    if (safety.additionalRequirements) {
      safetyItems.push(...safety.additionalRequirements);
    }
    replacements['{{model.safety.requirementsHtml}}'] = safetyItems.length > 0
      ? `<ul>${safetyItems.map(item => `<li>${item}</li>`).join('')}</ul>`
      : '<p>No specific safety equipment requirements defined.</p>';

    // Full specifications table
    replacements['{{model.specificationsTable}}'] = this.buildSpecificationsTable(model, version);

    return replacements;
  },

  /**
   * Build a complete specifications table HTML
   */
  buildSpecificationsTable(model: BoatModel, version: BoatModelVersion): string {
    const specs = version.specifications || {};
    const rows: string[] = [];

    // Basic info
    rows.push(`<tr><th colspan="2" class="category-header">General</th></tr>`);
    rows.push(`<tr><td>Model</td><td>${model.name}</td></tr>`);
    rows.push(`<tr><td>Range</td><td>${model.range}</td></tr>`);
    rows.push(`<tr><td>Version</td><td>${version.versionLabel}</td></tr>`);

    // Dimensions - from specifications (canonical source, PATCH 6)
    rows.push(`<tr><th colspan="2" class="category-header">Dimensions</th></tr>`);
    const dims = specs.dimensions;
    if (dims?.lengthOverallM) rows.push(`<tr><td>Length Overall (LOA)</td><td>${dims.lengthOverallM.toFixed(2)} m</td></tr>`);
    if (dims?.lengthWaterlineM) rows.push(`<tr><td>Length Waterline (LWL)</td><td>${dims.lengthWaterlineM.toFixed(2)} m</td></tr>`);
    if (dims?.beamOverallM) rows.push(`<tr><td>Beam</td><td>${dims.beamOverallM.toFixed(2)} m</td></tr>`);
    if (dims?.draftM) rows.push(`<tr><td>Draft</td><td>${dims.draftM.toFixed(2)} m</td></tr>`);
    if (dims?.airDraftM) rows.push(`<tr><td>Air Draft</td><td>${dims.airDraftM.toFixed(2)} m</td></tr>`);

    // Hull
    if (specs.hull) {
      rows.push(`<tr><th colspan="2" class="category-header">Hull</th></tr>`);
      if (specs.hull.material) rows.push(`<tr><td>Material</td><td>${specs.hull.materialDescription || specs.hull.material}</td></tr>`);
      if (specs.hull.constructionType) rows.push(`<tr><td>Construction</td><td>${specs.hull.constructionType}</td></tr>`);
      if (specs.hull.hullType) rows.push(`<tr><td>Hull Type</td><td>${specs.hull.hullType}</td></tr>`);
      if (specs.hull.deadriseAngleDeg) rows.push(`<tr><td>Deadrise Angle</td><td>${specs.hull.deadriseAngleDeg}°</td></tr>`);
    }

    // Weight & Capacity - from specifications (canonical source, PATCH 6)
    rows.push(`<tr><th colspan="2" class="category-header">Weight & Capacity</th></tr>`);
    const weight = specs.weightCapacity;
    if (weight?.displacementLightKg) {
      rows.push(`<tr><td>Displacement (light)</td><td>${weight.displacementLightKg.toLocaleString()} kg</td></tr>`);
    }
    if (weight?.maxLoadKg) rows.push(`<tr><td>Maximum Load</td><td>${weight.maxLoadKg.toLocaleString()} kg</td></tr>`);
    if (weight?.fuelCapacityL) rows.push(`<tr><td>Fuel Capacity</td><td>${weight.fuelCapacityL.toLocaleString()} L</td></tr>`);
    if (weight?.waterCapacityL) rows.push(`<tr><td>Water Capacity</td><td>${weight.waterCapacityL.toLocaleString()} L</td></tr>`);

    // Propulsion
    if (specs.propulsion) {
      rows.push(`<tr><th colspan="2" class="category-header">Propulsion</th></tr>`);
      if (specs.propulsion.propulsionType) rows.push(`<tr><td>Type</td><td>${specs.propulsion.propulsionType}</td></tr>`);
      if (specs.propulsion.maxPowerKw) rows.push(`<tr><td>Maximum Power</td><td>${specs.propulsion.maxPowerKw} kW</td></tr>`);
      if (specs.propulsion.maxSpeedKn) rows.push(`<tr><td>Maximum Speed</td><td>${specs.propulsion.maxSpeedKn} kn</td></tr>`);
      if (specs.propulsion.cruisingSpeedKn) rows.push(`<tr><td>Cruising Speed</td><td>${specs.propulsion.cruisingSpeedKn} kn</td></tr>`);
      if (specs.propulsion.rangeNm) rows.push(`<tr><td>Range</td><td>${specs.propulsion.rangeNm} NM</td></tr>`);
    }

    // Electrical
    if (specs.electrical) {
      rows.push(`<tr><th colspan="2" class="category-header">Electrical System</th></tr>`);
      if (specs.electrical.systemVoltage) rows.push(`<tr><td>System Voltage</td><td>${specs.electrical.systemVoltage}V</td></tr>`);
      if (specs.electrical.batteryCapacityAh) rows.push(`<tr><td>Battery Capacity</td><td>${specs.electrical.batteryCapacityAh} Ah</td></tr>`);
      if (specs.electrical.batteryType) rows.push(`<tr><td>Battery Type</td><td>${specs.electrical.batteryType}</td></tr>`);
      if (specs.electrical.shoreConnectionAmp) rows.push(`<tr><td>Shore Connection</td><td>${specs.electrical.shoreConnectionAmp}A</td></tr>`);
    }

    // Compliance - from specifications (canonical source, PATCH 6)
    rows.push(`<tr><th colspan="2" class="category-header">CE Compliance</th></tr>`);
    const comp = specs.compliance;
    if (comp?.designCategory) rows.push(`<tr><td>Design Category</td><td>${comp.designCategory}</td></tr>`);
    if (comp?.maxPersons !== undefined) rows.push(`<tr><td>Maximum Persons</td><td>${comp.maxPersons}</td></tr>`);
    if (comp?.applicableStandards?.length) {
      rows.push(`<tr><td>Applied Standards</td><td>${comp.applicableStandards.join(', ')}</td></tr>`);
    }
    if (comp?.rcdModuleApplied) rows.push(`<tr><td>RCD Module</td><td>${comp.rcdModuleApplied}</td></tr>`);

    return `<table class="specifications-table">
      <tbody>
        ${rows.join('\n        ')}
      </tbody>
    </table>`;
  },

  /**
   * Get default template content for a document type
   */
  getDefaultTemplate(type: DocumentType): string {
    switch (type) {
      case 'CE_DECLARATION':
        return DEFAULT_CE_DECLARATION;
      case 'OWNERS_MANUAL':
        return DEFAULT_OWNERS_MANUAL;
      case 'TECHNICAL_FILE':
        return DEFAULT_TECHNICAL_FILE;
      case 'DELIVERY_NOTE':
        return DEFAULT_DELIVERY_NOTE;
      case 'INVOICE':
        return DEFAULT_INVOICE;
      case 'QUOTE':
        return DEFAULT_QUOTE;
      case 'EQUIPMENT_LIST':
        return DEFAULT_EQUIPMENT_LIST;
      default:
        return '<p>Template content goes here...</p>';
    }
  },

  /**
   * Render a template with actual data
   * @param templateContent The HTML template with placeholders
   * @param project The project to render data from
   * @param client The client associated with the project
   * @param companyInfo Optional company information override
   * @param modelData Optional boat model and version for model-specific placeholders
   */
  renderTemplate(
    templateContent: string,
    project: Project,
    client: Client | null,
    companyInfo?: {
      name: string;
      address: string;
      phone: string;
      email: string;
      vat: string;
      kvk: string;
    },
    modelData?: {
      model: BoatModel | null;
      version: BoatModelVersion | null;
    }
  ): string {
    const company = companyInfo || {
      name: 'Eagle Boats B.V.',
      address: 'Industriestraat 25, 8081HH Elburg',
      phone: '+31 (0)85 0600 139',
      email: 'info@eagleboats.nl',
      vat: 'NL123456789B01',
      kvk: '12345678',
    };

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);

    const today = new Date();
    const dateFormatted = today.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Build replacement map
    const replacements: Record<string, string> = {
      // Project
      '{{project.number}}': project.projectNumber,
      '{{project.title}}': project.title,
      '{{project.type}}': project.type.replace('_', ' '),
      '{{project.status}}': project.status.replace('_', ' '),
      '{{project.propulsion}}': project.configuration.propulsionType,

      // Client
      '{{client.name}}': client?.name || 'Unknown Client',
      '{{client.address}}': client
        ? [client.street, `${client.postalCode || ''} ${client.city || ''}`, client.country]
            .filter(Boolean)
            .join(', ')
        : '',
      '{{client.city}}': client?.city || '',
      '{{client.country}}': client?.country || '',
      '{{client.email}}': client?.email || '',
      '{{client.vat}}': client?.vatNumber || '',

      // Company
      '{{company.name}}': company.name,
      '{{company.address}}': company.address,
      '{{company.phone}}': company.phone,
      '{{company.email}}': company.email,
      '{{company.vat}}': company.vat,
      '{{company.kvk}}': company.kvk,

      // Configuration
      '{{config.totalExclVat}}': formatCurrency(project.configuration.totalExclVat),
      '{{config.totalInclVat}}': formatCurrency(project.configuration.totalInclVat),
      '{{config.itemCount}}': String(project.configuration.items.length),

      // Dates
      '{{date.today}}': dateFormatted,
      '{{date.year}}': String(today.getFullYear()),
      '{{date.month}}': today.toLocaleDateString('en-GB', { month: 'long' }),
    };

    // Generate tables
    const generateItemsTable = (items: typeof project.configuration.items) => {
      if (items.length === 0) {
        return '<p>No items specified</p>';
      }
      return `<table>
        <tr><th>Category</th><th>Item</th><th>Qty</th><th>Unit</th></tr>
        ${items.map(item => `
          <tr>
            <td>${item.category}</td>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${item.unit}</td>
          </tr>
        `).join('')}
      </table>`;
    };

    replacements['{{config.allItemsTable}}'] = generateItemsTable(
      project.configuration.items.filter(i => i.isIncluded)
    );
    replacements['{{config.ceItemsTable}}'] = generateItemsTable(
      project.configuration.items.filter(i => i.ceRelevant)
    );
    replacements['{{config.safetyItemsTable}}'] = generateItemsTable(
      project.configuration.items.filter(i => i.safetyCritical)
    );

    // Add model-specific replacements if model data is provided
    if (modelData) {
      const modelReplacements = this.buildModelReplacements(modelData.model, modelData.version);
      Object.assign(replacements, modelReplacements);
    }

    // Apply replacements
    let result = templateContent;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.split(placeholder).join(value);
    }

    return result;
  },

  /**
   * Render a quote template with quote data
   */
  renderQuoteTemplate(
    templateContent: string,
    quote: {
      quoteNumber: string;
      createdAt: string;
      validUntil: string;
      status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED' | 'EXPIRED';
      lines: Array<{
        description: string;
        quantity: number;
        unit: string;
        unitPriceExclVat: number;
        lineTotalExclVat: number;
        isOptional?: boolean;
        category?: string;
      }>;
      subtotalExclVat: number;
      discountPercent?: number;
      discountAmount?: number;
      totalExclVat: number;
      vatRate: number;
      vatAmount: number;
      totalInclVat: number;
      paymentTerms?: string;
      deliveryTerms?: string;
      deliveryWeeks?: number;
      notes?: string;
    },
    project: Project,
    client: Client | null,
    companyInfo?: {
      name: string;
      address: string;
      phone: string;
      email: string;
      vat: string;
      kvk: string;
    }
  ): string {
    const company = companyInfo || {
      name: 'Eagle Boats B.V.',
      address: 'Industriestraat 25, 8081HH Elburg',
      phone: '+31 (0)85 0600 139',
      email: 'info@eagleboats.nl',
      vat: 'NL123456789B01',
      kvk: '12345678',
    };

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);

    const formatDate = (dateStr: string) =>
      new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

    const statusBadge = quote.status === 'DRAFT'
      ? '<span class="status-badge status-draft">DRAFT</span>'
      : '<span class="status-badge status-final">FINAL</span>';

    // Group items by category
    const categoryMap = new Map<string, typeof quote.lines>();
    for (const line of quote.lines) {
      const category = line.category || 'Other';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(line);
    }

    // Build items table with category grouping
    let itemsTableHtml = `<table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th>Unit</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>`;

    for (const [category, items] of categoryMap) {
      const categoryTotal = items.reduce((sum, item) => sum + item.lineTotalExclVat, 0);
      itemsTableHtml += `
        <tr class="category-header">
          <td colspan="4">${category}</td>
          <td class="category-total">${formatCurrency(categoryTotal)}</td>
        </tr>`;
      for (const item of items) {
        itemsTableHtml += `
          <tr class="${item.isOptional ? 'optional' : ''}">
            <td>${item.description}${item.isOptional ? ' (Optional)' : ''}</td>
            <td class="text-right">${item.quantity}</td>
            <td>${item.unit}</td>
            <td class="text-right">${formatCurrency(item.unitPriceExclVat)}</td>
            <td class="text-right">${formatCurrency(item.lineTotalExclVat)}</td>
          </tr>`;
      }
    }
    itemsTableHtml += '</tbody></table>';

    // Discount row
    const discountRow = quote.discountAmount && quote.discountAmount > 0
      ? `<div class="totals-row discount">
          <span>Discount (${quote.discountPercent}%)</span>
          <span>-${formatCurrency(quote.discountAmount)}</span>
        </div>`
      : '';

    // Notes section
    const notesSection = quote.notes
      ? `<div class="notes-section">
          <div class="notes-title">Notes & Special Conditions</div>
          <div class="notes-content">${quote.notes}</div>
        </div>`
      : '';

    const replacements: Record<string, string> = {
      // Company
      '{{company.name}}': company.name,
      '{{company.address}}': company.address,
      '{{company.phone}}': company.phone,
      '{{company.email}}': company.email,
      '{{company.vat}}': company.vat,
      '{{company.kvk}}': company.kvk,

      // Client
      '{{client.name}}': client?.name || 'Unknown Client',
      '{{client.address}}': client
        ? [client.street, `${client.postalCode || ''} ${client.city || ''}`, client.country]
            .filter(Boolean)
            .join(', ')
        : '',
      '{{client.vat}}': client?.vatNumber || '',

      // Project
      '{{project.title}}': project.title,
      '{{project.number}}': project.projectNumber,

      // Quote
      '{{quote.number}}': quote.quoteNumber,
      '{{quote.date}}': formatDate(quote.createdAt),
      '{{quote.validUntil}}': formatDate(quote.validUntil),
      '{{quote.statusBadge}}': statusBadge,
      '{{quote.itemsTable}}': itemsTableHtml,
      '{{quote.subtotal}}': formatCurrency(quote.subtotalExclVat),
      '{{quote.discountRow}}': discountRow,
      '{{quote.totalExclVat}}': formatCurrency(quote.totalExclVat),
      '{{quote.vatRate}}': String(quote.vatRate),
      '{{quote.vatAmount}}': formatCurrency(quote.vatAmount),
      '{{quote.totalInclVat}}': formatCurrency(quote.totalInclVat),
      '{{quote.paymentTerms}}': quote.paymentTerms || '50% on order, 50% on delivery',
      '{{quote.deliveryTerms}}': quote.deliveryTerms || 'Ex Works',
      '{{quote.deliveryWeeks}}': String(quote.deliveryWeeks || 12),
      '{{quote.notesSection}}': notesSection,

      // Date
      '{{date.today}}': new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };

    let result = templateContent;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.split(placeholder).join(value);
    }

    return result;
  },

  /**
   * Render an equipment list template
   */
  renderEquipmentListTemplate(
    templateContent: string,
    equipmentList: {
      version: number;
      unitLabel?: string;
      generatedAt: string;
      sections: Array<{
        category: string;
        items: Array<{
          name: string;
          description?: string;
          quantity: number;
          unit: string;
          articleNumber?: string;
          ceRelevant?: boolean;
          safetyCritical?: boolean;
        }>;
      }>;
      totalItemCount: number;
    },
    project: Project,
    client: Client | null,
    companyInfo?: {
      name: string;
      address: string;
      phone: string;
      email: string;
    }
  ): string {
    const company = companyInfo || {
      name: 'Eagle Boats B.V.',
      address: 'Industriestraat 25, 8081HH Elburg',
      phone: '+31 (0)85 0600 139',
      email: 'info@eagleboats.nl',
    };

    const formatDate = (dateStr: string) =>
      new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

    // Build sections HTML
    let sectionsHtml = '';
    let ceCount = 0;
    let safetyCount = 0;

    for (const section of equipmentList.sections) {
      sectionsHtml += `
        <div class="category-section">
          <div class="category-header">${section.category}</div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-center">Qty</th>
                <th>Unit</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>`;

      for (const item of section.items) {
        if (item.ceRelevant) ceCount++;
        if (item.safetyCritical) safetyCount++;

        const badges = [];
        if (item.ceRelevant) badges.push('<span class="badge badge-ce">CE</span>');
        if (item.safetyCritical) badges.push('<span class="badge badge-safety">Safety</span>');

        sectionsHtml += `
          <tr>
            <td>
              <div class="item-name">${item.name}</div>
              ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
            </td>
            <td class="text-center">${item.quantity}</td>
            <td>${item.unit}</td>
            <td>${badges.join(' ')}</td>
          </tr>`;
      }

      sectionsHtml += `
            </tbody>
          </table>
        </div>`;
    }

    const replacements: Record<string, string> = {
      // Company
      '{{company.name}}': company.name,
      '{{company.address}}': company.address,
      '{{company.phone}}': company.phone,
      '{{company.email}}': company.email,

      // Client
      '{{client.name}}': client?.name || 'Unknown Client',

      // Project
      '{{project.title}}': project.title,
      '{{project.number}}': project.projectNumber,

      // Equipment List
      '{{equipmentList.version}}': String(equipmentList.version),
      '{{equipmentList.unitLabel}}': equipmentList.unitLabel || 'Standard Configuration',
      '{{equipmentList.date}}': formatDate(equipmentList.generatedAt),
      '{{equipmentList.totalItems}}': String(equipmentList.totalItemCount),
      '{{equipmentList.totalCategories}}': String(equipmentList.sections.length),
      '{{equipmentList.ceItems}}': String(ceCount),
      '{{equipmentList.safetyItems}}': String(safetyCount),
      '{{equipmentList.sectionsHtml}}': sectionsHtml,

      // Date
      '{{date.today}}': new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };

    let result = templateContent;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.split(placeholder).join(value);
    }

    return result;
  },

  /**
   * Create a new template
   */
  async createTemplate(
    type: DocumentType,
    name: string,
    context: AuditContext
  ): Promise<Result<LibraryDocumentTemplate, string>> {
    try {
      const template = await TemplateRepository.create({
        type,
        name,
        description: `${name} template`,
      });

      // Create initial version with default content
      const defaultContent = this.getDefaultTemplate(type);
      await TemplateRepository.createVersion(
        template.id,
        '1.0',
        defaultContent,
        ['project', 'client', 'company'],
        context.userId
      );

      await AuditService.logCreate(context, 'DocumentTemplate', template.id, {
        type,
        name,
      });

      return Ok(template);
    } catch (error) {
      return Err(`Failed to create template: ${error}`);
    }
  },

  /**
   * Create new version of a template
   */
  async createTemplateVersion(
    templateId: string,
    versionLabel: string,
    content: string,
    context: AuditContext
  ): Promise<Result<TemplateVersion, string>> {
    try {
      const version = await TemplateRepository.createVersion(
        templateId,
        versionLabel,
        content,
        ['project', 'client', 'company'],
        context.userId
      );

      await AuditService.logCreate(context, 'TemplateVersion', version.id, {
        templateId,
        versionLabel,
      });

      return Ok(version);
    } catch (error) {
      return Err(`Failed to create template version: ${error}`);
    }
  },

  /**
   * Approve a template version
   */
  async approveVersion(
    versionId: string,
    context: AuditContext
  ): Promise<Result<TemplateVersion, string>> {
    try {
      const version = await TemplateRepository.approveVersion(versionId, context.userId);
      if (!version) {
        return Err('Template version not found');
      }

      await AuditService.logApproval(context, 'TemplateVersion', versionId, version.versionLabel);

      return Ok(version);
    } catch (error) {
      return Err(`Failed to approve template version: ${error}`);
    }
  },

  /**
   * Get all templates
   */
  async getAllTemplates(): Promise<LibraryDocumentTemplate[]> {
    return TemplateRepository.getAll();
  },

  /**
   * Get template with versions
   */
  async getTemplateWithVersions(templateId: string): Promise<{
    template: LibraryDocumentTemplate;
    versions: TemplateVersion[];
  } | null> {
    const template = await TemplateRepository.getById(templateId);
    if (!template) return null;

    const versions = await TemplateRepository.getVersions(templateId);
    return { template, versions };
  },

  /**
   * Get current approved template for a document type
   */
  async getCurrentTemplate(type: DocumentType): Promise<{
    template: LibraryDocumentTemplate;
    version: TemplateVersion;
  } | null> {
    const templates = await TemplateRepository.getAll();
    const template = templates.find(t => t.type === type);
    if (!template || !template.currentVersionId) return null;

    const version = await TemplateRepository.getVersion(template.currentVersionId);
    if (!version) return null;

    return { template, version };
  },

  /**
   * Initialize default templates if none exist
   */
  async initializeDefaultTemplates(context: AuditContext): Promise<void> {
    const existing = await TemplateRepository.getAll();
    if (existing.length > 0) return;

    const types: DocumentType[] = [
      'CE_DECLARATION',
      'OWNERS_MANUAL',
      'TECHNICAL_FILE',
      'DELIVERY_NOTE',
      'INVOICE',
      'QUOTE',
      'EQUIPMENT_LIST',
    ];

    for (const type of types) {
      const name = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      await this.createTemplate(type, name, context);
    }
  },
};

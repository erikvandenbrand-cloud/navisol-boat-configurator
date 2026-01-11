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
// PLACEHOLDER DEFINITIONS
// ============================================

export interface PlaceholderDefinition {
  key: string;
  label: string;
  description: string;
  category: 'project' | 'client' | 'company' | 'configuration' | 'date';
  example: string;
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

// ============================================
// TEMPLATE SERVICE
// ============================================

export const TemplateService = {
  /**
   * Get all placeholders grouped by category
   */
  getPlaceholders(): PlaceholderDefinition[] {
    return TEMPLATE_PLACEHOLDERS;
  },

  /**
   * Get placeholders by category
   */
  getPlaceholdersByCategory(category: PlaceholderDefinition['category']): PlaceholderDefinition[] {
    return TEMPLATE_PLACEHOLDERS.filter(p => p.category === category);
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
      default:
        return '<p>Template content goes here...</p>';
    }
  },

  /**
   * Render a template with actual data
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

    // Apply replacements
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
    ];

    for (const type of types) {
      const name = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      await this.createTemplate(type, name, context);
    }
  },
};

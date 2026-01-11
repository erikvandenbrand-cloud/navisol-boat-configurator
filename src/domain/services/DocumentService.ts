/**
 * Document Service - v4
 * Handles document generation, PDF creation, and document management
 *
 * Document Lifecycle: DRAFT -> FINAL -> SUPERSEDED -> ARCHIVED
 * - DRAFT: Editable, can be regenerated
 * - FINAL: Immutable, official version
 * - SUPERSEDED: Replaced by newer FINAL version
 * - ARCHIVED: Historical, no longer relevant
 */

import type {
  Project,
  ProjectDocument,
  DocumentType,
  DocumentStatus,
  ProjectQuote,
  Client,
} from '@/domain/models';
import { generateUUID, now, Result, Ok, Err } from '@/domain/models';
import { ProjectRepository, ClientRepository } from '@/data/repositories';
import { TemplateRepository } from '@/data/repositories/LibraryRepository';
import { AuditService, type AuditContext } from '@/domain/audit/AuditService';
import { TemplateService } from './TemplateService';
import { SettingsService } from './SettingsService';

// ============================================
// DOCUMENT SNAPSHOT TYPES
// ============================================

export interface DocumentSnapshot {
  projectId: string;
  projectNumber: string;
  projectTitle: string;
  projectType: string;
  projectStatus: string;
  clientId: string;
  clientName?: string;
  clientCountry?: string;
  configurationSnapshot: {
    propulsionType: string;
    itemCount: number;
    ceRelevantItems: { id: string; name: string; category: string }[];
    safetyCriticalItems: { id: string; name: string; category: string }[];
    totalInclVat: number;
    isFrozen: boolean;
  };
  libraryPins: {
    boatModelVersionId?: string;
    catalogVersionId?: string;
    pinnedAt?: string;
  } | null;
  generatedAt: string;
  templateVersionId: string;
  inputHash: string;
}

// ============================================
// QUOTE PDF GENERATION
// ============================================

export interface QuotePdfData {
  // Company info
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyVat: string;
  companyKvk: string;

  // Client info
  clientName: string;
  clientAddress: string;
  clientVat?: string;

  // Quote info
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  projectTitle: string;

  // Lines
  lines: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }[];

  // Totals
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  totalExclVat: number;
  vatRate: number;
  vatAmount: number;
  totalInclVat: number;

  // Terms
  paymentTerms: string;
  deliveryTerms: string;
  deliveryWeeks?: number;
  notes?: string;
}

function generateQuoteHtml(data: QuotePdfData): string {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; color: #1e293b; line-height: 1.5; }
        .container { padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { font-size: 24pt; font-weight: bold; color: #0d9488; }
        .logo-sub { font-size: 9pt; color: #64748b; }
        .company-info { text-align: right; font-size: 9pt; color: #64748b; }
        .quote-title { font-size: 18pt; font-weight: bold; color: #0d9488; margin-bottom: 20px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .meta-section h3 { font-size: 8pt; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.5px; }
        .meta-section p { margin-bottom: 4px; }
        .meta-section .highlight { font-weight: 600; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 8pt; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        .text-right { text-align: right; }
        .totals { margin-left: auto; width: 300px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .totals-row.final { border-bottom: none; border-top: 2px solid #0d9488; padding-top: 12px; font-size: 14pt; font-weight: bold; color: #0d9488; }
        .terms { margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px; }
        .terms h3 { font-size: 10pt; margin-bottom: 12px; color: #0f172a; }
        .terms p { font-size: 9pt; color: #64748b; margin-bottom: 8px; }
        .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <div class="logo">NAVISOL</div>
            <div class="logo-sub">Boat Manufacturing System</div>
          </div>
          <div class="company-info">
            <p>${data.companyName}</p>
            <p>${data.companyAddress}</p>
            <p>${data.companyPhone}</p>
            <p>${data.companyEmail}</p>
            <p>VAT: ${data.companyVat}</p>
            <p>KvK: ${data.companyKvk}</p>
          </div>
        </div>

        <div class="quote-title">QUOTATION ${data.quoteNumber}</div>

        <div class="meta-grid">
          <div class="meta-section">
            <h3>Client</h3>
            <p class="highlight">${data.clientName}</p>
            <p>${data.clientAddress}</p>
            ${data.clientVat ? `<p>VAT: ${data.clientVat}</p>` : ''}
          </div>
          <div class="meta-section">
            <h3>Quote Details</h3>
            <p><span class="highlight">Project:</span> ${data.projectTitle}</p>
            <p><span class="highlight">Date:</span> ${formatDate(data.quoteDate)}</p>
            <p><span class="highlight">Valid Until:</span> ${formatDate(data.validUntil)}</p>
            ${data.deliveryWeeks ? `<p><span class="highlight">Delivery:</span> ${data.deliveryWeeks} weeks</p>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Qty</th>
              <th>Unit</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.lines
              .map(
                (line) => `
              <tr>
                <td>${line.description}</td>
                <td class="text-right">${line.quantity}</td>
                <td>${line.unit}</td>
                <td class="text-right">${formatCurrency(line.unitPrice)}</td>
                <td class="text-right">${formatCurrency(line.total)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>${formatCurrency(data.subtotal)}</span>
          </div>
          ${
            data.discountAmount && data.discountAmount > 0
              ? `
          <div class="totals-row">
            <span>Discount (${data.discountPercent}%)</span>
            <span>-${formatCurrency(data.discountAmount)}</span>
          </div>
          `
              : ''
          }
          <div class="totals-row">
            <span>Total excl. VAT</span>
            <span>${formatCurrency(data.totalExclVat)}</span>
          </div>
          <div class="totals-row">
            <span>VAT (${data.vatRate}%)</span>
            <span>${formatCurrency(data.vatAmount)}</span>
          </div>
          <div class="totals-row final">
            <span>Total incl. VAT</span>
            <span>${formatCurrency(data.totalInclVat)}</span>
          </div>
        </div>

        <div class="terms">
          <h3>Terms & Conditions</h3>
          <p><strong>Payment Terms:</strong> ${data.paymentTerms}</p>
          <p><strong>Delivery Terms:</strong> ${data.deliveryTerms}</p>
          ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
        </div>

        <div class="footer">
          <p>This quotation is valid until ${formatDate(data.validUntil)}.</p>
          <p>Eagle Boats B.V. • Industriestraat 25, 8081HH Elburg • +31 (0)85 0600 139</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================
// PDF GENERATION (Client-side via html2pdf.js)
// ============================================

/**
 * Convert HTML to PDF using html2pdf.js
 * Returns base64 encoded PDF data
 */
async function generatePdfFromHtml(html: string, filename: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Server-side: return HTML as base64 (will be converted on client)
    return btoa(html);
  }

  try {
    // Dynamic import html2pdf.js
    const html2pdf = (await import('html2pdf.js')).default;

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    // Generate PDF
    const pdfOptions = {
      margin: 0,
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBlob = await (html2pdf() as any)
      .set(pdfOptions)
      .from(container)
      .outputPdf('blob');

    // Clean up
    document.body.removeChild(container);

    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    // Fallback: return HTML as base64
    return btoa(html);
  }
}

// ============================================
// DELIVERY DOCUMENT TEMPLATES
// ============================================

function generateOwnersManualHtml(project: Project, client: Client): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.6; }
        .container { padding: 40px; max-width: 800px; margin: 0 auto; }
        .cover { text-align: center; padding: 100px 40px; }
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
        <p class="project">${project.title}</p>
        <p>Project: ${project.projectNumber}</p>
        <p>Owner: ${client.name}</p>
        <p>Date: ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div class="container">
        <h1>1. Introduction</h1>
        <p>Welcome to your new Eagle Boat. This manual provides essential information for the safe operation and maintenance of your vessel.</p>
        <p>Please read this manual carefully before operating the boat and keep it on board at all times.</p>

        <h1>2. Vessel Specifications</h1>
        <table>
          <tr><th>Project Number</th><td>${project.projectNumber}</td></tr>
          <tr><th>Project Type</th><td>${project.type.replace('_', ' ')}</td></tr>
          <tr><th>Propulsion</th><td>${project.configuration.propulsionType}</td></tr>
          <tr><th>Owner</th><td>${client.name}</td></tr>
        </table>

        <h1>3. Safety Instructions</h1>
        <div class="warning">
          <h3>⚠️ Warning</h3>
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
        <table>
          <tr><th>Category</th><th>Item</th><th>CE Relevant</th></tr>
          ${project.configuration.items
            .filter((item) => item.isIncluded)
            .map(
              (item) => `
            <tr>
              <td>${item.category}</td>
              <td>${item.name}</td>
              <td>${item.ceRelevant ? 'Yes' : 'No'}</td>
            </tr>
          `
            )
            .join('')}
        </table>

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
        <p><strong>Eagle Boats B.V.</strong></p>
        <p>Industriestraat 25, 8081HH Elburg, Netherlands</p>
        <p>Phone: +31 (0)85 0600 139</p>
        <p>Email: service@eagleboats.nl</p>
      </div>
    </body>
    </html>
  `;
}

function generateCeDeclarationHtml(project: Project, client: Client): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
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
          <p><strong>Eagle Boats B.V.</strong></p>
          <p>Industriestraat 25, 8081HH Elburg, Netherlands</p>
        </div>

        <div class="section">
          <h3>Product Identification</h3>
          <p><strong>Project:</strong> ${project.title}</p>
          <p><strong>Project Number:</strong> ${project.projectNumber}</p>
          <p><strong>Type:</strong> ${project.type.replace('_', ' ')}</p>
          <p><strong>Propulsion:</strong> ${project.configuration.propulsionType}</p>
        </div>

        <div class="section">
          <h3>Owner</h3>
          <p>${client.name}</p>
          <p>${client.city || ''}, ${client.country}</p>
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
            <p style="margin-top: 8px;">Elburg, ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <div class="signature-box">
            <div class="signature-line">Authorized Signatory</div>
            <p style="margin-top: 8px;">Eagle Boats B.V.</p>
          </div>
        </div>

        <div class="footer">
          <p>This declaration is issued under the sole responsibility of the manufacturer.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateTechnicalFileHtml(project: Project, client: Client): string {
  const ceItems = project.configuration.items.filter((item) => item.ceRelevant);
  const safetyItems = project.configuration.items.filter((item) => item.safetyCritical);

  return `
    <!DOCTYPE html>
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
          <p><strong>${project.title}</strong></p>
          <p>${project.projectNumber}</p>
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
            <tr><th width="30%">Project Number</th><td>${project.projectNumber}</td></tr>
            <tr><th>Project Title</th><td>${project.title}</td></tr>
            <tr><th>Project Type</th><td>${project.type.replace('_', ' ')}</td></tr>
            <tr><th>Owner</th><td>${client.name}</td></tr>
            <tr><th>Manufacturer</th><td>Eagle Boats B.V.</td></tr>
            <tr><th>Date</th><td>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
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
            <tr><th>Propulsion Type</th><td>${project.configuration.propulsionType}</td></tr>
          </table>
        </div>

        <div class="section">
          <h1>5. Electrical Installation</h1>
          <p>The electrical installation complies with ISO 10133 (DC) and ISO 13297 (AC where applicable).</p>
        </div>

        <div class="section">
          <h1>6. CE-Relevant Equipment</h1>
          <table>
            <tr><th>Category</th><th>Item</th><th>Quantity</th></tr>
            ${ceItems.length > 0
              ? ceItems.map((item) => `
              <tr>
                <td>${item.category}</td>
                <td>${item.name}</td>
                <td>${item.quantity} ${item.unit}</td>
              </tr>
            `).join('')
              : '<tr><td colspan="3">No CE-relevant items specified</td></tr>'
            }
          </table>
        </div>

        <div class="section">
          <h1>7. Safety Equipment</h1>
          <table>
            <tr><th>Category</th><th>Item</th><th>Quantity</th></tr>
            ${safetyItems.length > 0
              ? safetyItems.map((item) => `
              <tr>
                <td>${item.category}</td>
                <td>${item.name}</td>
                <td>${item.quantity} ${item.unit}</td>
              </tr>
            `).join('')
              : '<tr><td colspan="3">No safety-critical items specified</td></tr>'
            }
          </table>
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
          <p>Eagle Boats B.V. declares that this technical file contains all information required by the Recreational Craft Directive 2013/53/EU and that the vessel described herein meets the essential requirements.</p>
          <p style="margin-top: 40px;">
            <strong>Eagle Boats B.V.</strong><br>
            Industriestraat 25, 8081HH Elburg, Netherlands<br>
            Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div class="footer">
          <p>Technical File - ${project.projectNumber} - Confidential</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================
// DOCUMENT SERVICE
// ============================================

export const DocumentService = {
  /**
   * Generate quote PDF data
   */
  async generateQuotePdfData(
    projectId: string,
    quoteId: string
  ): Promise<Result<QuotePdfData, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const quote = project.quotes.find((q) => q.id === quoteId);
    if (!quote) {
      return Err('Quote not found');
    }

    const client = await ClientRepository.getById(project.clientId);
    if (!client) {
      return Err('Client not found');
    }

    // Get company info from settings
    const companyInfo = await SettingsService.getCompanyInfo();

    const pdfData: QuotePdfData = {
      companyName: companyInfo.legalName || companyInfo.name,
      companyAddress: `${companyInfo.street}, ${companyInfo.postalCode} ${companyInfo.city}`,
      companyPhone: companyInfo.phone,
      companyEmail: companyInfo.email,
      companyVat: companyInfo.vatNumber,
      companyKvk: companyInfo.chamberOfCommerce,

      clientName: client.name,
      clientAddress: [client.street, `${client.postalCode} ${client.city}`, client.country]
        .filter(Boolean)
        .join(', '),
      clientVat: client.vatNumber,

      quoteNumber: quote.quoteNumber,
      quoteDate: quote.createdAt,
      validUntil: quote.validUntil,
      projectTitle: project.title,

      lines: quote.lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPriceExclVat,
        total: line.lineTotalExclVat,
      })),

      subtotal: quote.subtotalExclVat,
      discountPercent: quote.discountPercent,
      discountAmount: quote.discountAmount,
      totalExclVat: quote.totalExclVat,
      vatRate: quote.vatRate,
      vatAmount: quote.vatAmount,
      totalInclVat: quote.totalInclVat,

      paymentTerms: quote.paymentTerms,
      deliveryTerms: quote.deliveryTerms,
      deliveryWeeks: quote.deliveryWeeks,
      notes: quote.notes,
    };

    return Ok(pdfData);
  },

  /**
   * Generate quote HTML for PDF conversion
   */
  async generateQuoteHtml(
    projectId: string,
    quoteId: string
  ): Promise<Result<string, string>> {
    const dataResult = await this.generateQuotePdfData(projectId, quoteId);
    if (!dataResult.ok) {
      return Err(dataResult.error);
    }

    return Ok(generateQuoteHtml(dataResult.value));
  },

  /**
   * Generate Quote PDF and create document record
   * Creates an actual PDF file stored as base64
   */
  async generateQuotePdf(
    projectId: string,
    quoteId: string,
    context: AuditContext
  ): Promise<Result<ProjectDocument, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const quote = project.quotes.find((q) => q.id === quoteId);
    if (!quote) {
      return Err('Quote not found');
    }

    // Generate HTML
    const htmlResult = await this.generateQuoteHtml(projectId, quoteId);
    if (!htmlResult.ok) {
      return Err(htmlResult.error);
    }

    const html = htmlResult.value;
    const filename = `Quote-${quote.quoteNumber}-v${quote.version}.pdf`;

    // Generate PDF
    const pdfBase64 = await generatePdfFromHtml(html, filename);

    const client = await ClientRepository.getById(project.clientId);

    // Create document snapshot
    const snapshot = this.createDocumentSnapshot(project, client, 'QUOTE');

    const document: ProjectDocument = {
      id: generateUUID(),
      projectId,
      type: 'QUOTE',
      title: `Quote ${quote.quoteNumber} v${quote.version}`,
      version: quote.version,
      status: 'DRAFT',
      templateVersionId: snapshot.templateVersionId,
      inputSnapshot: snapshot as unknown as Record<string, unknown>,
      fileData: pdfBase64,
      mimeType: 'application/pdf',
      fileSizeBytes: Math.ceil((pdfBase64.length * 3) / 4), // Approximate decoded size
      generatedAt: now(),
      generatedBy: context.userId,
      createdAt: now(),
    };

    const updated = await ProjectRepository.update(projectId, {
      documents: [...project.documents, document],
    });

    if (!updated) {
      return Err('Failed to save document');
    }

    await AuditService.logDocumentGeneration(
      context,
      projectId,
      document.id,
      'QUOTE'
    );

    return Ok(document);
  },

  /**
   * Create a document snapshot for reproducibility
   */
  createDocumentSnapshot(
    project: Project,
    client: Client | null,
    docType: DocumentType
  ): DocumentSnapshot {
    const templateVersionId = project.libraryPins?.templateVersionIds?.[docType]
      || `default-${docType.toLowerCase()}-v1`;

    const snapshotData: Omit<DocumentSnapshot, 'inputHash'> = {
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectTitle: project.title,
      projectType: project.type,
      projectStatus: project.status,
      clientId: project.clientId,
      clientName: client?.name,
      clientCountry: client?.country,
      configurationSnapshot: {
        propulsionType: project.configuration.propulsionType,
        itemCount: project.configuration.items.length,
        ceRelevantItems: project.configuration.items.filter(i => i.ceRelevant).map(i => ({
          id: i.id,
          name: i.name,
          category: i.category,
        })),
        safetyCriticalItems: project.configuration.items.filter(i => i.safetyCritical).map(i => ({
          id: i.id,
          name: i.name,
          category: i.category,
        })),
        totalInclVat: project.configuration.totalInclVat,
        isFrozen: project.configuration.isFrozen,
      },
      libraryPins: project.libraryPins ? {
        boatModelVersionId: project.libraryPins.boatModelVersionId,
        catalogVersionId: project.libraryPins.catalogVersionId,
        pinnedAt: project.libraryPins.pinnedAt,
      } : null,
      generatedAt: now(),
      templateVersionId,
    };

    // Create hash of input for integrity verification
    const inputHash = btoa(JSON.stringify(snapshotData)).substring(0, 32);

    return { ...snapshotData, inputHash };
  },

  /**
   * Generate Owner's Manual HTML
   */
  async generateOwnersManual(
    projectId: string
  ): Promise<Result<string, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const client = await ClientRepository.getById(project.clientId);
    if (!client) {
      return Err('Client not found');
    }

    return Ok(generateOwnersManualHtml(project, client));
  },

  /**
   * Generate CE Declaration HTML
   */
  async generateCeDeclaration(
    projectId: string
  ): Promise<Result<string, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const client = await ClientRepository.getById(project.clientId);
    if (!client) {
      return Err('Client not found');
    }

    return Ok(generateCeDeclarationHtml(project, client));
  },

  /**
   * Generate Technical File HTML
   */
  async generateTechnicalFile(
    projectId: string
  ): Promise<Result<string, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const client = await ClientRepository.getById(project.clientId);
    if (!client) {
      return Err('Client not found');
    }

    return Ok(generateTechnicalFileHtml(project, client));
  },

  /**
   * Create a document record in the project
   * Uses pinned library versions and captures input snapshot for reproducibility
   */
  async createDocument(
    projectId: string,
    type: DocumentType,
    title: string,
    content: string,
    context: AuditContext
  ): Promise<Result<ProjectDocument, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const client = await ClientRepository.getById(project.clientId);

    const existingDocs = project.documents.filter((d) => d.type === type);
    const version = existingDocs.length + 1;

    // Get pinned template version ID (from libraryPins or use default)
    const templateVersionId = project.libraryPins?.templateVersionIds?.[type]
      || `default-${type.toLowerCase()}-v1`;

    // Capture input snapshot for reproducibility
    // This allows regenerating the exact same document later
    const inputSnapshot: Record<string, unknown> = {
      projectId: project.id,
      projectNumber: project.projectNumber,
      projectTitle: project.title,
      projectType: project.type,
      projectStatus: project.status,
      clientId: project.clientId,
      clientName: client?.name,
      clientCountry: client?.country,
      configurationSnapshot: {
        propulsionType: project.configuration.propulsionType,
        itemCount: project.configuration.items.length,
        ceRelevantItems: project.configuration.items.filter(i => i.ceRelevant).map(i => ({
          id: i.id,
          name: i.name,
          category: i.category,
        })),
        safetyCriticalItems: project.configuration.items.filter(i => i.safetyCritical).map(i => ({
          id: i.id,
          name: i.name,
          category: i.category,
        })),
        totalInclVat: project.configuration.totalInclVat,
        isFrozen: project.configuration.isFrozen,
      },
      libraryPins: project.libraryPins ? {
        boatModelVersionId: project.libraryPins.boatModelVersionId,
        catalogVersionId: project.libraryPins.catalogVersionId,
        pinnedAt: project.libraryPins.pinnedAt,
      } : null,
      generatedAt: now(),
      templateVersionId,
    };

    // Create hash of input for integrity verification
    const inputHash = btoa(JSON.stringify(inputSnapshot)).substring(0, 32);

    const document: ProjectDocument = {
      id: generateUUID(),
      projectId,
      type,
      title,
      version,
      status: 'DRAFT',
      templateVersionId,
      inputSnapshot: {
        ...inputSnapshot,
        inputHash,
      },
      fileData: btoa(content), // Base64 encode HTML (immutable snapshot)
      mimeType: 'text/html',
      fileSizeBytes: new Blob([content]).size,
      generatedAt: now(),
      generatedBy: context.userId,
      createdAt: now(),
    };

    const updated = await ProjectRepository.update(projectId, {
      documents: [...project.documents, document],
    });

    if (!updated) {
      return Err('Failed to create document');
    }

    await AuditService.logDocumentGeneration(
      context,
      projectId,
      document.id,
      type
    );

    return Ok(document);
  },

  /**
   * Finalize a document (DRAFT -> FINAL)
   *
   * If there's an existing FINAL document of the same type,
   * it will be marked as SUPERSEDED.
   *
   * Once FINAL, the document is immutable.
   */
  async finalizeDocument(
    projectId: string,
    documentId: string,
    context: AuditContext,
    reason?: string
  ): Promise<Result<ProjectDocument, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const docIndex = project.documents.findIndex((d) => d.id === documentId);
    if (docIndex === -1) {
      return Err('Document not found');
    }

    const document = project.documents[docIndex];
    if (document.status !== 'DRAFT') {
      return Err('Only DRAFT documents can be finalized');
    }

    // Find any existing FINAL documents of the same type
    const updatedDocs = project.documents.map((doc, idx) => {
      if (idx === docIndex) {
        // Finalize this document
        return {
          ...doc,
          status: 'FINAL' as DocumentStatus,
          finalizedAt: now(),
          finalizedBy: context.userId,
        };
      }

      if (doc.type === document.type && doc.status === 'FINAL') {
        // Supersede the old FINAL document
        return {
          ...doc,
          status: 'SUPERSEDED' as DocumentStatus,
        };
      }

      return doc;
    });

    const updated = await ProjectRepository.update(projectId, {
      documents: updatedDocs,
    });

    if (!updated) {
      return Err('Failed to finalize document');
    }

    const finalizedDoc = updatedDocs[docIndex];

    await AuditService.log(
      context,
      'UPDATE',
      'ProjectDocument',
      documentId,
      `Finalized ${document.type}${reason ? `: ${reason}` : ''}`
    );

    return Ok(finalizedDoc);
  },

  /**
   * Archive a document (FINAL or SUPERSEDED -> ARCHIVED)
   */
  async archiveDocument(
    projectId: string,
    documentId: string,
    context: AuditContext
  ): Promise<Result<ProjectDocument, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const docIndex = project.documents.findIndex((d) => d.id === documentId);
    if (docIndex === -1) {
      return Err('Document not found');
    }

    const document = project.documents[docIndex];
    if (document.status === 'DRAFT') {
      return Err('Cannot archive DRAFT documents. Delete or finalize first.');
    }

    const archivedDoc: ProjectDocument = {
      ...document,
      status: 'ARCHIVED',
    };

    const updatedDocs = [...project.documents];
    updatedDocs[docIndex] = archivedDoc;

    const updated = await ProjectRepository.update(projectId, {
      documents: updatedDocs,
    });

    if (!updated) {
      return Err('Failed to archive document');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProjectDocument',
      documentId,
      `Archived ${document.type}`
    );

    return Ok(archivedDoc);
  },

  /**
   * Get the latest FINAL document of a specific type
   */
  async getLatestFinalDocument(
    projectId: string,
    type: DocumentType
  ): Promise<ProjectDocument | null> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return null;
    }

    return project.documents
      .filter((d) => d.type === type && d.status === 'FINAL')
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0] || null;
  },

  /**
   * Get document history for a specific type
   */
  async getDocumentHistory(
    projectId: string,
    type: DocumentType
  ): Promise<ProjectDocument[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return [];
    }

    return project.documents
      .filter((d) => d.type === type)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  },

  /**
   * Get all documents for a project
   */
  async getDocuments(projectId: string): Promise<ProjectDocument[]> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return [];
    }

    return project.documents;
  },

  /**
   * Generate a document using the template system
   * Uses library templates with placeholder rendering
   */
  async generateFromTemplate(
    projectId: string,
    type: DocumentType,
    context: AuditContext
  ): Promise<Result<ProjectDocument, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const client = await ClientRepository.getById(project.clientId);
    if (!client) {
      return Err('Client not found');
    }

    // Try to get the library template
    const templateData = await TemplateService.getCurrentTemplate(type);
    let htmlContent: string;
    let templateVersionId: string;

    if (templateData) {
      // Use library template with placeholders
      htmlContent = TemplateService.renderTemplate(
        templateData.version.content,
        project,
        client
      );
      templateVersionId = templateData.version.id;
    } else {
      // Fall back to default template
      const defaultContent = TemplateService.getDefaultTemplate(type);
      htmlContent = TemplateService.renderTemplate(defaultContent, project, client);
      templateVersionId = `default-${type.toLowerCase()}-v1`;
    }

    const existingDocs = project.documents.filter((d) => d.type === type);
    const version = existingDocs.length + 1;

    const titleMap: Record<DocumentType, string> = {
      CE_DECLARATION: 'CE Declaration',
      OWNERS_MANUAL: "Owner's Manual",
      TECHNICAL_FILE: 'Technical File',
      DELIVERY_NOTE: 'Delivery Note',
      INVOICE: 'Invoice',
      QUOTE: 'Quote',
    };

    const document: ProjectDocument = {
      id: generateUUID(),
      projectId,
      type,
      title: `${titleMap[type]} v${version}`,
      version,
      status: 'DRAFT',
      templateVersionId,
      inputSnapshot: {
        projectId: project.id,
        projectNumber: project.projectNumber,
        clientId: client.id,
        clientName: client.name,
        generatedAt: now(),
        templateVersionId,
      },
      fileData: btoa(unescape(encodeURIComponent(htmlContent))), // Proper UTF-8 base64 encoding
      mimeType: 'text/html',
      fileSizeBytes: new Blob([htmlContent]).size,
      generatedAt: now(),
      generatedBy: context.userId,
      createdAt: now(),
    };

    const updated = await ProjectRepository.update(projectId, {
      documents: [...project.documents, document],
    });

    if (!updated) {
      return Err('Failed to create document');
    }

    await AuditService.logDocumentGeneration(
      context,
      projectId,
      document.id,
      type
    );

    return Ok(document);
  },

  /**
   * Delete a DRAFT document
   */
  async deleteDocument(
    projectId: string,
    documentId: string,
    context: AuditContext
  ): Promise<Result<void, string>> {
    const project = await ProjectRepository.getById(projectId);
    if (!project) {
      return Err('Project not found');
    }

    const document = project.documents.find((d) => d.id === documentId);
    if (!document) {
      return Err('Document not found');
    }

    if (document.status !== 'DRAFT') {
      return Err('Only DRAFT documents can be deleted');
    }

    const updatedDocs = project.documents.filter((d) => d.id !== documentId);

    const updated = await ProjectRepository.update(projectId, {
      documents: updatedDocs,
    });

    if (!updated) {
      return Err('Failed to delete document');
    }

    await AuditService.log(
      context,
      'UPDATE',
      'ProjectDocument',
      documentId,
      `Deleted ${document.type} draft`
    );

    return Ok(undefined);
  },
};

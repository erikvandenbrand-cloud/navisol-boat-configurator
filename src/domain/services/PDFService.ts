/**
 * PDF Service - v4
 * Generates print-optimized HTML for browser-based PDF export
 * Uses CSS print media queries for professional output
 */

// ============================================
// NAVISOL BRANDING ASSETS (Inline SVGs for PDF embedding)
// ============================================

/**
 * Navisol watermark SVG - propeller/waves design
 * Used as faded full-page background on every PDF page
 */
const NAVISOL_WATERMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 350" fill="#5b9aa9">
  <!-- Propeller/Wheel -->
  <circle cx="200" cy="140" r="90" fill="none" stroke="#5b9aa9" stroke-width="16"/>
  <circle cx="200" cy="140" r="20" fill="none" stroke="#5b9aa9" stroke-width="10"/>
  <!-- Spokes -->
  <line x1="200" y1="60" x2="200" y2="120" stroke="#5b9aa9" stroke-width="12" stroke-linecap="round"/>
  <line x1="200" y1="160" x2="200" y2="220" stroke="#5b9aa9" stroke-width="12" stroke-linecap="round"/>
  <line x1="120" y1="140" x2="180" y2="140" stroke="#5b9aa9" stroke-width="12" stroke-linecap="round"/>
  <line x1="220" y1="140" x2="280" y2="140" stroke="#5b9aa9" stroke-width="12" stroke-linecap="round"/>
  <!-- Upper wave -->
  <path d="M40 280 Q100 220 180 260 Q260 300 350 240" fill="none" stroke="#5b9aa9" stroke-width="18" stroke-linecap="round"/>
  <!-- Lower wave -->
  <path d="M20 310 Q80 280 140 300 Q200 320 260 290" fill="none" stroke="#5b9aa9" stroke-width="10" stroke-linecap="round"/>
</svg>`;

/**
 * Navisol logo SVG - text logo with propeller icon
 * Used as header logo on every PDF page
 */
const NAVISOL_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 50" fill="#5b9aa9">
  <!-- N -->
  <path d="M0 8 L0 42 L6 42 L6 18 L24 42 L30 42 L30 8 L24 8 L24 32 L6 8 Z"/>
  <!-- A -->
  <path d="M45 42 L51 42 L54 34 L66 34 L69 42 L75 42 L60 8 Z M56 28 L60 16 L64 28 Z"/>
  <!-- V -->
  <path d="M85 8 L100 38 L115 8 L108 8 L100 28 L92 8 Z"/>
  <!-- I -->
  <rect x="125" y="8" width="6" height="34"/>
  <!-- S -->
  <path d="M145 14 Q145 8 152 8 L165 8 Q172 8 172 14 L172 18 L166 18 L166 14 Q166 12 164 12 L153 12 Q151 12 151 14 L151 22 Q151 24 153 24 L164 24 Q172 24 172 30 L172 36 Q172 42 165 42 L152 42 Q145 42 145 36 L145 32 L151 32 L151 36 Q151 38 153 38 L164 38 Q166 38 166 36 L166 30 Q166 28 164 28 L153 28 Q145 28 145 22 Z"/>
  <!-- O (propeller icon) -->
  <g transform="translate(180, 25)">
    <circle cx="15" cy="0" r="14" fill="none" stroke="#5b9aa9" stroke-width="3"/>
    <circle cx="15" cy="0" r="3" fill="none" stroke="#5b9aa9" stroke-width="2"/>
    <line x1="15" y1="-12" x2="15" y2="-4" stroke="#5b9aa9" stroke-width="2" stroke-linecap="round"/>
    <line x1="15" y1="4" x2="15" y2="12" stroke="#5b9aa9" stroke-width="2" stroke-linecap="round"/>
    <line x1="3" y1="0" x2="11" y2="0" stroke="#5b9aa9" stroke-width="2" stroke-linecap="round"/>
    <line x1="19" y1="0" x2="27" y2="0" stroke="#5b9aa9" stroke-width="2" stroke-linecap="round"/>
    <!-- Small waves under O -->
    <path d="M2 14 Q10 10 18 14 Q26 18 34 12" fill="none" stroke="#5b9aa9" stroke-width="2.5" stroke-linecap="round"/>
  </g>
  <!-- L -->
  <path d="M225 8 L225 42 L250 42 L250 36 L231 36 L231 8 Z"/>
</svg>`;

// ============================================
// PDF STYLING
// ============================================

const PDF_STYLES = `
  @page {
    size: A4;
    margin: 20mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1e293b;
    background: white;
  }

  /* ============================================
   * GLOBAL PDF BRANDING
   * Background watermark and header logo
   * ============================================ */

  /* Faded full-page background watermark - renders on every page */
  .pdf-background-watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(1.8);
    width: 90%;
    max-width: 600px;
    opacity: 0.04;
    z-index: -1;
    pointer-events: none;
  }

  .pdf-background-watermark svg {
    width: 100%;
    height: auto;
  }

  /* Header logo - appears at top-left of first page and each new page */
  .pdf-header-logo {
    position: fixed;
    top: 0;
    left: 0;
    padding: 8px 10mm;
    z-index: 100;
  }

  .pdf-header-logo svg {
    height: 24px;
    width: auto;
  }

  /* Ensure content doesn't overlap with fixed header logo */
  .pdf-container {
    max-width: 210mm;
    margin: 0 auto;
    padding: 10mm;
    padding-top: 45px; /* Space for header logo */
    position: relative;
    z-index: 1;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #0d9488;
  }

  .company-info {
    flex: 1;
  }

  .company-name {
    font-size: 18pt;
    font-weight: bold;
    color: #0d9488;
    margin-bottom: 5px;
  }

  .company-details {
    font-size: 9pt;
    color: #64748b;
  }

  .document-info {
    text-align: right;
  }

  .document-title {
    font-size: 14pt;
    font-weight: bold;
    color: #1e293b;
    margin-bottom: 5px;
  }

  .document-number {
    font-size: 10pt;
    color: #64748b;
    font-family: monospace;
  }

  .document-date {
    font-size: 9pt;
    color: #64748b;
  }

  .section {
    margin-bottom: 25px;
  }

  .section-title {
    font-size: 11pt;
    font-weight: bold;
    color: #0d9488;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #e2e8f0;
  }

  .address-block {
    background: #f8fafc;
    padding: 15px;
    border-radius: 4px;
    margin-bottom: 15px;
  }

  .address-label {
    font-size: 9pt;
    color: #64748b;
    margin-bottom: 5px;
  }

  .address-name {
    font-weight: bold;
    margin-bottom: 3px;
  }

  .table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
    font-size: 10pt;
  }

  .table th {
    background: #f1f5f9;
    padding: 10px 8px;
    text-align: left;
    font-weight: 600;
    border-bottom: 2px solid #e2e8f0;
  }

  .table th.text-right {
    text-align: right;
  }

  .table td {
    padding: 10px 8px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }

  .table td.text-right {
    text-align: right;
  }

  .table tr:last-child td {
    border-bottom: none;
  }

  .table .optional {
    color: #64748b;
    font-style: italic;
  }

  .totals {
    margin-left: auto;
    width: 280px;
  }

  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .totals-row.total {
    font-weight: bold;
    font-size: 12pt;
    color: #0d9488;
    border-top: 2px solid #0d9488;
    border-bottom: none;
    padding-top: 12px;
  }

  .totals-row.discount {
    color: #16a34a;
  }

  /* Category-grouped quotation styles */
  .category-header {
    background: #f1f5f9;
    font-weight: 600;
    color: #1e293b;
  }

  .category-header td {
    padding: 12px 8px;
    border-bottom: 2px solid #e2e8f0;
  }

  .article-row td {
    padding: 8px 8px 8px 24px;
    border-bottom: 1px solid #f1f5f9;
  }

  .category-total {
    background: #f8fafc;
    font-weight: 600;
  }

  .category-total td {
    padding: 10px 8px;
    border-bottom: 2px solid #e2e8f0;
  }

  .category-total .total-label {
    font-weight: 600;
    color: #0d9488;
  }

  .category-total .total-value {
    text-align: right;
    font-weight: bold;
    color: #0d9488;
  }

  .terms-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
  }

  .terms-block {
    background: #f8fafc;
    padding: 15px;
    border-radius: 4px;
  }

  .terms-label {
    font-size: 9pt;
    color: #64748b;
    margin-bottom: 5px;
  }

  .terms-value {
    font-weight: 500;
  }

  .notes-section {
    margin-top: 20px;
    padding: 15px;
    background: #fef3c7;
    border-radius: 4px;
    border-left: 4px solid #f59e0b;
  }

  .notes-title {
    font-weight: bold;
    margin-bottom: 5px;
    color: #92400e;
  }

  .notes-content {
    font-size: 10pt;
    color: #78350f;
  }

  .signature-section {
    margin-top: 40px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }

  .signature-block {
    border-top: 1px solid #1e293b;
    padding-top: 10px;
  }

  .signature-label {
    font-size: 9pt;
    color: #64748b;
  }

  .footer {
    margin-top: 40px;
    padding-top: 15px;
    border-top: 1px solid #e2e8f0;
    font-size: 8pt;
    color: #94a3b8;
    text-align: center;
  }

  .status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 9pt;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.draft {
    background: #fef3c7;
    color: #92400e;
  }

  .status-badge.final {
    background: #dcfce7;
    color: #166534;
  }

  .ce-mark {
    text-align: center;
    margin: 30px 0;
    font-size: 48pt;
    font-weight: bold;
  }

  .declaration-text {
    text-align: justify;
    margin-bottom: 20px;
  }

  .equipment-list {
    margin: 20px 0;
  }

  .equipment-item {
    padding: 8px 0;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
  }

  .page-break {
    page-break-before: always;
  }

  @media print {
    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .no-print {
      display: none !important;
    }

    /* Ensure background watermark renders on every printed page */
    .pdf-background-watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(1.8);
      opacity: 0.04;
    }

    /* Ensure header logo renders on every printed page */
    .pdf-header-logo {
      position: fixed;
      top: 0;
      left: 0;
    }
  }

  .print-controls {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    gap: 10px;
  }

  .print-controls button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
  }

  .print-controls .print-btn {
    background: #0d9488;
    color: white;
  }

  .print-controls .print-btn:hover {
    background: #0f766e;
  }

  .print-controls .close-btn {
    background: #e2e8f0;
    color: #475569;
  }

  .print-controls .close-btn:hover {
    background: #cbd5e1;
  }

  @media print {
    .print-controls {
      display: none;
    }
  }
`;

// ============================================
// PDF GENERATION UTILITIES
// ============================================

export interface PDFOptions {
  title: string;
  showPrintControls?: boolean;
  status?: 'DRAFT' | 'FINAL';
}

/**
 * Wrap content in a complete PDF-ready HTML document
 * Includes global branding: background watermark and header logo
 */
function wrapInPDFDocument(content: string, options: PDFOptions): string {
  const printControls = options.showPrintControls !== false ? `
    <div class="print-controls no-print">
      <button class="print-btn" onclick="window.print()">
        Print / Save as PDF
      </button>
      <button class="close-btn" onclick="window.close()">
        Close
      </button>
    </div>
  ` : '';

  // Global branding elements
  const backgroundWatermark = `
    <div class="pdf-background-watermark" aria-hidden="true">
      ${NAVISOL_WATERMARK_SVG}
    </div>
  `;

  const headerLogo = `
    <div class="pdf-header-logo" aria-hidden="true">
      ${NAVISOL_LOGO_SVG}
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${options.title}</title>
      <style>${PDF_STYLES}</style>
    </head>
    <body>
      ${backgroundWatermark}
      ${headerLogo}
      ${printControls}
      <div class="pdf-container">
        ${content}
      </div>
    </body>
    </html>
  `;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ============================================
// QUOTE PDF
// ============================================

/**
 * Item within a category group - article/description only (no prices)
 */
export interface QuoteCategoryItem {
  description: string;
  quantity: number;
  unit: string;
  isOptional: boolean;
}

/**
 * Category group with items and category total
 */
export interface QuoteCategoryGroup {
  category: string;
  items: QuoteCategoryItem[];
  categoryTotal: number; // Sum of all items in this category
}

export interface QuotePDFData {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyVat: string;
  companyKvk: string;
  clientName: string;
  clientAddress: string;
  clientVat?: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  projectTitle: string;
  projectNumber: string;
  /**
   * Legacy flat lines (deprecated - use categoryGroups instead)
   * When categoryGroups is provided, lines are ignored
   */
  lines: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
    isOptional: boolean;
  }[];
  /**
   * Category-grouped lines for client-facing quotation
   * Article prices are hidden; only category totals are shown
   */
  categoryGroups?: QuoteCategoryGroup[];
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  totalExclVat: number;
  vatRate: number;
  vatAmount: number;
  totalInclVat: number;
  paymentTerms: string;
  deliveryTerms: string;
  deliveryWeeks?: number;
  notes?: string;
  status: 'DRAFT' | 'FINAL';
}

/**
 * Build category-grouped table HTML
 * Articles show description + qty only (no prices)
 * Category totals show "Totaal [Category]" with sum
 */
function buildCategoryGroupedTableHtml(categoryGroups: QuoteCategoryGroup[]): string {
  let html = '';

  for (const group of categoryGroups) {
    // Category header row
    html += `
      <tr class="category-header">
        <td colspan="3"><strong>${group.category}</strong></td>
      </tr>
    `;

    // Article rows - description + qty only (NO prices)
    for (const item of group.items) {
      html += `
        <tr class="article-row ${item.isOptional ? 'optional' : ''}">
          <td>${item.description}${item.isOptional ? ' (Optional)' : ''}</td>
          <td class="text-right">${item.quantity}</td>
          <td>${item.unit}</td>
        </tr>
      `;
    }

    // Category total row
    html += `
      <tr class="category-total">
        <td colspan="2" class="total-label">Totaal ${group.category}</td>
        <td class="total-value">${formatCurrency(group.categoryTotal)}</td>
      </tr>
    `;
  }

  return html;
}

export function generateQuotePDF(data: QuotePDFData): string {
  const statusBadge = data.status === 'DRAFT'
    ? '<span class="status-badge draft">DRAFT</span>'
    : '<span class="status-badge final">FINAL</span>';

  // Use category-grouped layout if categoryGroups is provided
  const useCategoryGroups = data.categoryGroups && data.categoryGroups.length > 0;

  // Legacy flat lines (for backward compatibility)
  const legacyLinesHtml = data.lines.map(line => `
    <tr class="${line.isOptional ? 'optional' : ''}">
      <td>${line.description}${line.isOptional ? ' (Optional)' : ''}</td>
      <td class="text-right">${line.quantity}</td>
      <td>${line.unit}</td>
      <td class="text-right">${formatCurrency(line.unitPrice)}</td>
      <td class="text-right">${formatCurrency(line.total)}</td>
    </tr>
  `).join('');

  // Category-grouped lines (new layout)
  const categoryGroupedHtml = useCategoryGroups
    ? buildCategoryGroupedTableHtml(data.categoryGroups!)
    : '';

  const discountRow = data.discountAmount && data.discountAmount > 0 ? `
    <div class="totals-row discount">
      <span>Discount (${data.discountPercent}%)</span>
      <span>-${formatCurrency(data.discountAmount)}</span>
    </div>
  ` : '';

  const notesSection = data.notes ? `
    <div class="notes-section">
      <div class="notes-title">Notes & Special Conditions</div>
      <div class="notes-content">${data.notes}</div>
    </div>
  ` : '';

  // Table header depends on layout mode
  const tableHeader = useCategoryGroups
    ? `
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
      `
    : `
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Qty</th>
            <th>Unit</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
      `;

  // Table body depends on layout mode
  const tableBody = useCategoryGroups
    ? `<tbody>${categoryGroupedHtml}</tbody>`
    : `<tbody>${legacyLinesHtml}</tbody>`;

  const content = `
    <div class="header">
      <div class="company-info">
        <div class="company-name">${data.companyName}</div>
        <div class="company-details">
          ${data.companyAddress}<br>
          Tel: ${data.companyPhone} | Email: ${data.companyEmail}<br>
          VAT: ${data.companyVat} | KvK: ${data.companyKvk}
        </div>
      </div>
      <div class="document-info">
        <div class="document-title">QUOTATION ${statusBadge}</div>
        <div class="document-number">${data.quoteNumber}</div>
        <div class="document-date">Date: ${formatDate(data.quoteDate)}</div>
        <div class="document-date">Valid until: ${formatDate(data.validUntil)}</div>
      </div>
    </div>

    <div class="section">
      <div class="address-block">
        <div class="address-label">To:</div>
        <div class="address-name">${data.clientName}</div>
        <div>${data.clientAddress}</div>
        ${data.clientVat ? `<div>VAT: ${data.clientVat}</div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Project: ${data.projectTitle}</div>
      <div style="color: #64748b; font-size: 10pt;">Reference: ${data.projectNumber}</div>
    </div>

    <div class="section">
      <table class="table">
        ${tableHeader}
        ${tableBody}
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${formatCurrency(data.subtotal)}</span>
        </div>
        ${discountRow}
        <div class="totals-row">
          <span>Total excl. VAT</span>
          <span>${formatCurrency(data.totalExclVat)}</span>
        </div>
        <div class="totals-row">
          <span>VAT (${data.vatRate}%)</span>
          <span>${formatCurrency(data.vatAmount)}</span>
        </div>
        <div class="totals-row total">
          <span>Total incl. VAT</span>
          <span>${formatCurrency(data.totalInclVat)}</span>
        </div>
      </div>
    </div>

    <div class="terms-section">
      <div class="terms-block">
        <div class="terms-label">Payment Terms</div>
        <div class="terms-value">${data.paymentTerms}</div>
      </div>
      <div class="terms-block">
        <div class="terms-label">Delivery Terms</div>
        <div class="terms-value">${data.deliveryTerms}</div>
        ${data.deliveryWeeks ? `<div style="margin-top: 5px; font-size: 10pt; color: #64748b;">Estimated delivery: ${data.deliveryWeeks} weeks</div>` : ''}
      </div>
    </div>

    ${notesSection}

    <div class="signature-section">
      <div>
        <div class="signature-block">
          <div class="signature-label">For ${data.companyName}</div>
        </div>
      </div>
      <div>
        <div class="signature-block">
          <div class="signature-label">Client acceptance</div>
        </div>
      </div>
    </div>

    <div class="footer">
      Generated by Navisol v4 | ${data.companyName} | ${data.companyVat}
    </div>
  `;

  return wrapInPDFDocument(content, {
    title: `Quote ${data.quoteNumber} - ${data.projectTitle}`,
    showPrintControls: true,
    status: data.status,
  });
}

// ============================================
// INVOICE PDF
// ============================================

export interface InvoicePDFData {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyVat: string;
  companyKvk: string;
  companyIban: string;
  clientName: string;
  clientAddress: string;
  clientVat?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  projectTitle: string;
  projectNumber: string;
  quoteNumber?: string;
  lines: {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  totalExclVat: number;
  vatRate: number;
  vatAmount: number;
  totalInclVat: number;
  paymentTerms: string;
  status: 'DRAFT' | 'FINAL';
}

export function generateInvoicePDF(data: InvoicePDFData): string {
  const statusBadge = data.status === 'DRAFT'
    ? '<span class="status-badge draft">DRAFT</span>'
    : '<span class="status-badge final">FINAL</span>';

  const linesHtml = data.lines.map(line => `
    <tr>
      <td>${line.description}</td>
      <td class="text-right">${line.quantity}</td>
      <td>${line.unit}</td>
      <td class="text-right">${formatCurrency(line.unitPrice)}</td>
      <td class="text-right">${formatCurrency(line.total)}</td>
    </tr>
  `).join('');

  const discountRow = data.discountAmount && data.discountAmount > 0 ? `
    <div class="totals-row discount">
      <span>Discount (${data.discountPercent}%)</span>
      <span>-${formatCurrency(data.discountAmount)}</span>
    </div>
  ` : '';

  const content = `
    <div class="header">
      <div class="company-info">
        <div class="company-name">${data.companyName}</div>
        <div class="company-details">
          ${data.companyAddress}<br>
          Tel: ${data.companyPhone} | Email: ${data.companyEmail}<br>
          VAT: ${data.companyVat} | KvK: ${data.companyKvk}
        </div>
      </div>
      <div class="document-info">
        <div class="document-title">INVOICE ${statusBadge}</div>
        <div class="document-number">${data.invoiceNumber}</div>
        <div class="document-date">Date: ${formatDate(data.invoiceDate)}</div>
        <div class="document-date">Due: ${formatDate(data.dueDate)}</div>
      </div>
    </div>

    <div class="section">
      <div class="address-block">
        <div class="address-label">Bill to:</div>
        <div class="address-name">${data.clientName}</div>
        <div>${data.clientAddress}</div>
        ${data.clientVat ? `<div>VAT: ${data.clientVat}</div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Project: ${data.projectTitle}</div>
      <div style="color: #64748b; font-size: 10pt;">
        Reference: ${data.projectNumber}
        ${data.quoteNumber ? ` | Quote: ${data.quoteNumber}` : ''}
      </div>
    </div>

    <div class="section">
      <table class="table">
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
          ${linesHtml}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${formatCurrency(data.subtotal)}</span>
        </div>
        ${discountRow}
        <div class="totals-row">
          <span>Total excl. VAT</span>
          <span>${formatCurrency(data.totalExclVat)}</span>
        </div>
        <div class="totals-row">
          <span>VAT (${data.vatRate}%)</span>
          <span>${formatCurrency(data.vatAmount)}</span>
        </div>
        <div class="totals-row total">
          <span>Total incl. VAT</span>
          <span>${formatCurrency(data.totalInclVat)}</span>
        </div>
      </div>
    </div>

    <div class="terms-section">
      <div class="terms-block">
        <div class="terms-label">Payment Terms</div>
        <div class="terms-value">${data.paymentTerms}</div>
      </div>
      <div class="terms-block">
        <div class="terms-label">Bank Details</div>
        <div class="terms-value">IBAN: ${data.companyIban}</div>
        <div style="margin-top: 5px; font-size: 10pt; color: #64748b;">Reference: ${data.invoiceNumber}</div>
      </div>
    </div>

    <div class="footer">
      Generated by Navisol v4 | ${data.companyName} | ${data.companyVat}
    </div>
  `;

  return wrapInPDFDocument(content, {
    title: `Invoice ${data.invoiceNumber} - ${data.projectTitle}`,
    showPrintControls: true,
    status: data.status,
  });
}

// ============================================
// DELIVERY NOTE PDF
// ============================================

export interface DeliveryNotePDFData {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  clientName: string;
  clientAddress: string;
  deliveryNoteNumber: string;
  deliveryDate: string;
  projectTitle: string;
  projectNumber: string;
  boatModel?: string;
  hullNumber?: string;
  items: {
    description: string;
    quantity: number;
    unit: string;
  }[];
  notes?: string;
  status: 'DRAFT' | 'FINAL';
}

export function generateDeliveryNotePDF(data: DeliveryNotePDFData): string {
  const statusBadge = data.status === 'DRAFT'
    ? '<span class="status-badge draft">DRAFT</span>'
    : '<span class="status-badge final">FINAL</span>';

  const itemsHtml = data.items.map(item => `
    <tr>
      <td>${item.description}</td>
      <td class="text-right">${item.quantity}</td>
      <td>${item.unit}</td>
      <td style="width: 60px;"></td>
    </tr>
  `).join('');

  const content = `
    <div class="header">
      <div class="company-info">
        <div class="company-name">${data.companyName}</div>
        <div class="company-details">
          ${data.companyAddress}<br>
          Tel: ${data.companyPhone}
        </div>
      </div>
      <div class="document-info">
        <div class="document-title">DELIVERY NOTE ${statusBadge}</div>
        <div class="document-number">${data.deliveryNoteNumber}</div>
        <div class="document-date">Date: ${formatDate(data.deliveryDate)}</div>
      </div>
    </div>

    <div class="section">
      <div class="address-block">
        <div class="address-label">Deliver to:</div>
        <div class="address-name">${data.clientName}</div>
        <div>${data.clientAddress}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Project Details</div>
      <table class="table" style="width: auto;">
        <tr>
          <td style="font-weight: 600; width: 150px;">Project:</td>
          <td>${data.projectTitle}</td>
        </tr>
        <tr>
          <td style="font-weight: 600;">Reference:</td>
          <td>${data.projectNumber}</td>
        </tr>
        ${data.boatModel ? `
        <tr>
          <td style="font-weight: 600;">Boat Model:</td>
          <td>${data.boatModel}</td>
        </tr>
        ` : ''}
        ${data.hullNumber ? `
        <tr>
          <td style="font-weight: 600;">Hull Number:</td>
          <td>${data.hullNumber}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div class="section">
      <div class="section-title">Items Delivered</div>
      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Qty</th>
            <th>Unit</th>
            <th>Checked</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    ${data.notes ? `
    <div class="notes-section">
      <div class="notes-title">Notes</div>
      <div class="notes-content">${data.notes}</div>
    </div>
    ` : ''}

    <div class="signature-section">
      <div>
        <div class="signature-block">
          <div class="signature-label">Delivered by (${data.companyName})</div>
        </div>
        <div style="margin-top: 20px; font-size: 9pt; color: #64748b;">
          Name: ___________________________<br><br>
          Date: ___________________________
        </div>
      </div>
      <div>
        <div class="signature-block">
          <div class="signature-label">Received by (Client)</div>
        </div>
        <div style="margin-top: 20px; font-size: 9pt; color: #64748b;">
          Name: ___________________________<br><br>
          Date: ___________________________
        </div>
      </div>
    </div>

    <div class="footer">
      Generated by Navisol v4 | ${data.companyName}
    </div>
  `;

  return wrapInPDFDocument(content, {
    title: `Delivery Note ${data.deliveryNoteNumber} - ${data.projectTitle}`,
    showPrintControls: true,
    status: data.status,
  });
}

// ============================================
// OPEN PDF IN NEW WINDOW
// ============================================

export function openPDFWindow(html: string): void {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

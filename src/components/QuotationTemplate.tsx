'use client';

import { forwardRef } from 'react';
import type { BoatConfiguration, GlobalSettings, Client } from '@/lib/types';
import { formatEuroCurrency, formatEuroDate, calculateLineTotal, calculateVAT, getDatePlusDays, generateQuotationNumber } from '@/lib/formatting';

interface QuotationTemplateProps {
  configuration: BoatConfiguration;
  settings: GlobalSettings;
  client?: Client | null;
  quotationNumber?: string;
  reference?: string;
  notes?: string;
  seller?: string;
  pageNumber?: number;
  totalPages?: number;
}

export const QuotationTemplate = forwardRef<HTMLDivElement, QuotationTemplateProps>(
  ({ configuration, settings, client, quotationNumber, reference, notes, seller = 'Erik van den Brand', pageNumber = 1, totalPages = 1 }, ref) => {
    const includedItems = configuration.items.filter(i => i.included);

    // Calculate totals
    let subtotal = 0;
    for (const item of includedItems) {
      subtotal += calculateLineTotal(item.article.sales_price_excl_vat, item.quantity, item.article.discount_percent);
    }
    const vatAmount = calculateVAT(subtotal, settings.vat_rate);
    const total = subtotal + vatAmount;

    const today = new Date();
    const validUntil = getDatePlusDays(settings.quotation_validity_days);
    const qNumber = quotationNumber || generateQuotationNumber();

    // Generate a debtor number from client or random
    const debtorNumber = client ? `${client.id.slice(-3).toUpperCase()}` : '255';

    return (
      <div
        ref={ref}
        className="quotation-template bg-white text-slate-800 relative overflow-hidden"
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: '11px',
          lineHeight: '1.4',
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm 20mm',
          boxSizing: 'border-box',
        }}
      >
        {/* Watermark Background */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '20mm',
            right: '-30mm',
            width: '200mm',
            height: '200mm',
            opacity: 0.08,
            transform: 'rotate(-10deg)',
          }}
        >
          <svg viewBox="0 0 400 300" fill="#5B8FA8">
            {/* Helm wheel */}
            <circle cx="250" cy="120" r="80" fill="none" stroke="#5B8FA8" strokeWidth="12"/>
            <circle cx="250" cy="120" r="20" fill="none" stroke="#5B8FA8" strokeWidth="8"/>
            {/* Spokes */}
            <line x1="250" y1="40" x2="250" y2="100" stroke="#5B8FA8" strokeWidth="10"/>
            <line x1="250" y1="140" x2="250" y2="200" stroke="#5B8FA8" strokeWidth="10"/>
            <line x1="170" y1="120" x2="230" y2="120" stroke="#5B8FA8" strokeWidth="10"/>
            <line x1="270" y1="120" x2="330" y2="120" stroke="#5B8FA8" strokeWidth="10"/>
            <line x1="193" y1="63" x2="236" y2="106" stroke="#5B8FA8" strokeWidth="10"/>
            <line x1="264" y1="134" x2="307" y2="177" stroke="#5B8FA8" strokeWidth="10"/>
            <line x1="193" y1="177" x2="236" y2="134" stroke="#5B8FA8" strokeWidth="10"/>
            <line x1="264" y1="106" x2="307" y2="63" stroke="#5B8FA8" strokeWidth="10"/>
            {/* Waves */}
            <path d="M30 220 Q80 190 130 220 T230 220 T330 220" fill="none" stroke="#5B8FA8" strokeWidth="12" strokeLinecap="round"/>
            <path d="M60 250 Q110 220 160 250 T260 250 T360 250" fill="none" stroke="#5B8FA8" strokeWidth="8" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Header Row */}
        <div className="flex justify-between mb-8">
          {/* Left side - Customer Info */}
          <div className="w-1/2">
            <div className="mb-6">
              <p className="font-semibold text-slate-900">
                {client?.company_name || `${client?.first_name || 'M.'} ${client?.last_name || 'Blazer'}`}
              </p>
              <p className="text-slate-600">T.a.v.</p>
              {client?.street_address && <p className="text-slate-600">{client.street_address}</p>}
              {client?.postal_code && client?.city && (
                <p className="text-slate-600">{client.postal_code} {client.city}</p>
              )}
              <p className="text-slate-600 mt-2">{client?.country || 'Nederland'}</p>
            </div>
          </div>

          {/* Right side - Company Info */}
          <div className="text-right text-slate-600" style={{ fontSize: '10px' }}>
            <p className="font-bold text-[#5B8FA8] text-lg mb-1">Navisol</p>
            <p>Industriestraat 25</p>
            <p>8081HH Elburg</p>
            <p>+31(0)850600139</p>
            <p className="mt-2">KvK: 91533716</p>
            <p>IBAN NL10INGB0106369652</p>
            <p>BTW NL865686506B01</p>
          </div>
        </div>

        {/* Title */}
        <h1
          className="text-right mb-6"
          style={{
            fontSize: '32px',
            fontWeight: '300',
            color: '#5B8FA8',
            letterSpacing: '2px',
          }}
        >
          Offerte
        </h1>

        {/* Quote Details Row */}
        <div className="flex justify-between mb-6 text-xs">
          <div className="space-y-1">
            <div className="flex">
              <span className="text-slate-500 w-28">Offertenummer</span>
              <span className="text-slate-500 mx-2">:</span>
              <span className="font-medium">{qNumber}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-28">Offertedatum</span>
              <span className="text-slate-500 mx-2">:</span>
              <span>{formatEuroDate(today)}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-28">Vervaldatum</span>
              <span className="text-slate-500 mx-2">:</span>
              <span>{formatEuroDate(validUntil)}</span>
            </div>
            <div className="flex">
              <span className="text-slate-500 w-28">Verkoper</span>
              <span className="text-slate-500 mx-2">:</span>
              <span>{seller}</span>
            </div>
          </div>

          <div className="space-y-1 text-right">
            <div className="flex justify-end">
              <span className="text-slate-500 w-28 text-left">Debiteurennummer</span>
              <span className="text-slate-500 mx-2">:</span>
              <span className="w-32 text-left">{debtorNumber}</span>
            </div>
            <div className="flex justify-end">
              <span className="text-slate-500 w-28 text-left">Uw referentie</span>
              <span className="text-slate-500 mx-2">:</span>
              <span className="w-32 text-left">{reference || ''}</span>
            </div>
            <div className="flex justify-end">
              <span className="text-slate-500 w-28 text-left">Leveringswijze</span>
              <span className="text-slate-500 mx-2">:</span>
              <span className="w-32 text-left">Af fabriek Elburg</span>
            </div>
            <div className="flex justify-end">
              <span className="text-slate-500 w-28 text-left">Pagina</span>
              <span className="text-slate-500 mx-2">:</span>
              <span className="w-32 text-left">{pageNumber} / {totalPages}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          {/* Table Header */}
          <div
            className="flex border-b-2 border-slate-300 pb-2 mb-2 font-semibold text-xs"
            style={{ color: '#5B8FA8' }}
          >
            <div className="flex-1">Omschrijving</div>
            <div className="w-16 text-center">Aantal</div>
            <div className="w-24 text-right">Prijs</div>
            <div className="w-14 text-center">BTW</div>
            <div className="w-24 text-right">Totaalbedrag</div>
          </div>

          {/* Configuration Title */}
          <div className="py-2 border-b border-slate-200">
            <span className="font-medium">{configuration.boat_model} - {configuration.propulsion_type}</span>
          </div>

          {/* Items */}
          {includedItems.map((item, idx) => {
            const lineTotal = calculateLineTotal(item.article.sales_price_excl_vat, item.quantity, item.article.discount_percent);
            const vatPercent = Math.round(settings.vat_rate * 100);

            return (
              <div
                key={item.article.id}
                className="flex py-1.5 border-b border-slate-100 text-xs"
              >
                <div className="flex-1 pr-2">
                  <span>{item.article.part_name}</span>
                  {item.article.voltage_power && (
                    <span className="text-slate-500 ml-1">({item.article.voltage_power})</span>
                  )}
                </div>
                <div className="w-16 text-center">{item.quantity}</div>
                <div className="w-24 text-right font-mono">
                  € {formatEuroNumber(item.article.sales_price_excl_vat)}
                </div>
                <div className="w-14 text-center text-slate-500">{vatPercent}%</div>
                <div className="w-24 text-right font-mono">
                  € {formatEuroNumber(lineTotal)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtotal */}
        <div className="flex justify-end border-t-2 border-slate-300 pt-4">
          <div className="text-right">
            <div className="flex items-center text-sm">
              <span className="font-semibold mr-8">Subtotaal</span>
              <span className="font-mono font-bold text-lg">€ {formatEuroNumber(subtotal)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="mt-8 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-600">{notes}</p>
          </div>
        )}

        {/* Footer - Totals (for last page) */}
        {pageNumber === totalPages && (
          <div className="mt-8 pt-4 border-t-2 border-[#5B8FA8]">
            <div className="flex justify-end space-x-8 text-sm">
              <div className="text-right space-y-1">
                <div className="flex justify-between">
                  <span className="mr-8">Subtotaal excl. BTW:</span>
                  <span className="font-mono">€ {formatEuroNumber(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="mr-8">BTW {Math.round(settings.vat_rate * 100)}%:</span>
                  <span className="font-mono">€ {formatEuroNumber(vatAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-300">
                  <span className="mr-8">Totaal incl. BTW:</span>
                  <span className="font-mono text-[#5B8FA8]">€ {formatEuroNumber(total)}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="mt-8 text-xs text-slate-500 space-y-1">
              <p>Betalingstermijn: 14 dagen na factuurdatum</p>
              <p>Leveringsvoorwaarden: {settings.delivery_terms}</p>
              <p>Deze offerte is {settings.quotation_validity_days} dagen geldig.</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

QuotationTemplate.displayName = 'QuotationTemplate';

// Helper to format number with European formatting (without currency symbol)
function formatEuroNumber(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return rounded.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Export PDF with the styled template
export async function exportQuotationToPDF(
  configuration: BoatConfiguration,
  settings: GlobalSettings,
  client?: Client | null,
  quotationNumber?: string,
  seller?: string,
): Promise<void> {
  if (typeof window === 'undefined') return;

  const html2pdf = (await import('html2pdf.js')).default;

  const includedItems = configuration.items.filter(i => i.included);
  let subtotal = 0;
  for (const item of includedItems) {
    subtotal += calculateLineTotal(item.article.sales_price_excl_vat, item.quantity, item.article.discount_percent);
  }
  const vatAmount = calculateVAT(subtotal, settings.vat_rate);
  const total = subtotal + vatAmount;

  const today = new Date();
  const validUntil = getDatePlusDays(settings.quotation_validity_days);
  const qNumber = quotationNumber || generateQuotationNumber();
  const debtorNumber = client ? `${client.id.slice(-3).toUpperCase()}` : '255';

  // Build HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; size: A4; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          color: #1e293b;
        }
        .page {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 20mm;
          background: white;
          overflow: hidden;
        }
        .watermark {
          position: absolute;
          bottom: 20mm;
          right: -30mm;
          width: 200mm;
          height: 200mm;
          opacity: 0.06;
          transform: rotate(-10deg);
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .customer { width: 50%; }
        .company { text-align: right; font-size: 10px; color: #64748b; }
        .company-name { color: #5B8FA8; font-size: 18px; font-weight: bold; margin-bottom: 4px; }
        .title {
          text-align: right;
          font-size: 32px;
          font-weight: 300;
          color: #5B8FA8;
          letter-spacing: 2px;
          margin-bottom: 24px;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
          font-size: 11px;
        }
        .detail-item { display: flex; margin-bottom: 4px; }
        .detail-label { color: #64748b; width: 110px; }
        .detail-sep { color: #64748b; margin: 0 8px; }
        .table-header {
          display: flex;
          border-bottom: 2px solid #cbd5e1;
          padding-bottom: 8px;
          margin-bottom: 8px;
          font-weight: 600;
          color: #5B8FA8;
          font-size: 11px;
        }
        .table-row {
          display: flex;
          padding: 6px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 11px;
        }
        .col-desc { flex: 1; padding-right: 8px; }
        .col-qty { width: 60px; text-align: center; }
        .col-price { width: 90px; text-align: right; font-family: monospace; }
        .col-vat { width: 50px; text-align: center; color: #64748b; }
        .col-total { width: 90px; text-align: right; font-family: monospace; }
        .subtotal-row {
          display: flex;
          justify-content: flex-end;
          border-top: 2px solid #cbd5e1;
          padding-top: 16px;
          margin-top: 8px;
        }
        .subtotal-label { font-weight: 600; margin-right: 32px; }
        .subtotal-value { font-family: monospace; font-weight: bold; font-size: 14px; }
        .footer-totals {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 2px solid #5B8FA8;
        }
        .total-row { display: flex; justify-content: flex-end; margin-bottom: 4px; }
        .total-label { margin-right: 32px; }
        .total-value { font-family: monospace; width: 100px; text-align: right; }
        .grand-total { font-weight: bold; font-size: 16px; color: #5B8FA8; padding-top: 8px; border-top: 1px solid #cbd5e1; }
        .terms { margin-top: 32px; font-size: 10px; color: #64748b; }
        .config-title { padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Watermark -->
        <div class="watermark">
          <svg viewBox="0 0 400 300" fill="#5B8FA8">
            <circle cx="250" cy="120" r="80" fill="none" stroke="#5B8FA8" stroke-width="12"/>
            <circle cx="250" cy="120" r="20" fill="none" stroke="#5B8FA8" stroke-width="8"/>
            <line x1="250" y1="40" x2="250" y2="100" stroke="#5B8FA8" stroke-width="10"/>
            <line x1="250" y1="140" x2="250" y2="200" stroke="#5B8FA8" stroke-width="10"/>
            <line x1="170" y1="120" x2="230" y2="120" stroke="#5B8FA8" stroke-width="10"/>
            <line x1="270" y1="120" x2="330" y2="120" stroke="#5B8FA8" stroke-width="10"/>
            <line x1="193" y1="63" x2="236" y2="106" stroke="#5B8FA8" stroke-width="10"/>
            <line x1="264" y1="134" x2="307" y2="177" stroke="#5B8FA8" stroke-width="10"/>
            <line x1="193" y1="177" x2="236" y2="134" stroke="#5B8FA8" stroke-width="10"/>
            <line x1="264" y1="106" x2="307" y2="63" stroke="#5B8FA8" stroke-width="10"/>
            <path d="M30 220 Q80 190 130 220 T230 220 T330 220" fill="none" stroke="#5B8FA8" stroke-width="12" stroke-linecap="round"/>
            <path d="M60 250 Q110 220 160 250 T260 250 T360 250" fill="none" stroke="#5B8FA8" stroke-width="8" stroke-linecap="round"/>
          </svg>
        </div>

        <!-- Header -->
        <div class="header">
          <div class="customer">
            <p style="font-weight: 600; color: #0f172a;">${client?.company_name || `${client?.first_name || 'M.'} ${client?.last_name || 'Klant'}`}</p>
            <p style="color: #64748b;">T.a.v.</p>
            ${client?.street_address ? `<p style="color: #64748b;">${client.street_address}</p>` : ''}
            ${client?.postal_code && client?.city ? `<p style="color: #64748b;">${client.postal_code} ${client.city}</p>` : ''}
            <p style="color: #64748b; margin-top: 8px;">${client?.country || 'Nederland'}</p>
          </div>
          <div class="company">
            <p class="company-name">Navisol</p>
            <p>Industriestraat 25</p>
            <p>8081HH Elburg</p>
            <p>+31(0)850600139</p>
            <p style="margin-top: 8px;">KvK: 91533716</p>
            <p>IBAN NL10INGB0106369652</p>
            <p>BTW NL865686506B01</p>
          </div>
        </div>

        <!-- Title -->
        <h1 class="title">Offerte</h1>

        <!-- Details Row -->
        <div class="details-row">
          <div>
            <div class="detail-item">
              <span class="detail-label">Offertenummer</span>
              <span class="detail-sep">:</span>
              <span style="font-weight: 500;">${qNumber}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Offertedatum</span>
              <span class="detail-sep">:</span>
              <span>${formatEuroDate(today)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Vervaldatum</span>
              <span class="detail-sep">:</span>
              <span>${formatEuroDate(validUntil)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Verkoper</span>
              <span class="detail-sep">:</span>
              <span>${seller || 'Erik van den Brand'}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="detail-item" style="justify-content: flex-end;">
              <span class="detail-label">Debiteurennummer</span>
              <span class="detail-sep">:</span>
              <span style="width: 120px; text-align: left;">${debtorNumber}</span>
            </div>
            <div class="detail-item" style="justify-content: flex-end;">
              <span class="detail-label">Uw referentie</span>
              <span class="detail-sep">:</span>
              <span style="width: 120px; text-align: left;"></span>
            </div>
            <div class="detail-item" style="justify-content: flex-end;">
              <span class="detail-label">Leveringswijze</span>
              <span class="detail-sep">:</span>
              <span style="width: 120px; text-align: left;">Af fabriek Elburg</span>
            </div>
            <div class="detail-item" style="justify-content: flex-end;">
              <span class="detail-label">Pagina</span>
              <span class="detail-sep">:</span>
              <span style="width: 120px; text-align: left;">1 / 1</span>
            </div>
          </div>
        </div>

        <!-- Table Header -->
        <div class="table-header">
          <div class="col-desc">Omschrijving</div>
          <div class="col-qty">Aantal</div>
          <div class="col-price">Prijs</div>
          <div class="col-vat">BTW</div>
          <div class="col-total">Totaalbedrag</div>
        </div>

        <!-- Config Title -->
        <div class="config-title">${configuration.boat_model} - ${configuration.propulsion_type}</div>

        <!-- Items -->
        ${includedItems.map(item => {
          const lineTotal = calculateLineTotal(item.article.sales_price_excl_vat, item.quantity, item.article.discount_percent);
          const vatPercent = Math.round(settings.vat_rate * 100);
          return `
            <div class="table-row">
              <div class="col-desc">${item.article.part_name}${item.article.voltage_power ? ` (${item.article.voltage_power})` : ''}</div>
              <div class="col-qty">${item.quantity}</div>
              <div class="col-price">€ ${formatEuroNumberStatic(item.article.sales_price_excl_vat)}</div>
              <div class="col-vat">${vatPercent}%</div>
              <div class="col-total">€ ${formatEuroNumberStatic(lineTotal)}</div>
            </div>
          `;
        }).join('')}

        <!-- Subtotal -->
        <div class="subtotal-row">
          <span class="subtotal-label">Subtotaal</span>
          <span class="subtotal-value">€ ${formatEuroNumberStatic(subtotal)}</span>
        </div>

        <!-- Footer Totals -->
        <div class="footer-totals">
          <div class="total-row">
            <span class="total-label">Subtotaal excl. BTW:</span>
            <span class="total-value">€ ${formatEuroNumberStatic(subtotal)}</span>
          </div>
          <div class="total-row" style="color: #64748b;">
            <span class="total-label">BTW ${Math.round(settings.vat_rate * 100)}%:</span>
            <span class="total-value">€ ${formatEuroNumberStatic(vatAmount)}</span>
          </div>
          <div class="total-row grand-total">
            <span class="total-label">Totaal incl. BTW:</span>
            <span class="total-value">€ ${formatEuroNumberStatic(total)}</span>
          </div>
        </div>

        <!-- Terms -->
        <div class="terms">
          <p>Betalingstermijn: 14 dagen na factuurdatum</p>
          <p>Leveringsvoorwaarden: ${settings.delivery_terms}</p>
          <p>Deze offerte is ${settings.quotation_validity_days} dagen geldig.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  const opt = {
    margin: 0,
    filename: `Navisol-Offerte-${qNumber}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
  };

  try {
    const element = container.querySelector('.page') as HTMLElement | null;
    if (element) {
      await html2pdf().set(opt).from(element).save();
    }
  } finally {
    document.body.removeChild(container);
  }
}

function formatEuroNumberStatic(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return rounded.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Equipment List Viewer - v4
 *
 * Displays an equipment list document in a printable format.
 * Supports brand templates with customized styling.
 *
 * NO PRICING displayed anywhere per contract.
 */

'use client';

import { useMemo } from 'react';
import {
  Printer,
  Download,
  Package,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  Ship,
  FolderOpen,
} from 'lucide-react';
import type { EquipmentListDocument, EquipmentListBrand } from '@/domain/models';
import { DEFAULT_EQUIPMENT_LIST_BRANDS } from '@/domain/models';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ============================================
// TYPES
// ============================================

interface EquipmentListViewerProps {
  document: EquipmentListDocument;
  showActions?: boolean;
  onPrint?: () => void;
  onDownload?: () => void;
}

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getBrand(brandKey: string): EquipmentListBrand {
  return DEFAULT_EQUIPMENT_LIST_BRANDS.find(b => b.key === brandKey)
    || DEFAULT_EQUIPMENT_LIST_BRANDS[0];
}

// ============================================
// COMPONENT
// ============================================

export function EquipmentListViewer({
  document: doc,
  showActions = true,
  onPrint,
  onDownload,
}: EquipmentListViewerProps) {
  const brand = useMemo(() => getBrand(doc.brandKey), [doc.brandKey]);

  // Handle print
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  // Handle download (exports as HTML file)
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Generate downloadable HTML
      const html = generatePrintableHTML(doc, brand);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `equipment-list-${doc.projectNumber}-v${doc.version}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar (not printed) */}
      {showActions && (
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Package className="h-3 w-3" />
              v{doc.version}
            </Badge>
            <Badge
              variant="secondary"
              style={{
                backgroundColor: brand.primaryColor + '20',
                color: brand.primaryColor,
              }}
            >
              {brand.name}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      )}

      {/* Document Content */}
      <div
        className="bg-white border rounded-lg p-8 print:border-0 print:p-0"
        style={{
          '--brand-primary': brand.primaryColor,
          '--brand-secondary': brand.secondaryColor,
        } as React.CSSProperties}
      >
        {/* Header */}
        <div className="border-b pb-6 mb-6" style={{ borderColor: brand.primaryColor }}>
          <div className="flex items-start justify-between">
            <div>
              {brand.companyName && (
                <h1
                  className="text-2xl font-bold"
                  style={{ color: brand.primaryColor }}
                >
                  {brand.companyName}
                </h1>
              )}
              <h2 className="text-xl font-semibold text-slate-800 mt-2">
                Equipment List
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Document Version</p>
              <p className="text-lg font-bold text-slate-800">v{doc.version}</p>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-500">Project</span>
            </div>
            <div className="pl-6">
              <p className="font-semibold text-slate-800">{doc.projectNumber}</p>
              <p className="text-slate-600">{doc.projectTitle}</p>
              {doc.unitLabel && (
                <p className="text-sm text-slate-500 mt-1">Unit: {doc.unitLabel}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-500">Client</span>
            </div>
            <div className="pl-6">
              <p className="font-semibold text-slate-800">{doc.clientName || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-500">Propulsion</span>
            </div>
            <div className="pl-6">
              <p className="text-slate-800">{doc.propulsionType || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-500">Generated</span>
            </div>
            <div className="pl-6">
              <p className="text-slate-800">{formatDate(doc.generatedAt)}</p>
              <p className="text-sm text-slate-500">by {doc.generatedBy}</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div
          className="p-4 rounded-lg mb-8"
          style={{ backgroundColor: brand.primaryColor + '10' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Total Items</span>
            <span
              className="text-lg font-bold"
              style={{ color: brand.primaryColor }}
            >
              {doc.totalItemCount}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-medium text-slate-700">Categories</span>
            <span
              className="text-lg font-bold"
              style={{ color: brand.primaryColor }}
            >
              {doc.sections.length}
            </span>
          </div>
        </div>

        {/* Equipment Sections */}
        <div className="space-y-8">
          {doc.sections.map((section, sectionIndex) => (
            <div key={section.category}>
              {/* Section Header */}
              <div
                className="flex items-center gap-2 mb-4 pb-2 border-b-2"
                style={{ borderColor: brand.primaryColor }}
              >
                <Package
                  className="h-5 w-5"
                  style={{ color: brand.primaryColor }}
                />
                <h3
                  className="text-lg font-semibold"
                  style={{ color: brand.primaryColor }}
                >
                  {section.category}
                </h3>
                <Badge variant="outline" className="ml-auto">
                  {section.itemCount} items
                </Badge>
              </div>

              {/* Items Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-32">Article No.</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24 text-center">Qty</TableHead>
                    <TableHead className="w-20">Unit</TableHead>
                    <TableHead className="w-20 text-center">CE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.items.map((item, itemIndex) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-slate-500">
                        {itemIndex + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.articleNumber || '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-800">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{item.description}</p>
                          )}
                          {item.subcategory && (
                            <Badge variant="outline" className="text-[10px] mt-1">
                              {item.subcategory}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {item.unit}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.ceRelevant ? (
                          <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                        ) : item.safetyCritical ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>

        {/* Notes */}
        {doc.notes && (
          <div className="mt-8 p-4 bg-slate-50 rounded-lg">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Notes</h4>
            <p className="text-sm text-slate-600">{doc.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center">
          {brand.footerText && (
            <p className="text-xs text-slate-500">{brand.footerText}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            Generated on {formatDate(doc.generatedAt)} | Document ID: {doc.id.slice(0, 8)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PRINTABLE HTML GENERATOR
// ============================================

function generatePrintableHTML(doc: EquipmentListDocument, brand: EquipmentListBrand): string {
  const sectionsHTML = doc.sections.map(section => `
    <div class="section">
      <h3 style="color: ${brand.primaryColor}; border-bottom: 2px solid ${brand.primaryColor}; padding-bottom: 8px; margin-bottom: 16px;">
        ${section.category} (${section.itemCount} items)
      </h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Article No.</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          ${section.items.map((item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${item.articleNumber || '-'}</td>
              <td>
                <strong>${item.name}</strong>
                ${item.description ? `<br><small>${item.description}</small>` : ''}
              </td>
              <td style="text-align: center;">${item.quantity}</td>
              <td>${item.unit}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Equipment List - ${doc.projectNumber} v${doc.version}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #1e293b;
    }
    .header {
      border-bottom: 3px solid ${brand.primaryColor};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: ${brand.primaryColor};
      margin: 0;
    }
    .header h2 {
      margin: 10px 0 0;
      font-weight: normal;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .info-item label {
      font-size: 12px;
      color: #64748b;
      display: block;
      margin-bottom: 4px;
    }
    .info-item p {
      margin: 0;
      font-weight: 600;
    }
    .summary {
      background: ${brand.primaryColor}10;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .summary-row:last-child { margin-bottom: 0; }
    .summary-value {
      font-weight: bold;
      color: ${brand.primaryColor};
    }
    .section {
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f8fafc;
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${brand.companyName || 'Equipment List'}</h1>
    <h2>Equipment List - v${doc.version}</h2>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <label>Project</label>
      <p>${doc.projectNumber} - ${doc.projectTitle}</p>
      ${doc.unitLabel ? `<small>Unit: ${doc.unitLabel}</small>` : ''}
    </div>
    <div class="info-item">
      <label>Client</label>
      <p>${doc.clientName || 'N/A'}</p>
    </div>
    <div class="info-item">
      <label>Propulsion</label>
      <p>${doc.propulsionType || 'N/A'}</p>
    </div>
    <div class="info-item">
      <label>Generated</label>
      <p>${new Date(doc.generatedAt).toLocaleDateString('en-GB')}</p>
    </div>
  </div>

  <div class="summary">
    <div class="summary-row">
      <span>Total Items</span>
      <span class="summary-value">${doc.totalItemCount}</span>
    </div>
    <div class="summary-row">
      <span>Categories</span>
      <span class="summary-value">${doc.sections.length}</span>
    </div>
  </div>

  ${sectionsHTML}

  ${doc.notes ? `
    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 30px;">
      <strong>Notes:</strong><br>
      ${doc.notes}
    </div>
  ` : ''}

  <div class="footer">
    ${brand.footerText ? `<p>${brand.footerText}</p>` : ''}
    <p>Generated on ${new Date(doc.generatedAt).toLocaleDateString('en-GB')} | Document ID: ${doc.id.slice(0, 8)}</p>
  </div>
</body>
</html>`;
}

export { generatePrintableHTML };

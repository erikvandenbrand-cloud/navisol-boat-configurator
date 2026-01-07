// PDF Export Utilities for Navisol

export interface PDFExportOptions {
  printOptimized?: boolean;
  includePageNumbers?: boolean;
  headerFooter?: boolean;
}

// Dynamic import for html2pdf (client-side only)
export async function exportToPDF(
  content: string,
  filename: string,
  title?: string,
  options?: PDFExportOptions
): Promise<void> {
  const printOptimized = options?.printOptimized ?? false;
  // Only run on client
  if (typeof window === 'undefined') return;

  // Dynamically import html2pdf
  const html2pdf = (await import('html2pdf.js')).default;

  // Create a container element
  const container = document.createElement('div');
  container.innerHTML = generatePDFHTML(content, title, printOptimized);
  container.style.width = '210mm'; // A4 width
  container.style.padding = printOptimized ? '15mm' : '20mm';
  container.style.fontFamily = 'Arial, sans-serif';

  // Temporarily add to document (required for html2pdf)
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as ('avoid-all' | 'css' | 'legacy')[] }
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

// Convert markdown to styled HTML for PDF
function generatePDFHTML(markdown: string, title?: string, printOptimized = false): string {
  const html = markdownToHTML(markdown);

  const printStyles = printOptimized ? `
    @page {
      size: A4;
      margin: 15mm;
    }
    @media print {
      h1 { page-break-before: auto; }
      h2 { page-break-before: always; page-break-after: avoid; }
      h3 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
      .diagram-placeholder { page-break-inside: avoid; }
    }
    h1 { font-size: 20px; margin-bottom: 16px; }
    h2 { font-size: 16px; margin-top: 0; padding-top: 16px; }
    h3 { font-size: 13px; }
    table { font-size: 10px; }
    th { padding: 6px 8px; }
    td { padding: 4px 8px; }
    p, li { font-size: 11px; line-height: 1.4; }
  ` : '';

  const diagramStyles = `
    .diagram-placeholder {
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      margin: 16px 0;
      background: #f8fafc;
      text-align: center;
      page-break-inside: avoid;
    }
    .diagram-placeholder > div:first-child {
      color: #64748b;
      font-size: 12px;
      margin-bottom: 6px;
    }
    .diagram-placeholder > div:nth-child(2) {
      color: #1e293b;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 6px;
    }
    .diagram-placeholder > div:nth-child(3) {
      color: #64748b;
      font-size: 11px;
    }
    .diagram-placeholder > div:last-child {
      margin-top: 10px;
      padding: 30px;
      background: #e2e8f0;
      border-radius: 4px;
      color: #94a3b8;
      font-size: 12px;
    }
  `;

  return `
    <div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">
      <style>
        h1 {
          color: #0f172a;
          font-size: 24px;
          border-bottom: 3px solid #10b981;
          padding-bottom: 12px;
          margin-bottom: 24px;
        }
        h2 {
          color: #1e293b;
          font-size: 18px;
          margin-top: 24px;
          margin-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
        }
        h3 {
          color: #334155;
          font-size: 14px;
          margin-top: 16px;
          margin-bottom: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 11px;
        }
        th {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 8px 10px;
          text-align: left;
          font-weight: 600;
        }
        td {
          border: 1px solid #cbd5e1;
          padding: 6px 10px;
        }
        tr:nth-child(even) td {
          background: #f8fafc;
        }
        ul {
          margin: 12px 0;
          padding-left: 24px;
        }
        li {
          margin: 4px 0;
        }
        hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 20px 0;
        }
        strong {
          font-weight: 600;
          color: #0f172a;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #10b981;
        }
        .company-info {
          font-size: 12px;
          color: #475569;
        }
        .summary-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
        }
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          font-size: 10px;
          color: #64748b;
          text-align: center;
        }
        ${diagramStyles}
        ${printStyles}
      </style>
      ${html}
      <div class="footer">
        NAVISOL B.V. • Industriestraat 25, 8081HH Elburg • +31 (0)85 0600 139
      </div>
    </div>
  `;
}

// Simple markdown to HTML converter
function markdownToHTML(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    // Line breaks
    .replace(/  \n/g, '<br>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Checkboxes
    .replace(/\[ \]/g, '&#9744;')
    .replace(/\[x\]/g, '&#9745;');

  // Tables
  const tableRegex = /\|(.+)\|\n\|[-| ]+\|\n((\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, (match, header, body) => {
    const headerCells = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
    const bodyRows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  // Wrap lists
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Paragraphs
  html = html.split('\n\n').map(p => {
    if (p.startsWith('<h') || p.startsWith('<table') || p.startsWith('<ul') || p.startsWith('<hr')) {
      return p;
    }
    return `<p>${p}</p>`;
  }).join('\n');

  return html;
}

/**
 * Generate consolidated Excel workbook from architecture CSV files
 * Run with: bun run .same/generate-excel.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// CSV files to include in the workbook
const csvFiles = [
  { file: 'architecture-models.csv', sheetName: 'Domain Models' },
  { file: 'architecture-services.csv', sheetName: 'Services' },
  { file: 'architecture-screens.csv', sheetName: 'Screens & Components' },
  { file: 'architecture-repositories.csv', sheetName: 'Repositories' },
  { file: 'architecture-enums.csv', sheetName: 'Enums & States' },
];

const sameDir = path.dirname(new URL(import.meta.url).pathname);

// Create a new workbook
const workbook = XLSX.utils.book_new();

// Process each CSV file
for (const { file, sheetName } of csvFiles) {
  const csvPath = path.join(sameDir, file);

  if (!fs.existsSync(csvPath)) {
    console.warn(`Warning: ${file} not found, skipping...`);
    continue;
  }

  // Read CSV content
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV to worksheet
  const worksheet = XLSX.read(csvContent, { type: 'string' }).Sheets.Sheet1;

  // Set column widths for better readability
  const colWidths: XLSX.ColInfo[] = [];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  for (let col = range.s.c; col <= range.e.c; col++) {
    let maxWidth = 10;
    for (let row = range.s.r; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      if (cell && cell.v) {
        const cellWidth = String(cell.v).length;
        maxWidth = Math.min(Math.max(maxWidth, cellWidth), 50);
      }
    }
    colWidths.push({ wch: maxWidth + 2 });
  }
  worksheet['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  console.log(`✓ Added sheet: ${sheetName}`);
}

// Add a summary sheet at the beginning
const summaryData = [
  ['Navisol v4 Architecture Documentation'],
  [''],
  ['Generated:', new Date().toISOString()],
  ['Version:', '301'],
  [''],
  ['Sheets:'],
  ...csvFiles.map(({ sheetName }, i) => [`${i + 1}. ${sheetName}`]),
  [''],
  ['Architecture Principles:'],
  ['1. Project is the Hub - Everything relates to a Project'],
  ['2. Library/Project Separation - Templates in Library, instances in Project'],
  ['3. Single Write Path - All mutations through Services'],
  ['4. Version Pinning - Projects pin specific library versions'],
  ['5. Immutability After Freeze - Quotes and configs freeze at milestones'],
  ['6. Audit Everything - All significant actions logged'],
  ['7. Persistence Adapter - Swap LocalStorage for Neon without code changes'],
  [''],
  ['Project Status Flow:'],
  ['DRAFT → QUOTED → OFFER_SENT → ORDER_CONFIRMED → IN_PRODUCTION → READY_FOR_DELIVERY → DELIVERED → CLOSED'],
];

const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
summarySheet['!cols'] = [{ wch: 80 }];

// Insert summary at the beginning
XLSX.utils.book_append_sheet(workbook, summarySheet, 'Overview', true);

// Write the workbook
const outputPath = path.join(sameDir, 'Navisol-Architecture.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`\n✅ Excel workbook created: ${outputPath}`);
console.log(`   Total sheets: ${workbook.SheetNames.length}`);

#!/usr/bin/env node

/**
 * check-forbidden-imports.mjs
 *
 * Scans source files for forbidden legacy tokens.
 * Exits with code 1 if any are found.
 *
 * This script protects against reintroducing legacy v1-v3 code.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

// Forbidden tokens - these should NEVER appear in runtime source code
const FORBIDDEN_TOKENS = [
  // Legacy app components
  'AppV2',
  'AppV1',

  // Legacy stores
  'store-v2',
  'store-v3',
  'src/lib/store',
  '@/lib/store.tsx',
  '@/lib/store-v2',
  '@/lib/store-v3',

  // Legacy types
  '@/lib/types.ts',
  '@/lib/types-v2',
  '@/lib/types-v3',

  // Legacy localStorage keys
  'navisol_clients',
  'navisol_quotations',
  'navisol_articles',
  'navisol_configurations',
  'navisol_ce_documents',
  'navisol_settings',
  'navisol_article_groups',
  'navisol_client_boats',

  // Legacy stores (filenames)
  'auth-store.tsx',
  'media-store.tsx',
  'task-store.tsx',
  'maintenance-store.tsx',
  'procedures-store.tsx',
  'boat-models-store.tsx',
];

// Files/directories to exclude from scanning
const EXCLUDED_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /out\//,
  /\.same\//,
  /ARCHITECTURE\.md$/,
  /check-forbidden-imports\.mjs$/,
  /\.md$/,
];

// File extensions to scan
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/**
 * Check if a path should be excluded
 */
function shouldExclude(filePath) {
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(filePath)) {
      return true;
    }
  }
  return false;
}

/**
 * Recursively get all source files
 */
function getSourceFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (shouldExclude(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      getSourceFiles(fullPath, files);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Scan a file for forbidden tokens
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  for (const token of FORBIDDEN_TOKENS) {
    if (content.includes(token)) {
      // Find line numbers
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(token)) {
          violations.push({
            token,
            line: i + 1,
            content: lines[i].trim().substring(0, 100),
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Scanning for forbidden legacy tokens...\n');

  const sourceFiles = getSourceFiles(srcDir);
  console.log(`Found ${sourceFiles.length} source files to scan.\n`);

  let totalViolations = 0;
  const fileViolations = [];

  for (const filePath of sourceFiles) {
    const violations = scanFile(filePath);
    if (violations.length > 0) {
      totalViolations += violations.length;
      fileViolations.push({
        file: path.relative(rootDir, filePath),
        violations,
      });
    }
  }

  if (totalViolations > 0) {
    console.log('❌ FORBIDDEN LEGACY TOKENS FOUND!\n');
    console.log('The following files contain legacy tokens that must be removed:\n');

    for (const { file, violations } of fileViolations) {
      console.log(`📁 ${file}`);
      for (const { token, line, content } of violations) {
        console.log(`   Line ${line}: Found "${token}"`);
        console.log(`   > ${content}`);
      }
      console.log('');
    }

    console.log(`\nTotal violations: ${totalViolations}`);
    console.log('\n⚠️  Legacy code is not allowed in v4 architecture!');
    console.log('   See src/domain/ARCHITECTURE.md for allowed imports.\n');

    process.exit(1);
  }

  console.log('✅ No forbidden legacy tokens found!');
  console.log('   The codebase is clean from legacy v1-v3 code.\n');
  process.exit(0);
}

main();

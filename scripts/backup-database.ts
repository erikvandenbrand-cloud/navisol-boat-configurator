#!/usr/bin/env bun

/**
 * Database Backup Script voor NAVISOL v4
 *
 * Dit script maakt een volledige backup van de Supabase database
 * en slaat deze op als JSON bestand.
 *
 * Gebruik:
 *   bun run scripts/backup-database.ts
 *
 * Output:
 *   backups/backup-YYYY-MM-DD-HHmmss.json
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Kleuren voor console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function backupDatabase() {
  log('═══════════════════════════════════════════════════', colors.blue);
  log('  NAVISOL v4 - Database Backup', colors.blue);
  log('═══════════════════════════════════════════════════', colors.blue);
  console.log('');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('❌ ERROR: Supabase credentials niet gevonden', colors.red);
    log('', colors.reset);
    log('Zorg ervoor dat .env.local bestaat met:', colors.yellow);
    log('  NEXT_PUBLIC_SUPABASE_URL=...', colors.yellow);
    log('  NEXT_PUBLIC_SUPABASE_ANON_KEY=...', colors.yellow);
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Create backups directory if it doesn't exist
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir);
    log(`📁 Created backups directory: ${backupsDir}`, colors.green);
  }

  // Generate filename with timestamp
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '-');
  const filename = `backup-${timestamp}.json`;
  const filepath = path.join(backupsDir, filename);

  try {
    log('📥 Fetching data from Supabase...', colors.blue);

    // Fetch all entities
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      log('⚠️  WARNING: No data found in database', colors.yellow);
      log('   Database lijkt leeg te zijn', colors.yellow);
    }

    // Group data by namespace for better overview
    const dataByNamespace: Record<string, any[]> = {};
    for (const entity of data || []) {
      const namespace = entity.namespace || 'unknown';
      if (!dataByNamespace[namespace]) {
        dataByNamespace[namespace] = [];
      }
      dataByNamespace[namespace].push(entity);
    }

    // Create backup object with metadata
    const backup = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'NAVISOL v4',
        supabaseUrl: supabaseUrl,
        totalRecords: data?.length || 0,
        namespaces: Object.keys(dataByNamespace).length,
      },
      statistics: Object.entries(dataByNamespace).map(([namespace, records]) => ({
        namespace,
        count: records.length,
      })),
      data: data || [],
      dataByNamespace,
    };

    // Write backup to file
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    // Show statistics
    log('', colors.reset);
    log('✅ BACKUP SUCCESVOL', colors.green);
    log('', colors.reset);
    log(`📄 Bestand: ${filename}`, colors.blue);
    log(`📍 Locatie: ${filepath}`, colors.blue);
    log(`📊 Records: ${backup.metadata.totalRecords}`, colors.blue);
    log(`📦 Namespaces: ${backup.metadata.namespaces}`, colors.blue);

    if (backup.statistics.length > 0) {
      log('', colors.reset);
      log('Per namespace:', colors.blue);
      backup.statistics
        .sort((a, b) => b.count - a.count)
        .forEach(stat => {
          log(`   ${stat.namespace.padEnd(35)} ${stat.count} records`, colors.blue);
        });
    }

    // Calculate file size
    const stats = fs.statSync(filepath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    log('', colors.reset);
    log(`💾 Bestandsgrootte: ${fileSizeInMB} MB`, colors.blue);

    // Show next steps
    log('', colors.reset);
    log('═══════════════════════════════════════════════════', colors.green);
    log('  VOLGENDE STAPPEN', colors.green);
    log('═══════════════════════════════════════════════════', colors.green);
    log('', colors.reset);
    log('1. Bewaar dit bestand op veilige locatie:', colors.yellow);
    log('   - Google Drive / Dropbox', colors.yellow);
    log('   - Externe harde schijf', colors.yellow);
    log('   - Encrypted cloud storage', colors.yellow);
    log('', colors.reset);
    log('2. Test of backup werkt:', colors.yellow);
    log('   bun run scripts/restore-database.ts', colors.yellow);
    log('', colors.reset);
    log('3. Maak regelmatig nieuwe backups:', colors.yellow);
    log('   - Dagelijks voor actieve development', colors.yellow);
    log('   - Wekelijks voor production', colors.yellow);
    log('', colors.reset);

  } catch (error) {
    log('', colors.reset);
    log('❌ BACKUP MISLUKT', colors.red);
    log('', colors.reset);
    if (error instanceof Error) {
      log(`Error: ${error.message}`, colors.red);
    } else {
      log(`Error: ${String(error)}`, colors.red);
    }
    process.exit(1);
  }
}

// Run backup
backupDatabase().catch(console.error);

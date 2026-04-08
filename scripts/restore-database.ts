#!/usr/bin/env bun

/**
 * Database Restore Script voor NAVISOL v4
 *
 * Dit script herstelt een database backup.
 *
 * WAARSCHUWING: Dit overschrijft de huidige database!
 * Maak eerst een nieuwe backup voordat je restore uitvoert.
 *
 * Gebruik:
 *   bun run scripts/restore-database.ts backups/backup-2026-03-10-120000.json
 *
 * Of interactief (kiest nieuwste backup):
 *   bun run scripts/restore-database.ts
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

async function restoreDatabase(backupFilePath?: string) {
  log('═══════════════════════════════════════════════════', colors.blue);
  log('  NAVISOL v4 - Database Restore', colors.blue);
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

  // Find backup file
  const backupsDir = path.join(process.cwd(), 'backups');
  let filepath: string;

  if (backupFilePath) {
    filepath = path.isAbsolute(backupFilePath)
      ? backupFilePath
      : path.join(process.cwd(), backupFilePath);
  } else {
    // Find newest backup
    if (!fs.existsSync(backupsDir)) {
      log('❌ ERROR: Geen backups directory gevonden', colors.red);
      log('   Run eerst: bun run scripts/backup-database.ts', colors.yellow);
      process.exit(1);
    }

    const backupFiles = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(backupsDir, f),
        mtime: fs.statSync(path.join(backupsDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (backupFiles.length === 0) {
      log('❌ ERROR: Geen backup bestanden gevonden', colors.red);
      log('   Run eerst: bun run scripts/backup-database.ts', colors.yellow);
      process.exit(1);
    }

    filepath = backupFiles[0].path;
    log(`📄 Nieuwste backup: ${backupFiles[0].name}`, colors.blue);
    log(`📅 Gemaakt op: ${backupFiles[0].mtime.toLocaleString('nl-NL')}`, colors.blue);
  }

  // Check if file exists
  if (!fs.existsSync(filepath)) {
    log(`❌ ERROR: Backup bestand niet gevonden: ${filepath}`, colors.red);
    process.exit(1);
  }

  // Read backup file
  log('', colors.reset);
  log('📖 Lezen backup bestand...', colors.blue);

  let backup: any;
  try {
    const fileContent = fs.readFileSync(filepath, 'utf-8');
    backup = JSON.parse(fileContent);
  } catch (error) {
    log('❌ ERROR: Kon backup bestand niet lezen', colors.red);
    if (error instanceof Error) {
      log(`   ${error.message}`, colors.red);
    }
    process.exit(1);
  }

  // Show backup info
  log('', colors.reset);
  log('📊 BACKUP INFORMATIE:', colors.blue);
  log(`   Gemaakt op: ${backup.metadata?.timestamp || 'onbekend'}`, colors.blue);
  log(`   Versie: ${backup.metadata?.version || 'onbekend'}`, colors.blue);
  log(`   Records: ${backup.metadata?.totalRecords || backup.data?.length || 0}`, colors.blue);
  log(`   Namespaces: ${backup.metadata?.namespaces || 'onbekend'}`, colors.blue);

  if (backup.statistics && backup.statistics.length > 0) {
    log('', colors.reset);
    log('   Per namespace:', colors.blue);
    backup.statistics.forEach((stat: any) => {
      log(`      ${stat.namespace.padEnd(30)} ${stat.count} records`, colors.blue);
    });
  }

  // Warning
  log('', colors.reset);
  log('⚠️  WAARSCHUWING:', colors.yellow);
  log('   Dit overschrijft de huidige database!', colors.yellow);
  log('   Alle huidige data gaat verloren.', colors.yellow);
  log('', colors.reset);
  log('   Druk op Ctrl+C om af te breken...', colors.yellow);
  log('   Of wacht 5 seconden om door te gaan...', colors.yellow);

  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    log('', colors.reset);
    log('🗑️  Verwijderen huidige data...', colors.yellow);

    // Delete all existing data
    const { error: deleteError } = await supabase
      .from('entities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      log(`   Waarschuwing: ${deleteError.message}`, colors.yellow);
    }

    log('', colors.reset);
    log('📥 Herstellen data...', colors.blue);

    const dataToRestore = backup.data || [];
    const batchSize = 100;
    let restored = 0;

    // Insert in batches
    for (let i = 0; i < dataToRestore.length; i += batchSize) {
      const batch = dataToRestore.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from('entities')
        .insert(batch);

      if (insertError) {
        log(`❌ ERROR bij batch ${Math.floor(i / batchSize) + 1}:`, colors.red);
        log(`   ${insertError.message}`, colors.red);
        throw insertError;
      }

      restored += batch.length;
      const percentage = Math.round((restored / dataToRestore.length) * 100);
      process.stdout.write(`\r   ${restored}/${dataToRestore.length} records (${percentage}%)`);
    }

    console.log(''); // New line

    log('', colors.reset);
    log('✅ RESTORE SUCCESVOL', colors.green);
    log('', colors.reset);
    log(`📊 Hersteld: ${restored} records`, colors.green);
    log('', colors.reset);
    log('═══════════════════════════════════════════════════', colors.green);
    log('  DATABASE IS HERSTELD', colors.green);
    log('═══════════════════════════════════════════════════', colors.green);
    log('', colors.reset);
    log('Volgende stappen:', colors.yellow);
    log('1. Restart de applicatie: bun run start', colors.yellow);
    log('2. Login en controleer of data klopt', colors.yellow);
    log('3. Maak direct een nieuwe backup!', colors.yellow);
    log('', colors.reset);

  } catch (error) {
    log('', colors.reset);
    log('❌ RESTORE MISLUKT', colors.red);
    log('', colors.reset);
    if (error instanceof Error) {
      log(`Error: ${error.message}`, colors.red);
    } else {
      log(`Error: ${String(error)}`, colors.red);
    }
    log('', colors.reset);
    log('Database kan in inconsistente staat zijn!', colors.red);
    log('Probeer opnieuw te restoren of contact support.', colors.red);
    process.exit(1);
  }
}

// Get backup file from command line args
const backupFile = process.argv[2];
restoreDatabase(backupFile).catch(console.error);

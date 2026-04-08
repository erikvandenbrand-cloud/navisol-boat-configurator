-- ============================================
-- NAVISOL v4 - SAFE Production Cleanup
-- Migration: 003_safe_production_cleanup.sql
-- ============================================
--
-- This migration removes ONLY demo/sample data while preserving:
-- - Real user accounts (Erik van den Brand, etc.)
-- - Library taxonomy (categories/subcategories)
-- - All library content (standards, templates, procedures, work instructions)
--
-- Run this in Supabase SQL Editor BEFORE going to production
-- ============================================

-- STEP 1: Remove Demo Users (by fixed IDs)
-- ============================================
-- Demo users created by AuthService.initializeDefaultUser()
-- These have fixed IDs and @eagleboats.nl emails

DELETE FROM entities
WHERE namespace = 'users'
AND data->>'id' IN (
  'user-admin',       -- admin@eagleboats.nl
  'user-office',      -- office@eagleboats.nl (Peter de Vries)
  'user-sales',       -- sales@eagleboats.nl (Anna Jansen)
  'user-production'   -- production@eagleboats.nl (Erik van Dam)
);

-- STEP 2: Remove Sample Library Articles
-- ============================================
-- Sample articles created by LibrarySeedService.seedSampleArticles()
-- Identified by specific article codes
-- IMPORTANT: Delete versions FIRST, then articles (dependency order)

-- First, remove article versions (depends on articles existing for subquery)
DELETE FROM entities
WHERE namespace = 'library_article_versions'
AND data->>'articleId' IN (
  SELECT data->>'id' FROM entities
  WHERE namespace = 'library_articles'
  AND data->>'code' IN (
    'PROP-MOTOR-E50',    -- Electric Motor 50kW
    'PROP-MOTOR-E30',    -- Electric Motor 30kW
    'ELEC-BAT-48V100',   -- Battery Pack 48V 100Ah
    'ELEC-CHAR-3KW',     -- Shore Charger 3kW
    'NAV-CHART-12',      -- Chartplotter 12"
    'SAFE-LIFE-4P'       -- Life Raft 4 Person
  )
);

-- Then, remove the articles themselves
DELETE FROM entities
WHERE namespace = 'library_articles'
AND data->>'code' IN (
  'PROP-MOTOR-E50',
  'PROP-MOTOR-E30',
  'ELEC-BAT-48V100',
  'ELEC-CHAR-3KW',
  'NAV-CHART-12',
  'SAFE-LIFE-4P'
);

-- STEP 3: Remove Demo Boat Models
-- ============================================
-- Demo boat models created by BoatModelService.initializeDefaults()
-- Eagle boats with specific names

DELETE FROM entities
WHERE namespace = 'library_boat_models'
AND data->>'name' IN (
  'Eagle 28',
  'Eagle 32',
  'Eagle 36 TS',
  'Eagle 40',
  'Eagle 44 GTS'
);

-- STEP 4: Remove Demo Equipment Catalog
-- ============================================
-- Demo equipment created by EquipmentCatalogService.initializeDefaults()
-- Identified by specific article numbers

DELETE FROM entities
WHERE namespace = 'library_equipment_catalog'
AND data->>'articleNumber' IN (
  -- Propulsion
  'EM-20', 'EM-40', 'BAT-40', 'BAT-80', 'CHG-11', 'CHG-22',
  -- Navigation
  'NAV-AX9', 'NAV-AX12', 'NAV-VHF', 'NAV-AIS',
  -- Safety
  'SAF-LJ4', 'SAF-LJ6', 'SAF-FE2', 'SAF-FAK', 'SAF-BLG',
  -- Comfort
  'CMF-FRG', 'CMF-BBQ', 'CMF-SND', 'CMF-SPK',
  -- Deck Equipment
  'DEC-ANC', 'DEC-BWS', 'DEC-SWM', 'DEC-SNR',
  -- Electronics
  'ELC-INV', 'ELC-BMS'
);

-- STEP 5: Remove Sample Clients & Projects (if any exist)
-- ============================================
-- These should already be disabled but clean up just in case

DELETE FROM entities
WHERE namespace = 'clients'
AND data->>'name' IN (
  'De Vries Watersport B.V.',
  'Jan Bakker',
  'Marina Rotterdam B.V.'
);

DELETE FROM entities
WHERE namespace = 'projects'
AND (
  data->>'title' LIKE '%De Vries - Eagle%'
  OR data->>'title' LIKE '%Bakker - Eagle%'
  OR data->>'title' LIKE '%Marina Rotterdam%'
);

-- STEP 6: Clear Initialization Flags
-- ============================================
-- Remove flags so they don't prevent re-initialization if needed
-- (But code changes prevent auto-recreation in production mode)

DELETE FROM entities
WHERE namespace = 'settings'
AND data->>'key' IN (
  'sampleArticles',
  'defaultBoatModels',
  'defaultCatalogs'
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these AFTER the cleanup to verify results

-- Check remaining users (should only show real accounts)
SELECT
  data->>'name' as name,
  data->>'email' as email,
  data->>'role' as role
FROM entities
WHERE namespace = 'users'
ORDER BY data->>'name';

-- Check remaining library articles (should be empty or only real articles)
SELECT
  data->>'code' as code,
  data->>'name' as name
FROM entities
WHERE namespace = 'library_articles'
ORDER BY data->>'code';

-- Check remaining boat models (should be empty or only real models)
SELECT
  data->>'name' as name,
  data->>'range' as range
FROM entities
WHERE namespace = 'library_boat_models'
ORDER BY data->>'name';

-- Check remaining equipment (should be empty or only real equipment)
SELECT
  data->>'articleNumber' as article_number,
  data->>'name' as name
FROM entities
WHERE namespace = 'library_equipment_catalog'
ORDER BY data->>'articleNumber';

-- Count by namespace (overview)
SELECT
  namespace,
  COUNT(*) as count
FROM entities
GROUP BY namespace
ORDER BY namespace;

-- ============================================
-- WHAT REMAINS (Intentionally Preserved)
-- ============================================
--
-- These are KEPT because they are generic/useful:
--
-- 1. Library Taxonomy (library_categories, library_subcategories)
--    - Generic categories: Propulsion, Electrical, Navigation, etc.
--    - Provides structure for the library system
--    - Can be customized after initialization
--
-- 2. Library Content (ALL preserved):
--    - library_standards
--    - library_templates & library_template_versions
--    - library_procedures & library_procedure_versions
--    - library_production_procedures & library_production_procedure_versions
--    - library_work_instructions (ALL work instructions kept)
--    - library_task_templates
--    - Generic workflow and process documentation
--    - Not customer-specific operational data
--    - Useful as starting templates and reference material
--
-- 3. Real User Accounts
--    - Erik van den Brand and any other real users
--    - Identified by NOT being in the demo user ID list
--
-- ============================================

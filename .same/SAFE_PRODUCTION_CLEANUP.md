# NAVISOL v4 - Safe Production Cleanup Guide

## ⚠️ CRITICAL: This Preserves Your Real Account

**Erik van den Brand** - Your account will NOT be deleted.

This guide removes ONLY demo/sample data, not real users.

---

## What Gets Removed vs What Stays

### ❌ REMOVED (Demo Data)

**Demo Users** (4 accounts with fixed IDs):
- `user-admin` → admin@eagleboats.nl
- `user-office` → office@eagleboats.nl (Peter de Vries)
- `user-sales` → sales@eagleboats.nl (Anna Jansen)
- `user-production` → production@eagleboats.nl (Erik van Dam)

**Sample Library Articles** (6 items):
- PROP-MOTOR-E50 (Electric Motor 50kW)
- PROP-MOTOR-E30 (Electric Motor 30kW)
- ELEC-BAT-48V100 (Battery Pack)
- ELEC-CHAR-3KW (Shore Charger)
- NAV-CHART-12 (Chartplotter)
- SAFE-LIFE-4P (Life Raft)

**Demo Boat Models** (5 Eagle boats):
- Eagle 28, Eagle 32, Eagle 36 TS, Eagle 40, Eagle 44 GTS

**Demo Equipment** (~20 items):
- All items with article numbers: EM-*, BAT-*, CHG-*, NAV-*, SAF-*, CMF-*, DEC-*, ELC-*

**Sample Work Instructions** (4 documents):
- Hull Preparation Checklist
- Hull Welding Procedures
- Electrical System Installation
- Final Inspection Checklist

**Sample Clients/Projects** (if any):
- De Vries Watersport B.V.
- Jan Bakker
- Marina Rotterdam B.V.

### ✅ PRESERVED (Real & Generic Data)

**Real Users**:
- Erik van den Brand (you!)
- Any other real accounts you created

**Library Taxonomy** (categories/subcategories):
- Propulsion, Electrical, Navigation, Safety, Comfort, Hull & Structural
- These are generic structure, not demo data

**Production Procedures**:
- Generic workflow templates (Standard New Build Process, etc.)
- Not customer-specific, useful as templates

---

## Step-by-Step Cleanup

### Step 1: Apply Code Changes (ALREADY DONE)

✅ 5 code files updated to disable demo data in production mode

### Step 2: Run Safe Cleanup SQL

**Go to Supabase Dashboard → SQL Editor**

**Copy and paste the migration file**:
```bash
navisol-boat-configurator/supabase/migrations/003_safe_production_cleanup.sql
```

**Or run this SQL directly**:

```sql
-- ============================================
-- STEP 1: Remove Demo Users (Fixed IDs Only)
-- ============================================
DELETE FROM entities
WHERE namespace = 'users'
AND data->>'id' IN (
  'user-admin',
  'user-office',
  'user-sales',
  'user-production'
);

-- ============================================
-- STEP 2: Remove Sample Articles & Versions
-- ============================================
DELETE FROM entities
WHERE namespace = 'library_articles'
AND data->>'code' IN (
  'PROP-MOTOR-E50', 'PROP-MOTOR-E30', 'ELEC-BAT-48V100',
  'ELEC-CHAR-3KW', 'NAV-CHART-12', 'SAFE-LIFE-4P'
);

DELETE FROM entities
WHERE namespace = 'library_article_versions'
AND data->>'articleId' IN (
  SELECT data->>'id' FROM entities
  WHERE namespace = 'library_articles'
  AND data->>'code' IN (
    'PROP-MOTOR-E50', 'PROP-MOTOR-E30', 'ELEC-BAT-48V100',
    'ELEC-CHAR-3KW', 'NAV-CHART-12', 'SAFE-LIFE-4P'
  )
);

-- ============================================
-- STEP 3: Remove Demo Boat Models
-- ============================================
DELETE FROM entities
WHERE namespace = 'library_boat_models'
AND data->>'name' IN (
  'Eagle 28', 'Eagle 32', 'Eagle 36 TS',
  'Eagle 40', 'Eagle 44 GTS'
);

-- ============================================
-- STEP 4: Remove Demo Equipment
-- ============================================
DELETE FROM entities
WHERE namespace = 'library_equipment_catalog'
AND data->>'articleNumber' IN (
  'EM-20', 'EM-40', 'BAT-40', 'BAT-80', 'CHG-11', 'CHG-22',
  'NAV-AX9', 'NAV-AX12', 'NAV-VHF', 'NAV-AIS',
  'SAF-LJ4', 'SAF-LJ6', 'SAF-FE2', 'SAF-FAK', 'SAF-BLG',
  'CMF-FRG', 'CMF-BBQ', 'CMF-SND', 'CMF-SPK',
  'DEC-ANC', 'DEC-BWS', 'DEC-SWM', 'DEC-SNR',
  'ELC-INV', 'ELC-BMS'
);

-- ============================================
-- STEP 5: Remove Sample Work Instructions
-- ============================================
DELETE FROM entities
WHERE namespace = 'library_work_instructions'
AND data->>'title' IN (
  'Hull Preparation Checklist',
  'Hull Welding Procedures',
  'Electrical System Installation',
  'Final Inspection Checklist'
);

-- ============================================
-- STEP 6: Remove Sample Clients/Projects
-- ============================================
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

-- ============================================
-- STEP 7: Clear Initialization Flags
-- ============================================
DELETE FROM entities
WHERE namespace = 'settings'
AND data->>'key' IN (
  'sampleArticles',
  'defaultBoatModels',
  'defaultCatalogs',
  'sampleWorkInstructions'
);
```

### Step 3: Remove Dev Security Policy

**Run this SQL** (same SQL Editor):

```sql
-- Remove development-only anonymous write access
DROP POLICY IF EXISTS "Allow all for anon (dev only)" ON entities;
```

### Step 4: Clear Browser Storage

**Open browser console (F12)** and run:

```javascript
localStorage.clear();
sessionStorage.clear();
console.log('Browser storage cleared');
```

---

## Verification

### After Running Cleanup

**Run these queries in Supabase SQL Editor**:

#### 1. Check Your Account Still Exists

```sql
-- Should show Erik van den Brand and other real users
-- Should NOT show admin@eagleboats.nl, sales@, office@, production@
SELECT
  data->>'name' as name,
  data->>'email' as email,
  data->>'role' as role,
  data->>'id' as id
FROM entities
WHERE namespace = 'users'
ORDER BY data->>'name';
```

**Expected**: Your real account appears, demo accounts gone

#### 2. Check Demo Data Removed

```sql
-- Should be EMPTY or only show real articles you added
SELECT
  data->>'code' as code,
  data->>'name' as name
FROM entities
WHERE namespace = 'library_articles'
ORDER BY data->>'code';
```

**Expected**: No PROP-MOTOR-E50, ELEC-BAT-48V100, etc.

#### 3. Overview by Namespace

```sql
-- Shows count of records per namespace
SELECT
  namespace,
  COUNT(*) as count
FROM entities
GROUP BY namespace
ORDER BY namespace;
```

**Expected counts**:
- `users`: 1+ (your real account(s))
- `library_categories`: ~6 (preserved - generic)
- `library_subcategories`: ~30 (preserved - generic)
- `library_articles`: 0 (demo removed)
- `library_boat_models`: 0 (demo removed)
- `library_equipment_catalog`: 0 (demo removed)
- `library_work_instructions`: 0 (demo removed)
- `projects`: 0 (demo removed)
- `clients`: 0 (demo removed)

### Login Test

1. **Set production mode**: `NODE_ENV=production` in `.env.local`
2. **Restart dev server**: Stop and start the app
3. **Login with your real account**: Should work
4. **Check UI**:
   - ✅ No demo accounts card on login screen
   - ✅ Your real user in Settings → Users
   - ✅ Library shows categories but no articles
   - ✅ No demo boat models
   - ✅ Console: "Production mode: Demo users disabled"

---

## Rollback (If Needed)

If something goes wrong and you need demo data back:

1. **Set dev mode**: `NODE_ENV=development`
2. **Clear browser**: `localStorage.clear()`
3. **Restart app**: Demo data recreates automatically

Your real account is preserved in Supabase regardless.

---

## Safety Checks

**Before running cleanup**:

```sql
-- Preview what will be deleted (users)
SELECT data->>'email' FROM entities
WHERE namespace = 'users'
AND data->>'id' IN ('user-admin', 'user-office', 'user-sales', 'user-production');

-- Should show: admin@, office@, sales@, production@ (all @eagleboats.nl)
```

**If you see your real email in the above query → STOP**
- This means your account has a demo ID somehow
- Contact support before proceeding

---

## Summary

✅ **Safe Approach**: Targeted deletion by specific IDs/codes/names
❌ **Avoided**: Broad `DELETE FROM entities` (would delete everything)
✅ **Verified**: Real accounts preserved by excluding demo IDs
✅ **Reversible**: Can restore demo data by switching to dev mode

**Your real account (Erik van den Brand) is safe.**

---

*Last Updated: March 10, 2026*
*Safe Production Cleanup - Preserves Real Accounts*

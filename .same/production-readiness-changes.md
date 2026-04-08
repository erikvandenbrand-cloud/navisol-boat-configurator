# NAVISOL v4 - Production Readiness Implementation Guide

## Overview

This document provides the exact code changes needed to disable demo/sample data initialization for production use while keeping the development/test environment functional.

---

## Implementation Strategy

Use environment variable `NODE_ENV` to conditionally disable demo data:
- `development` → Demo data enabled (for testing)
- `production` → Demo data disabled (real use)
- Tests continue to work with mock data

---

## Code Changes

### Change 1: Disable Demo User Creation (Conditional)

**File**: `src/domain/services/AuthService.ts`

**Location**: Line 526, method `initializeDefaultUser()`

**Current Code**:
```typescript
async initializeDefaultUser(): Promise<void> {
  // Skip if not on client
  if (!isClient()) return;

  // Check initialization flag first
  if (isInitialized()) {
    return;
  }

  // Double-check by looking at actual users
  const users = await UserRepository.getAll();
  if (users.length > 0) {
    // Users exist, set flag and return
    setInitialized();
    return;
  }

  // Create default admin user with fixed ID
  const adminUser: User = {
    id: 'user-admin',
    email: 'admin@eagleboats.nl',
    // ... rest of demo user creation
  };
```

**New Code**:
```typescript
async initializeDefaultUser(): Promise<void> {
  // Skip if not on client
  if (!isClient()) return;

  // PRODUCTION MODE: Do not create demo users
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode: Demo user creation disabled. Create your first admin user via Supabase.');
    return;
  }

  // Check initialization flag first
  if (isInitialized()) {
    return;
  }

  // Double-check by looking at actual users
  const users = await UserRepository.getAll();
  if (users.length > 0) {
    // Users exist, set flag and return
    setInitialized();
    return;
  }

  console.log('Development mode: Creating demo users...');

  // Create default admin user with fixed ID
  const adminUser: User = {
    id: 'user-admin',
    email: 'admin@eagleboats.nl',
    // ... rest of demo user creation
  };
```

**Impact**: Demo users only created in development mode

---

### Change 2: Disable Sample Articles

**File**: `src/v4/data/sampleData.ts`

**Location**: Lines 14-18

**Current Code**:
```typescript
export async function initializeSampleData() {
  const context = getAuditContext();

  // Initialize library taxonomy (idempotent)
  await LibrarySeedService.initializeTaxonomy(context);
  await LibrarySeedService.seedSampleArticles(context);

  // Initialize sample work instructions (idempotent)
  await WorkInstructionService.initializeSamples(context);

  // DISABLED: Sample client/project creation
  // ...
```

**New Code**:
```typescript
export async function initializeSampleData() {
  const context = getAuditContext();

  // Initialize library taxonomy (idempotent - reasonable for production)
  await LibrarySeedService.initializeTaxonomy(context);

  // PRODUCTION MODE: Skip demo data
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode: Sample data initialization disabled.');
    return;
  }

  console.log('Development mode: Initializing sample data...');

  // Initialize sample articles (dev/test only)
  await LibrarySeedService.seedSampleArticles(context);

  // Initialize sample work instructions (dev/test only)
  await WorkInstructionService.initializeSamples(context);

  // DISABLED: Sample client/project creation
  // ...
```

**Impact**: Sample articles and work instructions only created in development

---

### Change 3: Disable Boat Model Defaults

**File**: `src/v4/screens/LibraryScreen.tsx`

**Location**: Line 329-341 (loadBoatModels function)

**Current Code**:
```typescript
async function loadBoatModels() {
  setIsLoadingModels(true);
  try {
    const context = getDefaultAuditContext();
    await BoatModelService.initializeDefaults(context);

    const models = await BoatModelService.getAll();
    setBoatModels(models);
  } catch (error) {
    console.error('Failed to load boat models:', error);
  } finally {
    setIsLoadingModels(false);
  }
}
```

**New Code**:
```typescript
async function loadBoatModels() {
  setIsLoadingModels(true);
  try {
    const context = getDefaultAuditContext();

    // PRODUCTION MODE: Skip demo boat model initialization
    if (process.env.NODE_ENV !== 'production') {
      await BoatModelService.initializeDefaults(context);
    }

    const models = await BoatModelService.getAll();
    setBoatModels(models);
  } catch (error) {
    console.error('Failed to load boat models:', error);
  } finally {
    setIsLoadingModels(false);
  }
}
```

**Impact**: Demo boat models only created in development

---

### Change 4: Disable Equipment Catalog Defaults

**File**: `src/v4/screens/LibraryScreen.tsx`

**Location**: Line 391-403 (loadEquipment function)

**Current Code**:
```typescript
async function loadEquipment() {
  setIsLoadingEquipment(true);
  try {
    const context = getDefaultAuditContext();
    await EquipmentCatalogService.initializeDefaults(context);

    const items = await EquipmentCatalogService.getAll();
    setEquipmentItems(items);
  } catch (error) {
    console.error('Failed to load equipment:', error);
  } finally {
    setIsLoadingEquipment(false);
  }
}
```

**New Code**:
```typescript
async function loadEquipment() {
  setIsLoadingEquipment(true);
  try {
    const context = getDefaultAuditContext();

    // PRODUCTION MODE: Skip demo equipment initialization
    if (process.env.NODE_ENV !== 'production') {
      await EquipmentCatalogService.initializeDefaults(context);
    }

    const items = await EquipmentCatalogService.getAll();
    setEquipmentItems(items);
  } catch (error) {
    console.error('Failed to load equipment:', error);
  } finally {
    setIsLoadingEquipment(false);
  }
}
```

**Impact**: Demo equipment only created in development

---

### Change 5: Hide Demo Accounts Card on Login Screen

**File**: `src/v4/screens/LoginScreen.tsx`

**Location**: Lines 128-189 (Demo Accounts card)

**Current Code**:
```tsx
{/* Demo Credentials - Roles: ADMIN, OFFICE, SALES, PRODUCTION (v320) */}
<Card className="mt-4 border-dashed">
  <CardContent className="pt-4">
    <p className="text-xs font-medium text-slate-500 mb-3 text-center">Demo Accounts</p>
    <div className="space-y-2 text-xs">
      {/* ... demo accounts ... */}
    </div>
  </CardContent>
</Card>
```

**New Code**:
```tsx
{/* Demo Credentials - Development Only */}
{process.env.NODE_ENV !== 'production' && (
  <Card className="mt-4 border-dashed">
    <CardContent className="pt-4">
      <p className="text-xs font-medium text-slate-500 mb-3 text-center">Demo Accounts (Dev Only)</p>
      <div className="space-y-2 text-xs">
        {/* ... existing demo accounts content ... */}
      </div>
    </CardContent>
  </Card>
)}
```

**Impact**: Demo accounts card hidden in production builds

---

### Change 6: Production Procedures Initialization (Keep)

**File**: `src/v4/components/ProductionProceduresTab.tsx`

**Location**: Line 142

**Current Code**:
```typescript
await ProductionProcedureService.initializeDefaults(context);
```

**Action**: **KEEP AS IS**

**Rationale**: Production procedures are generic workflow templates, not customer-specific demo data. They serve as useful starting points for real production processes.

---

### Change 7: Library Taxonomy Initialization (Keep)

**File**: `src/v4/data/sampleData.ts`

**Location**: Line 14

**Current Code**:
```typescript
await LibrarySeedService.initializeTaxonomy(context);
```

**Action**: **KEEP AS IS**

**Rationale**: Library taxonomy provides the category structure for articles. It's generic (Propulsion, Electrical, Navigation, etc.) and necessary for the library to function.

---

## Database Changes

### Remove Anonymous Access Policy (CRITICAL)

**File**: `supabase/migrations/001_initial_schema.sql`

**Location**: Lines 92-98

**Current SQL**:
```sql
-- Policy: Allow all for anon (for development - REMOVE IN PRODUCTION!)
-- This allows unauthenticated access for easier development
CREATE POLICY "Allow all for anon (dev only)" ON entities
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);
```

**Action**: Create new migration file

**File**: `supabase/migrations/002_remove_anon_policy.sql`

**Content**:
```sql
-- ============================================
-- Remove Anonymous Access (Production Security)
-- ============================================

-- Drop the development-only anonymous access policy
DROP POLICY IF EXISTS "Allow all for anon (dev only)" ON entities;

-- Note: Authenticated users and read-only anon access remain
-- Only the full write access for anon is removed
```

**How to Apply**:
1. Go to Supabase Dashboard → SQL Editor
2. Create and execute this migration
3. Verify policy is removed: Check Database → Policies

---

## Environment Configuration

### .env.local (Development)

```bash
# Development mode - keeps demo data
NODE_ENV=development

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://pgtnfysvfgdidqqkmmla.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### .env.production.local (Production)

```bash
# Production mode - disables demo data
NODE_ENV=production

# Supabase (same as development for now)
NEXT_PUBLIC_SUPABASE_URL=https://pgtnfysvfgdidqqkmmla.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Database Reset Procedure

### Before First Production Use

**Execute in Supabase SQL Editor**:

```sql
-- ============================================
-- NAVISOL v4 - Production Database Reset
-- ============================================

-- WARNING: This will DELETE ALL DATA
-- Only run this before going into production with real data

BEGIN;

-- Clear all entities (projects, clients, library, etc.)
DELETE FROM entities;

-- Optional: Reset auto-increment sequences if any
-- (Not needed for UUID-based IDs)

COMMIT;

-- Verify empty database
SELECT namespace, COUNT(*) as count FROM entities GROUP BY namespace;
-- Should return 0 rows
```

**Clear Browser State**:
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
console.log('Browser storage cleared');
```

---

## Testing the Changes

### Test in Development Mode

1. Set `NODE_ENV=development`
2. Clear database and localStorage
3. Start app
4. Verify demo users are created
5. Verify sample data appears
6. Verify login screen shows demo accounts

### Test in Production Mode

1. Set `NODE_ENV=production`
2. Clear database and localStorage
3. Start app
4. Verify NO demo users are created
5. Verify NO sample data appears
6. Verify login screen does NOT show demo accounts
7. Create first admin user manually via Supabase

---

## Manual Admin User Creation (Production)

Since demo users are disabled in production, create the first admin manually:

### Via Supabase SQL Editor

```sql
-- Create first admin user manually
-- Replace values with your actual admin details

INSERT INTO entities (id, namespace, data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'users',
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'email', 'your-admin@yourcompany.com',
    'name', 'Your Name',
    'role', 'ADMIN',
    'passwordHash', 'hash_12345678',  -- Replace with actual hash
    'isActive', true,
    'aiEnabled', false,
    'createdAt', NOW()::text,
    'updatedAt', NOW()::text,
    'version', 0
  ),
  NOW(),
  NOW()
);

-- Note: Password hashing should be done via the app's hashPassword function
-- Alternatively, use the app's user creation dialog as the first admin
```

**Better Approach**: Temporarily enable demo users, create first admin, then disable.

---

## Summary of Changes

| File | Lines | Change Type | Impact |
|------|-------|-------------|---------|
| `AuthService.ts` | 526 | Add `NODE_ENV` check | Demo users only in dev |
| `sampleData.ts` | 14-18 | Add `NODE_ENV` check | Sample data only in dev |
| `LibraryScreen.tsx` | 333 | Add `NODE_ENV` check | Boat models only in dev |
| `LibraryScreen.tsx` | 395 | Add `NODE_ENV` check | Equipment only in dev |
| `LoginScreen.tsx` | 128-189 | Conditional render | Demo card only in dev |
| `001_initial_schema.sql` | 92-98 | New migration | Remove anon access |

---

## Rollout Plan

### Phase 1: Code Changes (Safe, Reversible)
1. Apply all code changes above
2. Test in development mode
3. Test in production mode
4. Commit changes to version control

### Phase 2: Database Preparation (Destructive)
1. Create database backup
2. Run reset SQL script
3. Apply security migration (remove anon policy)
4. Verify empty database

### Phase 3: First Production Use
1. Set `NODE_ENV=production`
2. Build and deploy app
3. Create first admin user manually
4. Begin real data entry
5. Verify no demo data appears

---

## Verification Checklist

Before going live with production:

- [ ] All code changes applied
- [ ] `NODE_ENV=production` set in environment
- [ ] Database cleared (`DELETE FROM entities`)
- [ ] Anonymous access policy removed
- [ ] Browser localStorage cleared
- [ ] App starts without creating demo data
- [ ] Login screen does not show demo accounts
- [ ] First admin user created manually
- [ ] First real client created successfully
- [ ] First real project created successfully
- [ ] No sample articles in library
- [ ] No demo boat models
- [ ] No demo equipment items

---

*Implementation Guide - March 10, 2026*
*NAVISOL v4 - Production Readiness*

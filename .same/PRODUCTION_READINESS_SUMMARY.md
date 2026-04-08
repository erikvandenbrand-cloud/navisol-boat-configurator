# NAVISOL v4 - Production Readiness Summary

## Quick Answer

### Is Supabase Active?
✅ **YES** - Supabase is configured and active as the persistence adapter.

### What Demo Data Will Be Created?
❌ The following demo/sample data will be auto-created on first load:
- 4 demo user accounts (admin, office, sales, production @eagleboats.nl)
- 6 sample library articles (motors, batteries, etc.)
- 5 demo boat models (Eagle 28, 32, 36, 40, 44)
- ~20 demo equipment items
- 3-4 sample work instructions

### What Should NOT Be Created?
✅ The following are reasonable and can stay:
- Library taxonomy (generic category structure)
- Production procedure templates (generic workflows)

## Files That Create Demo Data

1. **src/domain/services/AuthService.ts:526** - Creates demo users
2. **src/v4/data/sampleData.ts:14-18** - Calls sample data initialization
3. **src/v4/screens/LibraryScreen.tsx:333** - Initializes boat models
4. **src/v4/screens/LibraryScreen.tsx:395** - Initializes equipment catalog
5. **src/v4/screens/LoginScreen.tsx:128** - Shows demo account credentials

## Minimal Required Changes

### 5 Code Files to Edit

```
1. src/domain/services/AuthService.ts (line 526)
   Add: if (process.env.NODE_ENV === 'production') return;

2. src/v4/data/sampleData.ts (line 14)
   Add: if (process.env.NODE_ENV === 'production') return;

3. src/v4/screens/LibraryScreen.tsx (line 333)
   Add: if (process.env.NODE_ENV !== 'production')

4. src/v4/screens/LibraryScreen.tsx (line 395)
   Add: if (process.env.NODE_ENV !== 'production')

5. src/v4/screens/LoginScreen.tsx (line 128)
   Wrap in: {process.env.NODE_ENV !== 'production' && ...}
```

### 1 Database Migration

```sql
-- supabase/migrations/002_remove_anon_policy.sql
DROP POLICY IF EXISTS "Allow all for anon (dev only)" ON entities;
```

## Database Reset (REQUIRED Before Real Use)

```sql
-- Clear all demo data
DELETE FROM entities;
```

```javascript
// Clear browser cache
localStorage.clear();
```

## What Stays vs What Goes

| Component | Keep/Remove | Reason |
|-----------|-------------|--------|
| Library Taxonomy | ✅ Keep | Generic structure, customizable |
| Production Procedures | ✅ Keep | Generic templates, useful |
| Demo Users | ❌ Remove | Not for production |
| Sample Articles | ❌ Remove | Fake data, confusing |
| Boat Models | ❌ Remove | Demo models with demo prices |
| Equipment Catalog | ❌ Remove | Demo equipment, fake prices |
| Work Instructions | ❌ Remove | Demo content |
| Login Demo Card | ❌ Remove | Reveals credentials |

## Test Support

✅ **Tests Will Continue Working**
- All tests use mock localStorage
- Demo data initialization is idempotent
- No test changes required

## Deployment Checklist

- [ ] Edit 5 code files (add `NODE_ENV` checks)
- [ ] Create database migration (remove anon policy)
- [ ] Set `NODE_ENV=production` in environment
- [ ] Clear Supabase database: `DELETE FROM entities`
- [ ] Clear browser localStorage
- [ ] Remove anonymous access policy
- [ ] Create first admin user manually
- [ ] Test: No demo data appears
- [ ] Ready for real data entry

## Next Step

**Choose One**:
1. **Review Reports**: Read detailed analysis in `.same/production-readiness-report.md`
2. **Apply Changes**: Follow step-by-step guide in `.same/production-readiness-changes.md`
3. **Go Live Now**: Apply the 5 code changes + 1 migration + database reset

---

**Status**: Ready to implement changes
**Risk Level**: Low (all changes are reversible and guarded by environment check)
**Estimated Time**: 30 minutes to implement + test

*Quick Reference - March 10, 2026*

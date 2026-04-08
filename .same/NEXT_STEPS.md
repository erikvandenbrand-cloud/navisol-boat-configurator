# NAVISOL v4 - Production Setup Checklist

## ⚠️ IMPORTANT: How to Run in Production Mode

**DO NOT** use `bun run dev` - that is ALWAYS development mode.

**Production requires**:
1. `bun run build` (build optimized bundle)
2. `bun run start` (start production server)

See `.same/PRODUCTION_MODE_GUIDE.md` for full details.

---

## ✅ Done

1. **Code Changes Applied** - Demo data disabled in production mode
2. **Database Cleanup SQL** - Ready to run (`003_safe_production_cleanup.sql`)

---

## 📋 Next Steps (In Order)

### Step 1: Run Database Cleanup SQL

**Go to**: Supabase Dashboard → SQL Editor

**Execute**: Copy/paste contents of `supabase/migrations/003_safe_production_cleanup.sql`

This will remove:
- ❌ 4 demo users (admin@, office@, sales@, production@eagleboats.nl)
- ❌ 6 sample articles
- ❌ 5 demo boat models
- ❌ ~20 demo equipment items
- ❌ 4 sample work instructions
- ❌ 3 sample clients/projects

This will preserve:
- ✅ **Your account (Erik van den Brand)**
- ✅ Library categories/subcategories
- ✅ Production procedure templates

**After running**, verify in same SQL Editor:

```sql
-- Should show ONLY your real account
SELECT data->>'name', data->>'email', data->>'role'
FROM entities
WHERE namespace = 'users'
ORDER BY data->>'name';
```

**Expected**: Erik van den Brand (your account)
**NOT expected**: admin@eagleboats.nl, sales@, etc.

---

### Step 2: Remove Development Security Policy

**In same SQL Editor**, run:

```sql
DROP POLICY IF EXISTS "Allow all for anon (dev only)" ON entities;
```

**Verify**:

```sql
SELECT policyname FROM pg_policies WHERE tablename = 'entities';
```

**Expected**: Should NOT show "Allow all for anon (dev only)"

---

### Step 3: Clear Browser Storage

**Open browser console** (F12), run:

```javascript
localStorage.clear();
sessionStorage.clear();
console.log('Browser storage cleared');
```

---

### Step 4: Build for Production

**Build** the optimized production bundle:

```bash
cd navisol-boat-configurator
bun run build
```

**Wait for build to complete** (may take 1-2 minutes)

---

### Step 5: Start Production Server

**Start** production server:

```bash
bun run start
```

**NOTE**: This runs on port 3000 by default. Open http://localhost:3000

---

### Step 6: Verify Production Mode

**Watch console on startup** - should see:

```
Production mode: Demo users disabled. Create users via Settings > Users.
📦 Using Supabase for data persistence
```

**Should NOT see**:

```
Development mode: Creating demo users...
```

---

### Step 7: Test Login

1. **Open app** in browser
2. **Check login screen** - should NOT show demo accounts card
3. **Login** with your real account (Erik van den Brand)
4. **Verify**:
   - ✅ Settings → Users shows only your account
   - ✅ Library shows categories but NO articles
   - ✅ No demo boat models
   - ✅ No demo equipment
   - ✅ Projects and Clients are empty

---

### Step 8: Start Using Production

**You're ready!** Start adding real data:

1. **Settings → Users** - Add your 6 team members
2. **Library** - Add real articles, boat models, equipment
3. **Clients** - Create real clients
4. **Projects** - Create real projects

---

## 🔍 Troubleshooting

### "I still see demo data"

**Answer**: You're probably running `bun run dev` which is ALWAYS development mode.

**Solution**:
1. Stop the dev server (Ctrl+C)
2. Build: `bun run build`
3. Start production: `bun run start`

See `.same/PRODUCTION_MODE_GUIDE.md` for full explanation.

### "Database cleanup didn't work"

- Make sure you ran the FULL migration (all steps)
- Check for SQL errors in Supabase SQL Editor
- Verify with verification queries in migration file

### "I can't login"

- Your account (Erik van den Brand) should still exist
- Run verification query from Step 1 to confirm
- If missing somehow, create new admin via SQL or use dev mode temporarily

---

## 🎯 Summary

Current status:
- ✅ Code: Production checks implemented correctly
- ⏳ Database: Waiting for cleanup SQL (Step 1)
- ⏳ Browser: Waiting for cache clear (Step 3)
- ⏳ Build: Waiting for production build (Step 4)
- ⏳ Server: Waiting for production start (Step 5)

**CRITICAL**: You MUST use `bun run build` + `bun run start` for production mode.
Running `bun run dev` will ALWAYS show demo data (development mode).

After completing steps 1-8:
- ✅ Ready for production use
- ✅ No demo data
- ✅ Your real account preserved
- ✅ Clean slate for real data

**Commands**:
```bash
bun run build    # Build production bundle
bun run start    # Start production server
```

---

*Production Setup Guide - March 10, 2026*

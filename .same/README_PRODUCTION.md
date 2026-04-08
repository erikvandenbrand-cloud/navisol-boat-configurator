# NAVISOL v4 - Production Mode Setup

## CRITICAL INFORMATION

**The app shows demo data because you're running in development mode.**

To disable demo data, you MUST use production commands.

---

## Quick Start

### Run in Production Mode

```bash
cd navisol-boat-configurator

# 1. Build optimized bundle
bun run build

# 2. Start production server
bun run start

# 3. Open browser
# http://localhost:3000
```

**Expected Result**:
- NO demo accounts card on login screen
- Console: "Production mode: Demo users disabled"
- Only real users can login

---

## Why .env.local Didn't Work

Setting `NODE_ENV=production` in `.env.local` **does nothing** in Next.js.

**Next.js determines the mode from the command you run**:

| Command | Mode | Demo Data |
|---------|------|-----------|
| `bun run dev` | Development | Enabled |
| `bun run start` | Production | Disabled |

---

## Detailed Documentation

**Full guides available in .same/ folder**:

1. **PRODUCTION_MODE_GUIDE.md** - Complete explanation of Next.js modes
2. **PRODUCTION_QUICK_START.md** - Simple step-by-step commands
3. **DEMO_INITIALIZATION_FILES.md** - Code reference
4. **INVESTIGATION_RESULTS.md** - Full investigation report

---

## Database Cleanup

Before running in production, clean up demo data:

### 1. Run SQL Migration

**Supabase Dashboard → SQL Editor**

Paste and run: `supabase/migrations/003_safe_production_cleanup.sql`

### 2. Remove Dev Policy

```sql
DROP POLICY IF EXISTS "Allow all for anon (dev only)" ON entities;
```

### 3. Clear Browser

```javascript
localStorage.clear();
sessionStorage.clear();
```

---

## Verification

After starting production server (`bun run start`):

**Check console output**:
```
Production mode: Demo users disabled. Create users via Settings > Users.
Using Supabase for data persistence
```

**Check login screen**:
- No "Demo Accounts (Dev Only)" card visible
- Only email/password fields

**Check database** (Supabase SQL Editor):
```sql
SELECT data->>'name', data->>'email' FROM entities WHERE namespace = 'users';
```
- Should show only real users (Erik van den Brand)
- Should NOT show admin@eagleboats.nl, sales@, etc.

---

## Troubleshooting

### "I still see demo data"

**Answer**: You're running `bun run dev` (development mode)

**Solution**:
1. Stop server (Ctrl+C)
2. `bun run build`
3. `bun run start`

### "Build failed"

**Common causes**:
- TypeScript errors
- Missing dependencies

**Solution**:
```bash
bun install
bun run build
```

---

## Summary

- Code is correct - All production checks work properly
- Demo initialization logic works - Checks NODE_ENV correctly
- Wrong command used - `bun run dev` is always development mode

**Solution**: Use `bun run build` + `bun run start` for production

---

*Last Updated: March 10, 2026*
*Production Mode Setup Guide*

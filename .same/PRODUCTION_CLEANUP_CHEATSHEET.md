# Safe Production Cleanup - Quick Reference

## ✅ Your Account is Safe

**Erik van den Brand** - Will NOT be deleted (not a demo user)

---

## 3-Step Cleanup

### 1. Run Cleanup SQL

**Supabase Dashboard → SQL Editor**

Copy/paste: `supabase/migrations/003_safe_production_cleanup.sql`

**What it removes**:
- 4 demo users (admin@, office@, sales@, production@eagleboats.nl)
- 6 sample articles (PROP-MOTOR-E50, ELEC-BAT-48V100, etc.)
- 5 demo boats (Eagle 28, 32, 36, 40, 44)
- ~20 demo equipment items (EM-20, BAT-40, NAV-AX9, etc.)
- 4 sample work instructions
- 3 sample clients/projects

**What it keeps**:
- Your real account (Erik van den Brand)
- Library categories (Propulsion, Electrical, etc.)
- Production procedure templates

---

### 2. Remove Dev Policy

**Same SQL Editor**:

```sql
DROP POLICY IF EXISTS "Allow all for anon (dev only)" ON entities;
```

---

### 3. Clear Browser

**Browser console (F12)**:

```javascript
localStorage.clear();
sessionStorage.clear();
```

---

## Verify

**Check your account exists**:

```sql
SELECT data->>'name', data->>'email'
FROM entities
WHERE namespace = 'users';
```

**Should show**: Erik van den Brand (you!)
**Should NOT show**: admin@eagleboats.nl, sales@, etc.

---

## Then

1. Set `NODE_ENV=production` in `.env.local`
2. Restart dev server
3. Login with your real account
4. Start adding real data

---

**Details**: See `.same/SAFE_PRODUCTION_CLEANUP.md`

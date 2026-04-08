# NAVISOL v4 - Quick Production Setup

## What I Changed (5 files)

✅ **Code changes applied** - Demo/sample data disabled in production mode.

1. `src/domain/services/AuthService.ts` - Skip demo users in production
2. `src/v4/data/sampleData.ts` - Skip sample articles in production
3. `src/v4/screens/LibraryScreen.tsx` - Skip demo boats (line 333)
4. `src/v4/screens/LibraryScreen.tsx` - Skip demo equipment (line 395)
5. `src/v4/screens/LoginScreen.tsx` - Hide demo login card

---

## What You Need to Do (3 steps)

### 1. Set Production Mode

Edit `.env.local`:
```bash
NODE_ENV=production
```

### 2. Clear Database

Supabase Dashboard → SQL Editor:
```sql
DELETE FROM entities;
DROP POLICY IF EXISTS "Allow all for anon (dev only)" ON entities;
```

### 3. Clear Browser

Browser console (F12):
```javascript
localStorage.clear();
```

---

## Create First Admin

**Easy way**: Use dev mode once

1. Keep `NODE_ENV=development` temporarily
2. Start app → creates admin@eagleboats.nl / admin123
3. Login → Settings → Users → Create your real admin
4. Switch to `NODE_ENV=production`
5. Clear database + localStorage
6. Login with real account

**Manual way**: SQL in Supabase
```sql
INSERT INTO entities (namespace, data, created_at, updated_at)
VALUES (
  'users',
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'email', 'you@yourcompany.com',
    'name', 'Your Name',
    'role', 'ADMIN',
    'passwordHash', 'hash_c20ad4d76fe97759aa27a0c99bff6710',
    'isActive', true,
    'aiEnabled', false,
    'createdAt', NOW()::text,
    'updatedAt', NOW()::text,
    'version', 0
  ),
  NOW(),
  NOW()
);
```
Password: "admin123" (change after first login)

---

## Verify It Worked

Production mode should show:
- ✅ Clean login screen (no demo accounts card)
- ✅ Empty library (categories exist, no articles)
- ✅ No demo users in Settings → Users
- ✅ Console: "Production mode: Demo users disabled"

---

## What Stays

These are generic and useful:
- Library categories (Propulsion, Electrical, Navigation, Safety, Comfort, Hull)
- Production procedure templates

Everything else (users, articles, boats, equipment) starts empty.

---

## Details

See `.same/PRODUCTION_GO_LIVE.md` for complete guide.

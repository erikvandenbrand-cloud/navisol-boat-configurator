# Production Mode Setup - Complete Guide

## ⚠️ CRITICAL: Understanding Next.js Development vs Production Mode

### The Problem

You set `NODE_ENV=production` in `.env.local` but the app still shows demo users and "Development mode" messages.

**Why?** Because Next.js **ignores** NODE_ENV in `.env.local` when running `bun run dev`.

---

## How Next.js Modes Work

### Development Mode (`bun run dev`)

- **Command**: `bun run dev` or `next dev`
- **NODE_ENV**: ALWAYS `development` (cannot be overridden)
- **Behavior**:
  - Hot reload enabled
  - Detailed error messages
  - Source maps enabled
  - NOT optimized for production
  - **Demo data initialization ENABLED**

### Production Mode (`bun run build` + `bun run start`)

- **Command**: `bun run build` followed by `bun run start`
- **NODE_ENV**: ALWAYS `production`
- **Behavior**:
  - Optimized build
  - Minified code
  - No hot reload
  - **Demo data initialization DISABLED**

---

## ✅ Files Controlling Demo/Production Behavior

### 1. AuthService.ts (Lines 526-623)

```typescript
async initializeDefaultUser(): Promise<void> {
  if (!isClient()) return;

  // PRODUCTION MODE: Do not auto-create demo users
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode: Demo users disabled. Create users via Settings > Users.');
    return;
  }

  // DEVELOPMENT MODE: Create demo users
  console.log('Development mode: Creating demo users...');
  // ... creates admin@, office@, sales@, production@ accounts
}
```

**Called from**: `src/v4/state/useAuth.tsx` (Line 68)

### 2. LoginScreen.tsx (Lines 128-191)

```typescript
{/* Demo Credentials - Development Only */}
{process.env.NODE_ENV !== 'production' && (
  <Card className="mt-4 border-dashed">
    <CardContent className="pt-4">
      <p className="text-xs font-medium text-slate-500 mb-3 text-center">
        Demo Accounts (Dev Only)
      </p>
      {/* Shows admin@, sales@, production@ login shortcuts */}
    </CardContent>
  </Card>
)}
```

**Result**: Demo login card is HIDDEN in production mode.

---

## 🎯 How to Run in TRUE Production Mode

### Step 1: Build the Application

```bash
cd navisol-boat-configurator
bun run build
```

**What this does**:
- Creates optimized production build in `.next` folder
- Sets NODE_ENV to `production` automatically
- Minifies all code
- Removes debug tooling

**Expected output**:
```
Route (app)                                Size     First Load JS
┌ ○ /                                     X kB          XXX kB
└ ○ /v4                                   X kB          XXX kB

○  (Static)  prerendered as static content
```

### Step 2: Start Production Server

```bash
bun run start
```

**What this does**:
- Starts Next.js in production mode
- Serves the optimized build from `.next`
- NODE_ENV is `production`
- Demo initialization is DISABLED

**Expected console output**:
```
Production mode: Demo users disabled. Create users via Settings > Users.
📦 Using Supabase for data persistence
```

**Should NOT see**:
```
Development mode: Creating demo users...
```

### Step 3: Verify Production Mode

**Open browser console and check**:
1. ✅ No demo accounts card on login screen
2. ✅ Console shows "Production mode: Demo users disabled"
3. ✅ Only your real user (Erik van den Brand) exists

---

## 📋 Production Checklist

### Before Going Live

- [ ] Database cleanup completed (ran `003_safe_production_cleanup.sql`)
- [ ] Removed dev security policy (ran `002_remove_dev_policy.sql`)
- [ ] Browser storage cleared (`localStorage.clear()`)
- [ ] Built the app (`bun run build`)
- [ ] Started production server (`bun run start`)
- [ ] Verified no demo users appear
- [ ] Verified login screen has NO demo card
- [ ] Tested login with real account (Erik van den Brand)

### After Starting Production Server

**Check the following**:

```bash
# Console should show:
Production mode: Demo users disabled. Create users via Settings > Users.
📦 Using Supabase for data persistence

# Login screen should:
- NOT show "Demo Accounts (Dev Only)" card
- Show only email/password fields

# Database should contain:
- Your real user account (Erik van den Brand)
- Library categories/subcategories (preserved)
- Library content: templates, procedures, work instructions (preserved)
- NO demo users (admin@, sales@, production@eagleboats.nl)
- NO sample articles (PROP-MOTOR-E50, etc.)
- NO demo boats (Eagle 28, 32, etc.)
```

---

## 🔄 Switching Between Modes

### Back to Development (for testing)

```bash
# Stop production server (Ctrl+C)
bun run dev
```

**Result**:
- NODE_ENV becomes `development` automatically
- Demo users will be recreated (if database is empty)
- Demo login card appears
- Hot reload enabled

### Return to Production

```bash
# Stop dev server (Ctrl+C)
bun run build
bun run start
```

---

## 🐛 Troubleshooting

### "I ran `bun run dev` but still see demo data"

**Answer**: `bun run dev` is ALWAYS development mode. You must use `bun run build` + `bun run start`.

### "I set NODE_ENV=production in .env.local"

**Answer**: Next.js ignores NODE_ENV in `.env.local` for `dev` and `build` commands. The mode is controlled by the command you run:
- `bun run dev` → development (always)
- `bun run start` → production (always, requires build first)

### "Do I need to keep NODE_ENV=production in .env.local?"

**Answer**: No, you can remove it. It has no effect on Next.js mode. The mode is determined by the command.

### "How do I test production behavior during development?"

**Answer**: You must run `bun run build` + `bun run start`. There's no way to force production mode with `bun run dev`.

---

## 📊 Quick Reference

| Command | Mode | Demo Users | Hot Reload | Optimized |
|---------|------|------------|------------|-----------|
| `bun run dev` | Development | ✅ Created | ✅ Yes | ❌ No |
| `bun run build` | Build phase | N/A | N/A | ✅ Yes |
| `bun run start` | Production | ❌ Disabled | ❌ No | ✅ Yes |

---

## ✅ Final Production Startup Commands

```bash
# Navigate to project
cd navisol-boat-configurator

# Build optimized production bundle
bun run build

# Start production server (runs on port 3000 by default)
bun run start

# Open browser and verify:
# - No demo accounts card
# - Console: "Production mode: Demo users disabled"
# - Login with your real account
```

---

## 🎯 Summary

1. **`.env.local` with `NODE_ENV=production` does NOTHING** when running Next.js
2. **`bun run dev` is ALWAYS development mode** (cannot be changed)
3. **`bun run start` is ALWAYS production mode** (requires build first)
4. **Demo data checks are CORRECT** - they check `process.env.NODE_ENV`
5. **To disable demo data, you MUST run `bun run build` then `bun run start`**

---

*Updated: March 10, 2026*
*Next.js Production Mode Configuration*

# Production Mode - Quick Start

## 🚀 Run in Production Mode (5 Minutes)

### Prerequisites

✅ Database cleanup completed (ran SQL migrations)
✅ Browser storage cleared

---

## Step-by-Step Commands

### 1. Navigate to Project

```bash
cd navisol-boat-configurator
```

### 2. Build Production Bundle

```bash
bun run build
```

**Wait**: Build takes 30-60 seconds

**Expected output**:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
```

### 3. Start Production Server

```bash
bun run start
```

**Expected output**:
```
▲ Next.js 16.1.1
- Local:        http://localhost:3000
```

### 4. Open Browser

Navigate to: http://localhost:3000

---

## ✅ Verification Checklist

**Login Screen**:
- ❌ NO "Demo Accounts (Dev Only)" card visible
- ✅ Only email/password fields shown

**Browser Console**:
- ✅ Shows: "Production mode: Demo users disabled..."
- ❌ Does NOT show: "Development mode: Creating demo users..."

**Login Test**:
- ✅ Can login with real account (Erik van den Brand)
- ❌ Cannot login as admin@eagleboats.nl (demo account deleted)

---

## 🔄 Switch Back to Development

**When you need hot reload for development**:

```bash
# Stop production server (Ctrl+C)
bun run dev
```

**Returns to**:
- Development mode
- Hot reload enabled
- Demo data enabled

---

## ❌ Common Mistakes

### Mistake: "I set NODE_ENV=production in .env.local"

**Problem**: `.env.local` doesn't control Next.js mode

**Solution**: Use `bun run start` command (requires build first)

### Mistake: "I'm running bun run dev"

**Problem**: `bun run dev` is ALWAYS development mode

**Solution**: Use `bun run build` then `bun run start`

---

## 📋 Command Reference

| Command | Purpose | Mode |
|---------|---------|------|
| `bun run dev` | Development with hot reload | Development |
| `bun run build` | Create production bundle | Build phase |
| `bun run start` | Run production server | Production |

**For production**: Always use `build` + `start` together

---

## 🎯 TL;DR

```bash
# Production mode (3 commands):
cd navisol-boat-configurator
bun run build
bun run start
# Open http://localhost:3000

# Back to dev mode:
# Ctrl+C to stop
bun run dev
```

---

*Quick Start Guide - Production Mode*
*Last Updated: March 10, 2026*

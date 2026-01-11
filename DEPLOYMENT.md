# Navisol v4 Deployment Guide

**Version:** v132
**Tests:** 183 passing
**Framework:** Next.js 16 + Bun

---

## Quick Deploy to Vercel

### Prerequisites
- GitHub account with access to this repository
- Vercel account (free tier works)

### Steps

1. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import from GitHub: `erikvandenbrand-cloud/navisol-boat-configurator`

2. **Configure Build Settings**
   - Framework Preset: `Next.js`
   - Build Command: `bun run build`
   - Install Command: `bun install`
   - Output Directory: `.next` (auto-detected)

3. **Environment Variables**
   No environment variables required for basic deployment.
   The app uses localStorage for persistence (client-side only).

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~1-2 minutes)

### URLs

| Route | Description |
|-------|-------------|
| `/` | Dashboard (home) - Overview of projects, pipeline, activity |
| `/projects` | Project list |
| `/projects?status=DRAFT` | Projects filtered by status |
| `/projects?quoteStatus=SENT` | Projects with quotes in specific status |
| `/projects/[id]` | Project detail screen |

### Query Parameters

- `?status=DRAFT|QUOTED|OFFER_SENT|ORDER_CONFIRMED|IN_PRODUCTION|READY_FOR_DELIVERY|DELIVERED|CLOSED`
- `?quoteStatus=DRAFT|SENT|ACCEPTED|REJECTED|EXPIRED|SUPERSEDED`

---

## Reset Sample Data

The app initializes with sample data on first load. To reset:

### Option 1: Browser Console
```javascript
// Clear all Navisol data
Object.keys(localStorage)
  .filter(key => key.startsWith('navisol_'))
  .forEach(key => localStorage.removeItem(key));
location.reload();
```

### Option 2: Clear All Site Data
1. Open DevTools (F12)
2. Application tab → Storage → Clear site data

---

## Export / Import Data

### Export All Data
```javascript
// Run in browser console
const data = {};
Object.keys(localStorage)
  .filter(key => key.startsWith('navisol_'))
  .forEach(key => data[key] = localStorage.getItem(key));
console.log(JSON.stringify(data, null, 2));
// Copy the output
```

### Import Data
```javascript
// Paste your exported JSON
const data = { /* paste here */ };
Object.entries(data).forEach(([key, value]) => {
  localStorage.setItem(key, value);
});
location.reload();
```

---

## Local Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Start dev server
bun run dev

# Build for production
bun run build
```

---

## Architecture Notes

- **Framework**: Next.js 16 with App Router
- **State**: React hooks + localStorage persistence
- **Styling**: Tailwind CSS + shadcn/ui components
- **Testing**: Bun test runner (183 tests)

### Key Directories
```
src/
├── domain/           # Business logic, models, services
│   ├── models/       # TypeScript interfaces
│   ├── services/     # Business services
│   ├── workflow/     # Status machine
│   └── __tests__/    # Domain tests
├── data/             # Persistence layer
│   ├── persistence/  # Storage adapters
│   └── repositories/ # Data access
└── v4/               # UI layer
    ├── screens/      # Page components
    ├── components/   # Reusable UI
    └── navigation.ts # URL routing
```

---

## Troubleshooting

### Build Fails
- Ensure Bun is available: `bun --version`
- Check for TypeScript errors: `bun run lint`
- Run tests: `bun test`

### SPA Routing
The app uses client-side routing with `window.history.pushState()`. The `vercel.json` file includes rewrites to handle direct navigation to routes like `/projects` or `/projects/123`.

### App Shows Blank
- Check browser console for errors
- Clear localStorage and reload
- Verify JavaScript is enabled

### Filters Not Working
- URL params are case-sensitive (use `DRAFT` not `draft`)
- Check valid status values in tables above

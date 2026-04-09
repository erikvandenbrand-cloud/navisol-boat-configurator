# Navisol v4 - Active Tasks

## Recently Completed
- [x] **API Route Diagnostics Added** (v382)
  - ✅ Added GET handler to /api/chat for testing
  - ✅ Returns status, timestamp, and runtime info
  - ✅ Verified working locally (returns 200 OK)
  - ✅ Created comprehensive troubleshooting guide
  - ⏳ Awaiting production test on Vercel

## Recently Completed
- [x] **Floor Assistant - Next.js App Router Fix** (v381)
  - ✅ Removed conflicting /api/chat.js from root directory
  - ✅ Updated src/app/api/chat/route.ts to use native https module
  - ✅ Removed functions config from vercel.json
  - ✅ Now uses proper Next.js App Router architecture exclusively
  - ✅ Fixed framework: nextjs conflict with root serverless functions

- [x] **Floor Assistant - Vercel Build Fix** (v380)
  - ✅ Rewrote /api/chat.js to use native Node.js https module
  - ✅ Fixed Vercel build error: ENOENT babel-code-frame/index.js
  - ✅ Removed fetch() dependency (caused Next.js conflicts)
  - ✅ Changed to CommonJS module.exports from ES6 export
  - ✅ Zero external dependencies - pure Node.js

- [x] **Floor Assistant - Direct API Call Fix** (v379)
  - ✅ FloorAssistantScreen now calls /api/chat directly with fetch()
  - ✅ Removed dependency on callClaude wrapper
  - ✅ Added explicit error handling for HTTP responses
  - ✅ Added console.error for debugging
  - ✅ Clearer code flow for production/local API communication

- [x] **Floor Assistant - Production Deployment Fix** (v378)
  - ✅ Created Vercel serverless function at /api/chat.js
  - ✅ Fixed 404 error on /api/chat in production
  - ✅ Updated vercel.json with function configuration
  - ✅ Added 60s max duration for API calls
  - ✅ Documented serverless function setup in /api/README.md

- [x] **Floor Assistant - Final Integration** (completed)
  - ✅ FloorAssistantScreen component implemented
  - ✅ System prompt configured
  - ✅ /api/chat route working
  - ✅ Permissions set up (ADMIN, OFFICE, PRODUCTION)
  - ✅ Navigation function added (navigateToFloorAssistant)
  - ✅ Sidebar nav item added in Portfolio section
  - ✅ Render case added in V4App switch statement
- [x] **Added supplier field and archive/delete for articles** (v365)
  - Added supplier dropdown to ArticleDialog (create and edit modes)
  - Added `archived` field to LibraryArticle model with archive/restore/delete methods
  - LibraryScreen now shows archive button, restore button for archived items, and permanent delete
  - Added "Show archived" toggle in the articles table
  - Supplier column displayed in articles table
  - Delete confirmation dialog for permanent deletion

- [x] **FIXED: Demo data reappearing after deletion** (v364)
  - Added persistent initialization flags to SettingsService
  - Updated all seed/init functions to use flags instead of data count checks
  - Now deleted data stays deleted - no more re-seeding on app reload

## Supabase Integration
- [x] Supabase credentials configured in `.env.local`
- [x] Updated migration script to be idempotent (safe to run multiple times)
- [ ] **PENDING USER ACTION:** Run the updated migration in Supabase SQL Editor
  - File: `supabase/migrations/001_initial_schema.sql`
  - The script now drops existing policies before creating them
  - Expected result: "Table 'entities' created successfully"
- [x] Added Data Persistence Status card in Settings Import/Export tab

## Previous Completions
- [x] Verified Settings screen has Import/Export tab (v362)
- [x] Production users cannot mark goods as received (v355)
- [x] Customer Offer feature with templates (v352-353)
- [x] Shop Floor Orders UI improvements
- [x] Permission-based UI restrictions

## Notes
- The "data tab" is labeled "Import/Export" in the Settings screen
- User must log in first to see Settings
- Supabase will be active once migration is run
- Initialization flags stored in app settings - persists even when data is deleted
- Articles can be archived (soft delete) or permanently deleted
- Supplier field is optional - stores both ID and name for convenience

## Backlog
- [ ] Test Supabase data persistence after migration
- [ ] Verify data sync across browser sessions
- [ ] Consider deploying to Netlify with Supabase backend

# Navisol v4 - Active Tasks

## Supabase Integration
- [x] Supabase credentials configured in `.env.local`
- [x] Updated migration script to be idempotent (safe to run multiple times)
- [ ] **PENDING USER ACTION:** Run the updated migration in Supabase SQL Editor
  - File: `supabase/migrations/001_initial_schema.sql`
  - The script now drops existing policies before creating them
  - Expected result: "✅ Table 'entities' created successfully"
- [x] Added Data Persistence Status card in Settings → Import/Export tab

## Recently Completed
- [x] Verified Settings screen has Import/Export tab (v362)
- [x] Production users cannot mark goods as received (v355)
- [x] Customer Offer feature with templates (v352-353)
- [x] Shop Floor Orders UI improvements
- [x] Permission-based UI restrictions

## Notes
- The "data tab" is labeled "Import/Export" in the Settings screen
- User must log in first to see Settings
- Supabase will be active once migration is run

## Backlog
- [ ] Test Supabase data persistence after migration
- [ ] Verify data sync across browser sessions
- [ ] Consider deploying to Netlify with Supabase backend

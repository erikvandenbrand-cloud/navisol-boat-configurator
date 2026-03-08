# Supabase Setup Guide for Navisol Boat Configurator

This guide will help you set up Supabase as the persistent database for Navisol.

## Quick Start (5 minutes)

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" and sign in (GitHub, Google, or email)
3. Click "New Project"
4. Fill in:
   - **Organization**: Select or create one
   - **Project name**: `navisol-boat-configurator`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait ~2 minutes

### Step 2: Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. You should see: `✅ Table "entities" created successfully`

### Step 3: Get Your API Keys

1. Go to **Settings** → **API** (in left sidebar)
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGci...` (the long one)

### Step 4: Configure Environment Variables

1. Create `.env.local` in your project root:

```bash
cp .env.example .env.local
```

2. Edit `.env.local` and add your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 5: Start the Application

```bash
bun dev
```

Open the app and check the browser console. You should see:
```
📦 Using Supabase for data persistence
```

## Migrating Existing LocalStorage Data

If you have existing data in LocalStorage that you want to migrate to Supabase:

### Option 1: Export/Import via UI

1. In the app, go to **Settings** → **Export Data**
2. Download the JSON export
3. After configuring Supabase, go to **Settings** → **Import Data**
4. Upload your exported JSON file

### Option 2: Manual Migration Script

Run this in your browser console (before switching to Supabase):

```javascript
// Export all LocalStorage data
const prefix = 'navisol_v4_';
const data = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.startsWith(prefix)) {
    const namespace = key.replace(prefix, '');
    data[namespace] = JSON.parse(localStorage.getItem(key));
  }
}
console.log(JSON.stringify(data, null, 2));
// Copy this output and save to a file
```

## Security Configuration

### Row Level Security (RLS)

The default migration enables RLS with permissive policies for development.
For production, update the policies:

```sql
-- Remove development policy
DROP POLICY IF EXISTS "Allow all for anon (dev only)" ON entities;

-- Keep only authenticated user access
-- Users can only access their own data (if you add user_id column)
```

### Adding User-Based Access Control

If you want users to only see their own data:

1. Add a `user_id` column:
```sql
ALTER TABLE entities ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_entities_user_id ON entities(user_id);
```

2. Update RLS policies:
```sql
DROP POLICY IF EXISTS "Allow all for authenticated users" ON entities;

CREATE POLICY "Users can access own data" ON entities
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
```

## Deploying to Production

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Connect to Vercel: [https://vercel.com/import](https://vercel.com/import)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Option 2: Netlify

1. Push your code to GitHub
2. Connect to Netlify: [https://app.netlify.com](https://app.netlify.com)
3. Add environment variables in Site Settings → Environment
4. Deploy!

### Option 3: Docker

```dockerfile
FROM oven/bun:1 as builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "start"]
```

## Troubleshooting

### "Supabase not configured" warning

Check that your `.env.local` file:
1. Exists in the project root
2. Has the correct variable names (with `NEXT_PUBLIC_` prefix)
3. Has no extra spaces around the `=` sign

### "Failed to insert/update entity" errors

1. Check the Supabase dashboard → Logs → Postgres Logs
2. Verify the migration ran successfully
3. Check RLS policies are not blocking access

### Data not persisting

1. Check browser console for errors
2. Verify Supabase is receiving requests (Dashboard → API → Usage)
3. Check the `entities` table in Table Editor

### Connection issues

1. Verify your project URL is correct
2. Check if your Supabase project is paused (free tier pauses after inactivity)
3. Try regenerating your API keys in Settings → API

## Backup & Recovery

### Manual Backup

In Supabase Dashboard → Database → Backups

### Scheduled Backups (Pro plan)

Supabase Pro includes daily automatic backups with point-in-time recovery.

### Export Data via SQL

```sql
COPY (
  SELECT * FROM entities
) TO STDOUT WITH CSV HEADER;
```

## Performance Tips

1. **Enable connection pooling** in Database Settings for high traffic
2. **Add indexes** for frequently queried JSONB fields:
   ```sql
   CREATE INDEX idx_entities_project_id ON entities((data->>'projectId'));
   ```
3. **Use edge functions** for complex operations

## Support

- Supabase Documentation: [https://supabase.com/docs](https://supabase.com/docs)
- Supabase Discord: [https://discord.supabase.com](https://discord.supabase.com)
- Project Issues: Create an issue in the GitHub repository

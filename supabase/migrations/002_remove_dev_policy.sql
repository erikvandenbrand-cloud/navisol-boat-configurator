-- ============================================
-- Remove Development-Only Anonymous Access
-- Migration: 002_remove_dev_policy.sql
-- ============================================
--
-- This migration removes the development-only policy that allows
-- anonymous users to write to the database.
--
-- IMPORTANT: Run this in Supabase SQL Editor AFTER code changes
-- and AFTER running 003_safe_production_cleanup.sql
--
-- How to apply:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Paste and execute this script
-- 3. Verify policies with the query below
-- ============================================

-- Drop the development-only anonymous write access policy
DROP POLICY IF EXISTS "Allow all for anon (dev only)" ON entities;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify policy was removed:

SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'entities';

-- Expected results:
-- - "Allow all for authenticated users" (SELECT, INSERT, UPDATE, DELETE)
-- - "Allow read for anon" (SELECT only)
-- Should NOT show: "Allow all for anon (dev only)"

-- ============================================
-- SECURITY STATUS
-- ============================================
-- After this migration:
-- ✅ Authenticated users: Full access (read/write)
-- ✅ Anonymous users: Read-only access
-- ❌ Anonymous users: NO write access (security improvement)

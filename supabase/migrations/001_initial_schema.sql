-- ============================================
-- Navisol Boat Configurator - Database Schema
-- Version: 1.0.0
-- ============================================
--
-- This migration creates the core table structure for the Navisol application.
-- We use a flexible JSONB-based approach where all entities are stored in a
-- single `entities` table with namespace partitioning.
--
-- This approach provides:
-- 1. Schema flexibility (same as LocalStorage)
-- 2. Easy migration from LocalStorage
-- 3. Full-text search on JSONB data
-- 4. PostgreSQL's reliability and performance
--
-- To run this migration:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste and execute this script
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENTITIES TABLE (Core Storage)
-- ============================================
-- This table stores all application entities using JSONB.
-- The namespace column partitions data by entity type.

CREATE TABLE IF NOT EXISTS entities (
    -- Primary key: entity UUID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Namespace for partitioning (e.g., 'projects', 'clients', 'library_articles')
    namespace VARCHAR(100) NOT NULL,

    -- The full entity data as JSONB
    data JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Index on namespace for fast filtering
CREATE INDEX IF NOT EXISTS idx_entities_namespace ON entities(namespace);

-- Composite unique constraint on id + namespace
-- This ensures entity IDs are unique within their namespace
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_id_namespace ON entities(id, namespace);

-- GIN index on JSONB data for fast queries
CREATE INDEX IF NOT EXISTS idx_entities_data ON entities USING GIN(data);

-- Index for common query patterns on JSONB fields
CREATE INDEX IF NOT EXISTS idx_entities_data_id ON entities((data->>'id'));
CREATE INDEX IF NOT EXISTS idx_entities_data_status ON entities((data->>'status'));
CREATE INDEX IF NOT EXISTS idx_entities_data_archived ON entities((data->>'archived'));

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS for secure access control

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON entities;
DROP POLICY IF EXISTS "Allow read for anon" ON entities;
DROP POLICY IF EXISTS "Allow all for anon (dev only)" ON entities;

-- Policy: Allow all operations for authenticated users
-- You can customize this based on your security requirements
CREATE POLICY "Allow all for authenticated users" ON entities
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow read access for anonymous users (optional, for public data)
-- Comment this out if you don't want anonymous access
CREATE POLICY "Allow read for anon" ON entities
    FOR SELECT
    TO anon
    USING (true);

-- Policy: Allow all for anon (for development - REMOVE IN PRODUCTION!)
-- This allows unauthenticated access for easier development
CREATE POLICY "Allow all for anon (dev only)" ON entities
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on entity changes
DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- NAMESPACES REFERENCE (for documentation)
-- ============================================
-- The following namespaces are used by the application:
--
-- Core Entities:
--   - projects: Project entities
--   - clients: Client/Customer entities
--   - users: User accounts
--   - settings: Application settings
--   - audit: Audit log entries
--
-- Library Entities:
--   - library_categories: Equipment categories
--   - library_subcategories: Equipment subcategories
--   - library_articles: Library articles (equipment items)
--   - library_article_versions: Versioned article data
--   - library_kits: Equipment kits
--   - library_kit_versions: Versioned kit data
--   - library_boat_models: Boat model definitions
--   - library_boat_model_versions: Versioned boat model data
--   - library_standards: Standards library (ISO, EN, etc.)
--   - library_work_instructions: Work instruction documents
--   - library_work_instruction_comments: Work instruction comments
--   - library_production_procedures: Production procedure definitions
--   - library_production_procedure_versions: Versioned procedure data
--   - library_catalogs: (Legacy) Equipment catalogs
--   - library_catalog_versions: (Legacy) Catalog versions
--   - library_templates: Document templates
--   - library_template_versions: Template versions
--   - library_procedures: (Legacy) Procedures
--   - library_procedure_versions: (Legacy) Procedure versions
--
-- Operational Entities:
--   - shop_floor_orders: Shop floor order items
--   - suppliers: Supplier master data
--   - timesheets: Timesheet entries
--   - offer_templates: Customer offer templates
--   - staff: (Legacy) Staff records
--
-- ============================================

-- ============================================
-- SEED DATA (Optional)
-- ============================================
-- Uncomment the following to add initial seed data

-- Example: Insert default settings
-- INSERT INTO entities (id, namespace, data) VALUES (
--     'default-settings',
--     'settings',
--     '{
--         "id": "default-settings",
--         "companyName": "Your Company",
--         "version": 1
--     }'::jsonb
-- ) ON CONFLICT (id, namespace) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify table was created
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'entities') THEN
        RAISE NOTICE '✅ Table "entities" created successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to create "entities" table';
    END IF;
END $$;

-- Show table structure
-- \d entities;

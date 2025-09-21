-- Comprehensive Security Setup for Document Collector Database
-- This script enables Row Level Security (RLS) and creates appropriate policies for all tables

-- ==============================================
-- CLIENTS TABLE SECURITY
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON clients;

CREATE POLICY "Users can view their own clients" ON clients
    FOR SELECT USING (clerk_id = auth.uid());

CREATE POLICY "Users can insert their own clients" ON clients
    FOR INSERT WITH CHECK (clerk_id = auth.uid());

CREATE POLICY "Users can update their own clients" ON clients
    FOR UPDATE USING (clerk_id = auth.uid());

CREATE POLICY "Users can delete their own clients" ON clients
    FOR DELETE USING (clerk_id = auth.uid());


-- ==============================================
-- USERS TABLE SECURITY
-- ==============================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (clerk_id = auth.jwt() ->> 'sub');

-- ==============================================
-- PROFILES TABLE SECURITY (if exists)
-- ==============================================

-- Enable RLS on profiles table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
        
        -- Create RLS policies for profiles table
        CREATE POLICY "Users can view their own profile" ON profiles
            FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');
            
        CREATE POLICY "Users can update their own profile" ON profiles
            FOR UPDATE USING (clerk_id = auth.jwt() ->> 'sub');
            
        CREATE POLICY "Users can insert their own profile" ON profiles
            FOR INSERT WITH CHECK (clerk_id = auth.jwt() ->> 'sub');
    END IF;
END $$;

-- ==============================================
-- FILE_UPLOAD_AUDIT TABLE SECURITY
-- ==============================================

-- Enable RLS on file_upload_audit table
ALTER TABLE file_upload_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own uploads" ON file_upload_audit;
DROP POLICY IF EXISTS "Users can insert their own uploads" ON file_upload_audit;
DROP POLICY IF EXISTS "Users can update their own uploads" ON file_upload_audit;

-- Create RLS policies for file_upload_audit table
CREATE POLICY "Users can view their own uploads" ON file_upload_audit
    FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own uploads" ON file_upload_audit
    FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own uploads" ON file_upload_audit
    FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

-- ==============================================
-- UPLOAD_LINK_AUDIT TABLE SECURITY
-- ==============================================

-- Enable RLS on upload_link_audit table
ALTER TABLE upload_link_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own upload links" ON upload_link_audit;
DROP POLICY IF EXISTS "Users can insert their own upload links" ON upload_link_audit;
DROP POLICY IF EXISTS "Users can update their own upload links" ON upload_link_audit;
DROP POLICY IF EXISTS "Users can delete their own upload links" ON upload_link_audit;

-- Create RLS policies for upload_link_audit table
CREATE POLICY "Users can view their own upload links" ON upload_link_audit
    FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own upload links" ON upload_link_audit
    FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own upload links" ON upload_link_audit
    FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own upload links" ON upload_link_audit
    FOR DELETE USING (user_id = auth.jwt() ->> 'sub');

-- ==============================================
-- TOKEN_VALIDATION_LOG TABLE SECURITY
-- ==============================================

-- Enable RLS on token_validation_log table
ALTER TABLE token_validation_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own token logs" ON token_validation_log;
DROP POLICY IF EXISTS "Users can insert their own token logs" ON token_validation_log;
DROP POLICY IF EXISTS "Users can update their own token logs" ON token_validation_log;

-- Create RLS policies for token_validation_log table
CREATE POLICY "Users can view their own token logs" ON token_validation_log
    FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own token logs" ON token_validation_log
    FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own token logs" ON token_validation_log
    FOR UPDATE USING (user_id = auth.jwt() ->> 'sub');

-- ==============================================
-- VERIFY RLS IS ENABLED
-- ==============================================

-- Query to verify RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('clients', 'users', 'profiles', 'file_upload_audit', 'upload_link_audit', 'token_validation_log', 'file_send_clients', 'activity_log')
ORDER BY tablename;

-- ==============================================
-- ADDITIONAL SECURITY RECOMMENDATIONS
-- ==============================================

-- Create a function to check if user is authenticated
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'user_id')::text
  );
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE clients IS 'Client information table with RLS enabled - users can only access their own clients';
COMMENT ON TABLE users IS 'User profiles table with RLS enabled - users can only access their own profile';
COMMENT ON TABLE file_upload_audit IS 'File upload audit log with RLS enabled - users can only access their own uploads';
COMMENT ON TABLE upload_link_audit IS 'Upload link audit log with RLS enabled - users can only access their own links';
COMMENT ON TABLE token_validation_log IS 'Token validation log with RLS enabled - users can only access their own logs';

-- ==============================================
-- SECURITY AUDIT QUERY
-- ==============================================

-- Run this query to verify all tables have RLS enabled and policies created
SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
    AND t.tablename IN ('clients', 'users', 'profiles', 'file_upload_audit', 'upload_link_audit', 'token_validation_log', 'file_send_clients', 'activity_log')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

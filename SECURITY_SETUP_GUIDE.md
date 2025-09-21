# Database Security Setup Guide

This guide will help you set up Row Level Security (RLS) for all your database tables to ensure users can only access their own data.

## Overview

Your database currently has several tables marked as "Unrestricted" in the Supabase dashboard, which means they don't have proper security policies. This guide will help you secure all tables.

## Tables That Need Security

Based on your current setup, these tables need RLS policies:

1. **clients** - Client information (currently Unrestricted)
2. **users** - User profiles (currently Unrestricted) 
3. **profiles** - User profiles (if exists, currently Unrestricted)
4. **file_upload_audit** - File upload logs (currently Unrestricted)
5. **upload_link_audit** - Upload link logs (currently Unrestricted)
6. **token_validation_log** - Token validation logs (currently Unrestricted)

Tables already secured:
- **file_send_clients** - Already has RLS policies
- **activity_log** - Already has RLS policies

## Setup Methods

### Method 1: Run SQL in Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `security_setup.sql`
4. Paste it into the SQL editor
5. Click **Run** to execute

### Method 2: Run via Node.js Script

1. Make sure you have your environment variables set up
2. Run the security setup script:
   ```bash
   node runSecuritySetup.js
   ```

## What the Security Setup Does

### Row Level Security (RLS)
- Enables RLS on all tables that need it
- Ensures users can only access their own data
- Prevents unauthorized access to other users' information

### Security Policies Created
For each table, the following policies are created:

1. **SELECT Policy** - Users can only view their own records
2. **INSERT Policy** - Users can only insert records with their own user ID
3. **UPDATE Policy** - Users can only update their own records
4. **DELETE Policy** - Users can only delete their own records (where applicable)

### User Identification
The policies use Clerk authentication to identify users:
- `clerk_id = auth.jwt() ->> 'sub'` for client-related tables
- `user_id = auth.jwt() ->> 'sub'` for audit and log tables

## Verification

After running the setup, you can verify security is working by:

1. **Check RLS Status**: Run the verification query in the SQL editor:
   ```sql
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
   ```

2. **Test in Application**: 
   - Log in as different users
   - Verify each user only sees their own data
   - Try to access other users' data (should be blocked)

## Security Features

### Data Isolation
- Each user can only access their own clients, uploads, and logs
- No cross-user data leakage
- Automatic filtering based on authentication

### Audit Trail
- All user actions are logged in `activity_log`
- File uploads are tracked in `file_upload_audit`
- Token validations are logged in `token_validation_log`

### Error Handling
- Graceful handling of missing tables
- Policy conflicts are resolved by dropping and recreating
- Comprehensive error logging

## Troubleshooting

### Common Issues

1. **"Policy already exists" errors**
   - The script handles this by dropping existing policies first
   - This is normal and expected

2. **"Table doesn't exist" errors**
   - Some tables might not exist yet
   - The script includes conditional checks for this

3. **Authentication issues**
   - Ensure Clerk is properly configured
   - Check that JWT tokens contain the correct user ID

### Verification Steps

1. Check Supabase dashboard - tables should no longer show "Unrestricted"
2. Test with different user accounts
3. Verify data isolation works correctly
4. Check application logs for any security-related errors

## Next Steps

After setting up security:

1. **Test thoroughly** with multiple user accounts
2. **Monitor logs** for any security-related issues
3. **Update your application** if needed to handle RLS properly
4. **Consider additional security measures** like API rate limiting

## Support

If you encounter any issues:

1. Check the Supabase logs for detailed error messages
2. Verify your Clerk configuration
3. Ensure all environment variables are set correctly
4. Test with a simple query first to isolate the issue

## Security Best Practices

1. **Regular Audits**: Periodically review your security policies
2. **Monitor Access**: Keep an eye on unusual access patterns
3. **Update Policies**: Modify policies as your application grows
4. **Test Changes**: Always test security changes in a development environment first

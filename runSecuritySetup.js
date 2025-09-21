import { supabase } from './controllers/supabaseClient.js';
import fs from 'fs';
import path from 'path';

async function runSecuritySetup() {
    try {
        console.log('🔒 Starting database security setup...');
        
        // Read the security setup SQL file
        const sqlPath = path.join(process.cwd(), 'security_setup.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📖 Security setup SQL loaded successfully');
        console.log('🚀 Executing security policies...');
        
        // Split the SQL into individual statements for better error handling
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const statement of statements) {
            try {
                if (statement.trim()) {
                    const { error } = await supabase.rpc('exec_sql', { sql: statement });
                    
                    if (error) {
                        // Some errors are expected (like "policy already exists")
                        if (error.message.includes('already exists') || 
                            error.message.includes('does not exist')) {
                            console.log(`⚠️  Expected warning: ${error.message}`);
                        } else {
                            console.error(`❌ Error executing statement: ${error.message}`);
                            console.error(`Statement: ${statement.substring(0, 100)}...`);
                            errorCount++;
                        }
                    } else {
                        successCount++;
                    }
                }
            } catch (err) {
                console.error(`❌ Exception executing statement: ${err.message}`);
                errorCount++;
            }
        }
        
        console.log(`\n📊 Security setup completed!`);
        console.log(`✅ Successful operations: ${successCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        
        // Verify RLS is enabled
        console.log('\n🔍 Verifying Row Level Security status...');
        
        const { data: rlsData, error: rlsError } = await supabase
            .from('pg_tables')
            .select('tablename, rowsecurity')
            .eq('schemaname', 'public')
            .in('tablename', [
                'clients', 'users', 'profiles', 'file_upload_audit', 
                'upload_link_audit', 'token_validation_log', 
                'file_send_clients', 'activity_log'
            ]);
        
        if (rlsError) {
            console.error('❌ Error verifying RLS status:', rlsError.message);
        } else {
            console.log('\n📋 RLS Status Report:');
            console.log('Table Name'.padEnd(25) + 'RLS Enabled');
            console.log('-'.repeat(35));
            
            rlsData.forEach(row => {
                const status = row.rowsecurity ? '✅ Yes' : '❌ No';
                console.log(`${row.tablename.padEnd(25)}${status}`);
            });
        }
        
        // Check policies
        console.log('\n🔍 Checking security policies...');
        
        const { data: policyData, error: policyError } = await supabase
            .from('pg_policies')
            .select('tablename, policyname')
            .eq('schemaname', 'public')
            .in('tablename', [
                'clients', 'users', 'profiles', 'file_upload_audit', 
                'upload_link_audit', 'token_validation_log', 
                'file_send_clients', 'activity_log'
            ]);
        
        if (policyError) {
            console.error('❌ Error checking policies:', policyError.message);
        } else {
            const policyCounts = {};
            policyData.forEach(policy => {
                policyCounts[policy.tablename] = (policyCounts[policy.tablename] || 0) + 1;
            });
            
            console.log('\n📋 Policy Count Report:');
            console.log('Table Name'.padEnd(25) + 'Policy Count');
            console.log('-'.repeat(35));
            
            const allTables = [
                'clients', 'users', 'profiles', 'file_upload_audit', 
                'upload_link_audit', 'token_validation_log', 
                'file_send_clients', 'activity_log'
            ];
            
            allTables.forEach(table => {
                const count = policyCounts[table] || 0;
                const status = count > 0 ? `✅ ${count}` : '❌ 0';
                console.log(`${table.padEnd(25)}${status}`);
            });
        }
        
        console.log('\n🎉 Security setup process completed!');
        console.log('\n📝 Next steps:');
        console.log('1. Check your Supabase dashboard - tables should no longer show "Unrestricted"');
        console.log('2. Test your application with different user accounts');
        console.log('3. Verify that users can only see their own data');
        console.log('4. Check the SECURITY_SETUP_GUIDE.md for more information');
        
    } catch (error) {
        console.error('💥 Fatal error during security setup:', error);
        process.exit(1);
    }
}

// Run the security setup
runSecuritySetup();

import { supabase } from './controllers/supabaseClient.js';

async function checkSecurityStatus() {
    try {
        console.log('🔍 Checking database security status...\n');
        
        // Check RLS status for all tables
        const { data: rlsData, error: rlsError } = await supabase
            .rpc('exec_sql', { 
                sql: `
                    SELECT 
                        tablename,
                        rowsecurity as rls_enabled
                    FROM pg_tables 
                    WHERE schemaname = 'public' 
                        AND tablename IN ('clients', 'users', 'profiles', 'file_upload_audit', 'upload_link_audit', 'token_validation_log', 'file_send_clients', 'activity_log')
                    ORDER BY tablename;
                `
            });
        
        if (rlsError) {
            console.error('❌ Error checking RLS status:', rlsError.message);
            return;
        }
        
        console.log('📋 Row Level Security Status:');
        console.log('Table Name'.padEnd(25) + 'RLS Enabled');
        console.log('-'.repeat(35));
        
        rlsData.forEach(row => {
            const status = row.rls_enabled ? '✅ Yes' : '❌ No';
            console.log(`${row.tablename.padEnd(25)}${status}`);
        });
        
        // Check policy counts
        const { data: policyData, error: policyError } = await supabase
            .rpc('exec_sql', { 
                sql: `
                    SELECT 
                        t.tablename,
                        COUNT(p.policyname) as policy_count
                    FROM pg_tables t
                    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
                    WHERE t.schemaname = 'public' 
                        AND t.tablename IN ('clients', 'users', 'profiles', 'file_upload_audit', 'upload_link_audit', 'token_validation_log', 'file_send_clients', 'activity_log')
                    GROUP BY t.tablename
                    ORDER BY t.tablename;
                `
            });
        
        if (policyError) {
            console.error('❌ Error checking policies:', policyError.message);
            return;
        }
        
        console.log('\n📋 Security Policy Count:');
        console.log('Table Name'.padEnd(25) + 'Policy Count');
        console.log('-'.repeat(35));
        
        policyData.forEach(row => {
            const status = row.policy_count > 0 ? `✅ ${row.policy_count}` : '❌ 0';
            console.log(`${row.tablename.padEnd(25)}${status}`);
        });
        
        // Summary
        const totalTables = rlsData.length;
        const tablesWithRLS = rlsData.filter(row => row.rls_enabled).length;
        const tablesWithPolicies = policyData.filter(row => row.policy_count > 0).length;
        
        console.log('\n📊 Security Summary:');
        console.log(`Total tables checked: ${totalTables}`);
        console.log(`Tables with RLS enabled: ${tablesWithRLS}/${totalTables}`);
        console.log(`Tables with policies: ${tablesWithPolicies}/${totalTables}`);
        
        if (tablesWithRLS === totalTables && tablesWithPolicies === totalTables) {
            console.log('\n🎉 All tables are properly secured!');
        } else {
            console.log('\n⚠️  Some tables need security setup.');
            console.log('Run: node runSecuritySetup.js');
        }
        
    } catch (error) {
        console.error('💥 Error checking security status:', error);
    }
}

// Run the check
checkSecurityStatus();

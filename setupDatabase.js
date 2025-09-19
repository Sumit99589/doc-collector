import { supabase } from './controllers/supabaseClient.js';
import fs from 'fs';
import path from 'path';

async function setupDatabase() {
    try {
        console.log('Setting up database tables...');
        
        // Read the SQL file
        const sqlPath = path.join(process.cwd(), 'setup_database.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Execute the SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
        
        if (error) {
            console.error('Error setting up database:', error);
            return;
        }
        
        console.log('Database setup completed successfully!');
    } catch (error) {
        console.error('Error in setupDatabase:', error);
    }
}

// Run the setup
setupDatabase();

import { supabase } from './controllers/supabaseClient.js';

async function createFileSendClientsTable() {
    try {
        console.log('Creating file_send_clients table...');
        
        // Create the table
        const { data, error } = await supabase
            .from('file_send_clients')
            .select('*')
            .limit(1);
            
        if (error && error.code === 'PGRST116') {
            // Table doesn't exist, create it
            console.log('Table does not exist. Please create it manually in Supabase dashboard with the following SQL:');
            console.log(`
CREATE TABLE file_send_clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive')),
    clerk_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
            `);
        } else if (error) {
            console.error('Error checking table:', error);
        } else {
            console.log('Table already exists!');
        }
    } catch (error) {
        console.error('Error in createFileSendClientsTable:', error);
    }
}

createFileSendClientsTable();

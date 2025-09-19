-- Create file_send_clients table
CREATE TABLE IF NOT EXISTS file_send_clients (
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_file_send_clients_clerk_id ON file_send_clients(clerk_id);
CREATE INDEX IF NOT EXISTS idx_file_send_clients_email ON file_send_clients(client_email);

-- Add RLS (Row Level Security) policies
ALTER TABLE file_send_clients ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own clients
CREATE POLICY "Users can view their own file send clients" ON file_send_clients
    FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own file send clients" ON file_send_clients
    FOR INSERT WITH CHECK (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own file send clients" ON file_send_clients
    FOR UPDATE USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own file send clients" ON file_send_clients
    FOR DELETE USING (clerk_id = auth.jwt() ->> 'sub');

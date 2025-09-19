# Database Setup for File Send Clients

## Required Database Table

To use the file sending functionality, you need to create the `file_send_clients` table in your Supabase database.

### SQL to Create the Table

Run the following SQL in your Supabase SQL editor:

```sql
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

-- Create indexes for better performance
CREATE INDEX idx_file_send_clients_clerk_id ON file_send_clients(clerk_id);
CREATE INDEX idx_file_send_clients_email ON file_send_clients(client_email);

-- Enable Row Level Security
ALTER TABLE file_send_clients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own file send clients" ON file_send_clients
    FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own file send clients" ON file_send_clients
    FOR INSERT WITH CHECK (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own file send clients" ON file_send_clients
    FOR UPDATE USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own file send clients" ON file_send_clients
    FOR DELETE USING (clerk_id = auth.jwt() ->> 'sub');
```

## Environment Variables

Make sure you have the following environment variables set in your `.env` file:

```env
# SendGrid configuration for sending files
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=your-verified-sender-email@yourdomain.com

# Supabase configuration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Features Implemented

1. **Send Files Navigation**: Added "Send Files" option to the sidebar
2. **Client Management**: Full CRUD operations for file sending clients
3. **File Upload**: Support for multiple file uploads with size limits
4. **Email Service**: Professional email templates with file attachments
5. **Dashboard**: Complete dashboard showing clients with send options

## API Endpoints

- `GET /getFileSendClients/:userId` - Get all clients for a user
- `POST /addFileSendClient` - Add a new client
- `POST /updateFileSendClient` - Update an existing client
- `POST /deleteFileSendClient` - Delete a client
- `POST /sendFiles` - Send files to a client via email

## Usage

1. Navigate to the "Send Files" page
2. Add clients with their company information
3. Click "Send Files" button for any client
4. Select files from your local computer
5. Files will be sent via email with professional formatting

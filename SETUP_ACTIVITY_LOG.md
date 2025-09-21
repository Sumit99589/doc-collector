# Activity Log Setup

To enable the recent activity feature in the dashboard, you need to create the `activity_log` table in your Supabase database.

## Option 1: Run SQL directly in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the following SQL:

```sql
-- Create activity_log table for comprehensive activity tracking
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Clerk user ID
    activity_type VARCHAR(50) NOT NULL, -- Type of activity
    activity_category VARCHAR(30) NOT NULL, -- Category: client, email, file, system
    title VARCHAR(255) NOT NULL, -- Short title for the activity
    description TEXT, -- Detailed description
    client_name VARCHAR(255), -- Related client name if applicable
    client_email VARCHAR(255), -- Related client email if applicable
    metadata JSONB, -- Additional data (file names, amounts, etc.)
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'error', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_category ON activity_log(activity_category);

-- Enable Row Level Security
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own activities" ON activity_log
    FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert their own activities" ON activity_log
    FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');
```

4. Click "Run" to execute the SQL

## What this enables

Once the table is created, the dashboard will automatically start tracking and displaying:

- **Client Operations**: Adding, updating, deleting clients
- **Email Activities**: Sending document requests, file sharing emails
- **File Operations**: File uploads, file sending
- **System Activities**: Login/logout, errors

The recent activity section will show real-time data instead of mock data, with appropriate icons and timestamps for each activity type.

## Testing

After setting up the table:

1. Start your backend server: `npm start` (in backend directory)
2. Start your frontend: `npm run dev` (in frontend directory)
3. Perform some actions like adding a client or sending files
4. Check the dashboard to see the activities appear in real-time

## Activity Types Tracked

- `client_added` - When you add a new client
- `client_updated` - When you update client information  
- `client_deleted` - When you delete a client
- `document_request_sent` - When you send document request emails
- `file_uploaded` - When files are uploaded via upload links
- `file_sent` - When you send files via email
- `upload_link_generated` - When upload links are created

Each activity includes detailed metadata and is properly categorized for easy filtering and display.
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

-- Add comments for documentation
COMMENT ON TABLE activity_log IS 'Comprehensive activity log for tracking all user actions';
COMMENT ON COLUMN activity_log.activity_type IS 'Specific type: client_added, client_updated, client_deleted, email_sent, file_uploaded, file_sent, etc.';
COMMENT ON COLUMN activity_log.activity_category IS 'Broad category: client, email, file, system';
COMMENT ON COLUMN activity_log.metadata IS 'JSON data for additional context like file names, amounts, error details';

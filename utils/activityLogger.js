import { supabase } from '../controllers/supabaseClient.js';

/**
 * Log an activity to the activity_log table
 * @param {Object} activityData - The activity data to log
 * @param {string} activityData.userId - Clerk user ID
 * @param {string} activityData.type - Activity type (e.g., 'client_added', 'email_sent', 'file_uploaded')
 * @param {string} activityData.category - Activity category ('client', 'email', 'file', 'system')
 * @param {string} activityData.title - Short title for the activity
 * @param {string} [activityData.description] - Detailed description
 * @param {string} [activityData.clientName] - Related client name
 * @param {string} [activityData.clientEmail] - Related client email
 * @param {Object} [activityData.metadata] - Additional data as JSON
 * @param {string} [activityData.status='success'] - Activity status
 */
export const logActivity = async (activityData) => {
  try {
    const {
      userId,
      type,
      category,
      title,
      description = null,
      clientName = null,
      clientEmail = null,
      metadata = null,
      status = 'success'
    } = activityData;

    // Validate required fields
    if (!userId || !type || !category || !title) {
      console.error('Missing required fields for activity logging:', { userId, type, category, title });
      return { success: false, error: 'Missing required fields' };
    }

    const { error } = await supabase
      .from('activity_log')
      .insert({
        user_id: userId,
        activity_type: type,
        activity_category: category,
        title,
        description,
        client_name: clientName,
        client_email: clientEmail,
        metadata,
        status,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Activity logging error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Get recent activities for a user
 * @param {string} userId - Clerk user ID
 * @param {number} [limit=20] - Number of activities to fetch
 * @param {string} [category] - Filter by activity category
 * @returns {Promise<Object>} Activities data or error
 */
export const getRecentActivities = async (userId, limit = 20, category = null) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    let query = supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('activity_category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch activities:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Error fetching activities:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Activity type constants for consistency
 */
export const ACTIVITY_TYPES = {
  // Client operations
  CLIENT_ADDED: 'client_added',
  CLIENT_UPDATED: 'client_updated',
  CLIENT_DELETED: 'client_deleted',
  CLIENT_STATUS_CHANGED: 'client_status_changed',
  
  // Email operations
  EMAIL_SENT: 'email_sent',
  EMAIL_FAILED: 'email_failed',
  DOCUMENT_REQUEST_SENT: 'document_request_sent',
  
  // File operations
  FILE_UPLOADED: 'file_uploaded',
  FILE_SENT: 'file_sent',
  FILE_DELETED: 'file_deleted',
  UPLOAD_LINK_GENERATED: 'upload_link_generated',
  
  // System operations
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  SYSTEM_ERROR: 'system_error'
};

/**
 * Activity category constants
 */
export const ACTIVITY_CATEGORIES = {
  CLIENT: 'client',
  EMAIL: 'email',
  FILE: 'file',
  SYSTEM: 'system'
};

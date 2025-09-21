import { getRecentActivities } from '../utils/activityLogger.js';

/**
 * GET /getActivities/:userId
 * Fetch recent activities for a user
 */
export async function getActivities(req, res) {
  try {
    const { userId } = req.params;
    const { limit = 20, category } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const result = await getRecentActivities(
      userId, 
      parseInt(limit), 
      category || null
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      data: {
        activities: result.data,
        count: result.data.length
      }
    });

  } catch (error) {
    console.error('Error in getActivities:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

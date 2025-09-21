import { supabase } from "../controllers/supabaseClient.js";
import { logActivity, ACTIVITY_TYPES, ACTIVITY_CATEGORIES } from '../utils/activityLogger.js';

export async function deleteClient(req, res) {
  try {
    const { id, userId } = req.body; 

    if (!id) {
      return res.status(400).json({ error: "Client id is required" });
    }

    // First get client details before deleting
    const { data: clientData, error: fetchError } = await supabase
      .from("clients")
      .select("client_name, client_email")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching client:", fetchError);
      return res.status(500).json({ error: "Client not found" });
    }

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting client:", error);
      return res.status(500).json({ error: error.message });
    }

    // Log activity
    await logActivity({
      userId,
      type: ACTIVITY_TYPES.CLIENT_DELETED,
      category: ACTIVITY_CATEGORIES.CLIENT,
      title: `Client "${clientData.client_name}" deleted`,
      description: `Deleted client with email ${clientData.client_email}`,
      clientName: clientData.client_name,
      clientEmail: clientData.client_email,
      metadata: {
        deletedAt: new Date().toISOString()
      }
    });

    return res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

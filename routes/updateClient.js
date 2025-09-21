import { supabase } from "../controllers/supabaseClient.js";

export async function updateClient(req, res) {
  try {
    const { 
      id, 
      client_name, 
      client_email, 
      contact_person, 
      phone, 
      address, 
      status, 
      is_accountancy_firm 
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Client ID is required" });
    }

    if (!client_name || !client_email) {
      return res.status(400).json({ error: "Client name and email are required" });
    }

    // Build update object with only provided fields
    const updateData = {
      client_name: client_name.trim(),
      client_email: client_email.trim(),
      updated_at: new Date().toISOString()
    };

    // Add optional fields if provided
    if (contact_person !== undefined) updateData.contact_person = contact_person;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (status !== undefined) updateData.status = status;
    if (is_accountancy_firm !== undefined) updateData.is_accountancy_firm = is_accountancy_firm;

    const { data, error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating client:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ message: "Client updated successfully", client: data });
  } catch (error) {
    console.error("Error in updateClient:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

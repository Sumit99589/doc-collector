import { supabase } from "../controllers/supabaseClient.js";

export async function deleteClient(req, res) {
  try {
    const { id } = req.body; 

    if (!id) {
      return res.status(400).json({ error: "Client id is required" });
    }

    const { data, error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ clients: data });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

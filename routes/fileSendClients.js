import { supabase } from "../controllers/supabaseClient.js";

// Get all file send clients for a user
export async function getFileSendClients(req, res) {
    const { userId } = req.params;
    
    try {
        const { data, error } = await supabase
            .from("file_send_clients")
            .select("*")
            .eq("clerk_id", userId);

        if (error) {
            console.error("Error fetching file send clients:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.json({ clients: data || [] });
    } catch (error) {
        console.error("Error in getFileSendClients:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// Add a new file send client
export async function addFileSendClient(req, res) {
    const { client_name, company_name, client_email, phone_number, status, userId } = req.body;

    if (!client_name || !company_name || !client_email || !phone_number || !userId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const { data, error } = await supabase
            .from("file_send_clients")
            .insert([
                {
                    client_name,
                    company_name,
                    client_email,
                    phone_number,
                    status: status || 'pending',
                    clerk_id: userId,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            console.error("Error adding file send client:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.json({ client: data });
    } catch (error) {
        console.error("Error in addFileSendClient:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// Update a file send client
export async function updateFileSendClient(req, res) {
    const { id, client_name, company_name, client_email, phone_number, status } = req.body;

    if (!id || !client_name || !company_name || !client_email || !phone_number) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const { data, error } = await supabase
            .from("file_send_clients")
            .update({
                client_name,
                company_name,
                client_email,
                phone_number,
                status,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating file send client:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.json({ client: data });
    } catch (error) {
        console.error("Error in updateFileSendClient:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

// Delete a file send client
export async function deleteFileSendClient(req, res) {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: "Client ID is required" });
    }

    try {
        const { error } = await supabase
            .from("file_send_clients")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting file send client:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.json({ message: "Client deleted successfully" });
    } catch (error) {
        console.error("Error in deleteFileSendClient:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

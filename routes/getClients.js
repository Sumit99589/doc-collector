import {supabase} from "../controllers/supabaseClient.js"


export async function getClients(req, res){
    const {userId} = req.params
    const {data, error} = await supabase
    .from("clients")
    .select("*")
    .eq("clerk_id", userId);

    console.log(userId)
    console.log("the returend data is ")
    console.log(data)

    if (error) {
        return res.json({ error: error.message }, { status: 500 });
    }

    return res.json({ clients: data });
}
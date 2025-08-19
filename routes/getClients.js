import {supabase} from "../controllers/supabaseClient.js"


export async function getClients(req, res){
    const {data, error} = await supabase
    .from("clients")
    .select("*");

    console.log(data)

    if (error) {
        return res.json({ error: error.message }, { status: 500 });
    }

    return res.json({ clients: data });
}
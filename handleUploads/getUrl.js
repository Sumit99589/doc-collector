import { supabase } from "../controllers/supabaseClient";

export async function getUrl(filePath){
    const {data, error} = await supabase
    .storage
    .from(process.env.SUPABASE_BUCKET)
    .getPublicUrl(filePath);

    if(error){
        console.error("Upload error:", error.message);
        throw error;
    }

    return data.publicUrl
}
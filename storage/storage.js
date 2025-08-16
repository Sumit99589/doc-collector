import {supabase} from "../controllers/supabaseClient.js"

export async function uploadFile(filepath, fileContent, contentType){
    const {data, error} = supabase
    .storage
    .from(process.env.SUPABASE_BUCKET)
    .upload(filepath, fileContent, {
        contentType,
        upsert: false
    })

    if(error){
        console.error("Upload error:", error.message);
        throw error;
    }

    return data.path;
}
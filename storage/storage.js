import {supabase} from "../controllers/supabaseClient.js"

export async function uploadFile(filepath, fileContent, contentType){
    const {data, error} =await supabase
    .storage
    .from(process.env.SUPABASE_BUCKET)
    .upload(filepath, fileContent, {
        contentType,
        upsert: false
    })

    if(error){
        console.log("Upload result:", data, error);
        console.error("Upload error:", error.message);
        throw new Error(error.message);
    }

    return data.path;
}
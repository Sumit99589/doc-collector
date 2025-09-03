import generateEmail from "./emailGenerator.js";
import express from "express";
import sgMail from "@sendgrid/mail";
import {supabase} from "./supabaseClient.js"
import { generateUploadLink } from '../routes/generateUploadLink.js';

import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);


export async function addClient(req, res) {
    const clientName = req.body.client_name;
    const email = req.body.client_email
    const  userId = req.body.userId

    if (!clientName || !email) {
        return res.status(400).json({ error: "clientName and email are required" });
    }

    const { data, error } = await supabase
        .from('clients')
        .insert([{ client_name: clientName.trim(), client_email: email.trim(),clerk_id:userId }])
        .select();

    if (error) {
        console.error("Supabase insert error:", error); 
        if (error.code === "23505") {
            return res.status(409).json({ error: "Client with this name already exists" });
        }
        return res.status(500).json({ error: error.message || "Failed to add client" });
    }

    res.status(201).json({ message: "Client added successfully", data });
}



async function getEmailByCompanyName(companyName) {
  const { data, error } = await supabase
    .from("clients")
    .select("client_email")
    .eq("client_name", companyName)
    .limit(1) // only need one
    .single(); // returns an object instead of array

    console.log(data.client_email)

  if (error) {
    console.error("Error fetching email:", error);
    return null;
  }

  return data.client_email; // returns the email string
}


/**
 * Convert a due date to expiration format
 * @param {string|Date} dueDate - The due date
 * @returns {string} Expiration format (e.g., "7d")
 */
function convertDueDateToExpiresIn(dueDate) {
    const today = new Date();
    const target = new Date(dueDate);
    
    // Reset time to midnight for accurate day calculation
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    
    // Calculate difference in milliseconds
    const diffTime = target.getTime() - today.getTime();
    
    // Convert to days (minimum 1 day)
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    return `${diffDays}d`;
}

export async function sendReq(req, res) {
    try {
        const { categoryId, clientName, period, dueDate, docs, userId } = req.body;

        // Convert dueDate to expiresIn format
        const expiresIn = convertDueDateToExpiresIn(dueDate);
        console.log(`Due date: ${dueDate}, Expires in: ${expiresIn}`);

        // Generate upload link
        const result = await generateUploadLink({
            clientName: clientName,
            sections: docs,
            expiresIn: expiresIn, // Use converted format
            generatedBy: "Admin",
            userId:userId
        });

        let uploadUrl = null;

        if (result.success) {
            console.log("Upload URL:", result.data.uploadUrl);
            uploadUrl = result.data.uploadUrl;
        } else {
            console.error("Upload link generation error:", result.error);
            return res.status(500).json({ 
                error: "Failed to generate upload link", 
                details: result.error 
            });
        }

        // Generate email content with the upload URL
        const { subject, body } = generateEmail({ 
            categoryId, 
            clientName, 
            period, 
            dueDate, 
            uploadUrl, 
            docs 
        });
        
        // Get recipient email
        const to = await getEmailByCompanyName(clientName);
        
        if (!to) {
            return res.status(404).json({ 
                error: "Client email not found" 
            });
        }

        const {data, error} = await supabase
        .from("users")
        .select("name")
        .eq("clerk_id", userId)
        .single()

        // console.log(data.email)

        // Prepare email message
        const msg = {
            to,
            from: {
                email: process.env.FROM_EMAIL, // must be a verified sender
                // in name put the name of the user
                name: data.name
            },
            subject,
            text: body
        };

        // Send email
        await sgMail.send(msg);
        console.log(`Email sent to ${to}`);

        try{
          await supabase
            .from("clients")
            .update({
                  status: "pending",
                })
            .eq("client_name", clientName)
            }catch(error){
              console.log("error in changing the status :", error);
            }
        
        // Return success response with additional data
        res.json({ 
            status: "ok",
            data: {
                emailSent: true,
                recipient: to,
                uploadUrl: uploadUrl,
                expiresAt: result.data?.expiresAt,
                dueDate: dueDate,
                expiresIn: expiresIn
            }
        });

    } catch (error) {
        console.error("Email sending failed:", error.response?.body || error);
        res.status(500).json({ 
            error: "Failed to send email",
            details: error.message 
        });
    }
}

export default router;

import generateEmail from "./emailGenerator.js";
import express from "express";
import sgMail from "@sendgrid/mail";
import { createClient } from '@supabase/supabase-js'

import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const router = express.Router();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);


export async function addClient(req, res) {
    const { clientName, email } = req.body;

    if (!clientName || !email) {
        return res.status(400).json({ error: "clientName and email are required" });
    }

    const { data, error } = await supabase
        .from('clients')
        .insert([{ company: clientName.trim(), email: email.trim() }])
        .select();

    if (error) {
        console.error("Supabase insert error:", error); // 👈 log the full error
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
    .select("email")
    .eq("company", companyName)
    .limit(1) // only need one
    .single(); // returns an object instead of array

  if (error) {
    console.error("Error fetching email:", error);
    return null;
  }

  return data.email; // returns the email string
}


export async function sendReq(req, res) {
    const { categoryId, clientName, period, dueDate } = req.body;
    const uploadLink = "hello.com";

    const { subject, body } = generateEmail({ categoryId, clientName, period, dueDate, uploadLink });
    const to = await getEmailByCompanyName(clientName);

    const msg = {
        to,
        from: process.env.FROM_EMAIL,
        subject,
        text: body
    };

    try {
        await sgMail.send(msg);
        console.log(` Email sent to ${to}`);
        res.json({ status: "ok" });
    } catch (error) {
        console.error(" Email failed:", error.response?.body || error);
        res.status(500).json({ error: "Failed to send email" });
    }
}

export default router;

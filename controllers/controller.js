import generateEmail from "./emailGenerator.js";
import express from "express";
import sgMail from "@sendgrid/mail";

import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const clients = new Map();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export function addClient(req, res) {
    const { clientName, email, contact } = req.body;

    if (!clientName || !email || !contact) {
        return res.status(400).json({ error: "clientName, email, and contact are required" });
    }

    if (clients.has(clientName)) {
        return res.status(409).json({ error: "Client with this name already exists" });
    }

    const client = { clientName, email, contact };
    clients.set(clientName, client);

    res.status(201).json({ message: "Client added successfully", client });
}

export async function sendReq(req, res) {
    const { categoryId, clientName, period, dueDate } = req.body;
    const uploadLink = "hello.com";

    if (!clients.has(clientName)) {
        return res.status(404).json({ error: "Client not found." });
    }

    const { subject, body } = generateEmail({ categoryId, clientName, period, dueDate, uploadLink });
    const to = clients.get(clientName).email;

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

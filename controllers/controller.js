import generateEmail from "./emailGenerator.js"
import express from "express";

const router = express.Router();

const clients = new Map();

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

function checkClient(name) {
    for (const [key, value] of clients) {
        if (value["clientName"] === name) {
            console.log(name)
            return true;
        }
    }
    console.log(name);
    return false;
}

export function sendReq(req, res){
    const { categoryId, clientName, period, dueDate} = req.body;
    const uploadLink ="hello.com"
    if(checkClient(clientName)){
        const email = generateEmail({ categoryId, clientName, period, dueDate, uploadLink });
        console.log(email);
        res.send({"status": "ok"})
    }else{
        return res.status(409).json({ error: "client not found." });
    }
    
}



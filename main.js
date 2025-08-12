import express from "express";
import {addClient, sendReq} from "./controllers/controller.js";
const app = express();
const PORT = 3000;

// Middleware should come before routes
app.use(express.json());


// Define routes properly
app.post("/add-client", addClient);
app.post("/sendReq", sendReq);

app.listen(PORT, () => {
    console.log(`Backend is live on port ${PORT}`);
});

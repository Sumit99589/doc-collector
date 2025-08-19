import express from "express";
import {addClient, sendReq} from "./controllers/controller.js";
import { getClients } from "./routes/getClients.js";
import cors from "cors";

const app = express();
const PORT = 3000;


app.use(cors());


// Middleware should come before routes
app.use(express.json());


// Define routes properly
app.post("/add-client", addClient);
app.post("/sendReq", sendReq);

app.get("/getClients", getClients);


app.listen(PORT, () => {
    console.log(`Backend is live on port ${PORT}`);
});

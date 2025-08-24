import express from "express";
import {addClient, sendReq} from "./controllers/controller.js";
import { getClients } from "./routes/getClients.js";
import cors from "cors";

const app = express();
const PORT = 3000;


app.use(cors());


// Middleware should come before routes
app.use(express.json());

import validateTokenRoutes from './routes/validateToken.js';
import uploadDocumentsRoutes from './routes/uploadDocuments.js';

// app.use(helmet({
//   crossOriginEmbedderPolicy: false, // Needed for file uploads
//   crossOriginResourcePolicy: { policy: "cross-origin" }
// }));

// CORS configuration for file uploads
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Upload-Token'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

app.use('/api', validateTokenRoutes);
app.use('/api', uploadDocumentsRoutes);

// Define routes properly
app.post("/add-client", addClient);
app.post("/sendReq", sendReq);

app.get("/getClients", getClients);


app.listen(PORT, () => {
    console.log(`Backend is live on port ${PORT}`);
});

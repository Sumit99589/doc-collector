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
import registerUser from './routes/register-user.js';
import { getFileSendClients, addFileSendClient, updateFileSendClient, deleteFileSendClient } from './routes/fileSendClients.js';
import { sendFiles, uploadMiddleware } from './routes/sendFiles.js';

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
app.use('/',registerUser);

// Define routes properly
app.post("/add-client", addClient);
app.post("/sendReq", sendReq);

app.get("/getClients/:userId", getClients);

// File send clients routes
app.get("/getFileSendClients/:userId", getFileSendClients);
app.post("/addFileSendClient", addFileSendClient);
app.post("/updateFileSendClient", updateFileSendClient);
app.post("/deleteFileSendClient", deleteFileSendClient);

// Send files route with file upload middleware
app.post("/sendFiles", uploadMiddleware, sendFiles);


app.listen(PORT, () => {
    console.log(`Backend is live on port ${PORT}`);
});

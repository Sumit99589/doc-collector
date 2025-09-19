import multer from 'multer';
import { sendFilesViaEmail } from '../controllers/fileEmailService.js';

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types for now, you can restrict this if needed
        cb(null, true);
    }
});

// Send files to client
export async function sendFiles(req, res) {
    try {
        const { clientId, clientEmail, clientName } = req.body;
        const files = req.files;

        if (!clientId || !clientEmail || !clientName) {
            return res.status(400).json({ error: "Missing required client information" });
        }

        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No files provided" });
        }

        // Check file size limits
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const maxSize = 25 * 1024 * 1024; // 25MB total limit
        
        if (totalSize > maxSize) {
            return res.status(400).json({ error: "Total file size exceeds 25MB limit" });
        }

        // Send email with files
        const result = await sendFilesViaEmail({
            clientEmail,
            clientName,
            files,
            subject: `Files from FlashDoc - ${new Date().toLocaleDateString()}`,
            message: `Please find the attached files below. These documents have been shared with you securely.`
        });

        if (result.success) {
            return res.json({ 
                success: true, 
                message: "Files sent successfully",
                messageId: result.messageId 
            });
        } else {
            return res.status(500).json({ error: "Failed to send files" });
        }

    } catch (error) {
        console.error("Error in sendFiles:", error);
        return res.status(500).json({ error: error.message });
    }
}

// Middleware for handling file uploads
export const uploadMiddleware = upload.array('files', 10); // Allow up to 10 files

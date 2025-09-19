import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
dotenv.config();

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Send files via email
export async function sendFilesViaEmail({ clientEmail, clientName, files, subject, message }) {
    try {
        // Prepare attachments for SendGrid
        const attachments = files.map(file => ({
            filename: file.originalname,
            content: file.buffer.toString('base64'),
            type: file.mimetype,
            disposition: 'attachment'
        }));

        const msg = {
            to: clientEmail,
            from: {
                email: process.env.FROM_EMAIL, // must be a verified sender
                name: 'FlashDoc Team'
            },
            subject: subject || `Files from FlashDoc - ${new Date().toLocaleDateString()}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">FlashDoc</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Professional Document Management</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333; margin-bottom: 20px;">Hello ${clientName},</h2>
                        
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                            ${message || 'Please find the attached files below. These documents have been shared with you securely.'}
                        </p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">📎 Attached Files</h3>
                            <ul style="color: #666; margin: 0; padding-left: 20px;">
                                ${files.map(file => `<li style="margin-bottom: 5px;">${file.originalname}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #1976d2; margin: 0 0 10px 0; font-size: 16px;">🔒 Security Notice</h3>
                            <p style="color: #666; margin: 0; font-size: 14px; line-height: 1.5;">
                                These files are shared securely. Please do not forward this email to unauthorized recipients.
                            </p>
                        </div>
                        
                        <p style="color: #666; line-height: 1.6; margin-top: 30px;">
                            If you have any questions or need assistance, please don't hesitate to contact us.
                        </p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                            <p style="color: #999; font-size: 14px; margin: 0;">
                                Best regards,<br>
                                <strong>FlashDoc Team</strong>
                            </p>
                        </div>
                    </div>
                </div>
            `,
            attachments
        };

        const result = await sgMail.send(msg);
        console.log('Email sent successfully:', result[0].headers['x-message-id']);
        return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}

// Send files with custom message
export async function sendFilesWithMessage({ clientEmail, clientName, files, customMessage, subject }) {
    return await sendFilesViaEmail({
        clientEmail,
        clientName,
        files,
        subject,
        message: customMessage
    });
}

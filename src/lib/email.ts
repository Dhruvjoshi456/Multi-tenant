import nodemailer from 'nodemailer';

// Email configuration
const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'your-email@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password'
    }
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

export interface InvitationEmailData {
    to: string;
    firstName: string;
    lastName: string;
    companyName: string;
    invitationLink: string;
    invitedBy: string;
}

export async function sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    try {
        // Check if SMTP is configured
        const isSMTPConfigured = process.env.SMTP_USER && process.env.SMTP_PASS &&
            process.env.SMTP_USER !== 'your-email@gmail.com' &&
            process.env.SMTP_PASS !== 'your-app-password';

        // For development without SMTP, just log the email
        if (process.env.NODE_ENV === 'development' && !isSMTPConfigured) {
            console.log('📧 INVITATION EMAIL (Development Mode - No SMTP configured)');
            console.log('==========================================================');
            console.log(`To: ${data.to}`);
            console.log(`Subject: You're invited to join ${data.companyName}`);
            console.log(`Invitation Link: ${data.invitationLink}`);
            console.log(`Invited by: ${data.invitedBy}`);
            console.log('==========================================================');
            console.log('💡 To send real emails, configure SMTP settings in .env.local');
            return true;
        }

        // For production, send actual email
        const mailOptions = {
            from: `"${data.companyName}" <${emailConfig.auth.user}>`,
            to: data.to,
            subject: `You're invited to join ${data.companyName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Join ${data.companyName} on Multi-Tenant Notes</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333; margin-top: 0;">Hello ${data.firstName}!</h2>
                        
                        <p style="color: #666; line-height: 1.6; font-size: 16px;">
                            <strong>${data.invitedBy}</strong> has invited you to join <strong>${data.companyName}</strong> 
                            on our collaborative notes platform.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${data.invitationLink}" 
                               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                      color: white; 
                                      padding: 15px 30px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;">
                                Accept Invitation
                            </a>
                        </div>
                        
                        <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #495057; margin-top: 0; font-size: 18px;">What you'll get:</h3>
                            <ul style="color: #666; line-height: 1.8;">
                                <li>📝 Create and organize notes with your team</li>
                                <li>🏷️ Use tags and categories for better organization</li>
                                <li>🔍 Advanced search and filtering capabilities</li>
                                <li>👥 Collaborate with team members</li>
                                <li>📱 Access from anywhere, anytime</li>
                            </ul>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; margin-bottom: 0;">
                            This invitation will expire in 7 days. If you didn't expect this invitation, 
                            you can safely ignore this email.
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Invitation email sent:', result.messageId);
        return true;

    } catch (error) {
        console.error('Failed to send invitation email:', error);
        return false;
    }
}

export async function sendWelcomeEmail(data: {
    to: string;
    firstName: string;
    companyName: string;
}): Promise<boolean> {
    try {
        // Check if SMTP is configured
        const isSMTPConfigured = process.env.SMTP_USER && process.env.SMTP_PASS &&
            process.env.SMTP_USER !== 'your-email@gmail.com' &&
            process.env.SMTP_PASS !== 'your-app-password';

        // For development without SMTP, just log the email
        if (process.env.NODE_ENV === 'development' && !isSMTPConfigured) {
            console.log('📧 WELCOME EMAIL (Development Mode - No SMTP configured)');
            console.log('=======================================================');
            console.log(`To: ${data.to}`);
            console.log(`Subject: Welcome to ${data.companyName}!`);
            console.log('=======================================================');
            console.log('💡 To send real emails, configure SMTP settings in .env.local');
            return true;
        }

        const mailOptions = {
            from: `"${data.companyName}" <${emailConfig.auth.user}>`,
            to: data.to,
            subject: `Welcome to ${data.companyName}!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome Aboard!</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">You're now part of ${data.companyName}</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333; margin-top: 0;">Hello ${data.firstName}!</h2>
                        
                        <p style="color: #666; line-height: 1.6; font-size: 16px;">
                            Welcome to <strong>${data.companyName}</strong>! You've successfully joined our 
                            collaborative notes platform.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
                               style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                                      color: white; 
                                      padding: 15px 30px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;">
                                Get Started
                            </a>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; margin-bottom: 0;">
                            You can now start creating notes, collaborating with your team, and organizing your work!
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent:', result.messageId);
        return true;

    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return false;
    }
}

import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'Gmail', // Use your email service
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    private resolveFrontendBaseUrl(): string {
        const raw = String(process.env.FRONTEND_URL || 'http://localhost:3000').trim();
        // Local dev usually runs without SSL; avoid broken https://localhost links.
        if (raw.startsWith('https://localhost') || raw.startsWith('https://127.0.0.1')) {
            return raw.replace(/^https:/, 'http:');
        }
        return raw;
    }

    async sendVerificationEmail(email: string, verificationToken: string, name: string): Promise<void> {
        const verificationUrl = `${this.resolveFrontendBaseUrl()}/auth/verify?token=${verificationToken}`;
        
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Verify Your Email Address',
            text: `Hello ${name},\n\nPlease verify your email address by clicking the "Verify Email Address" button in this email.\n\nIf the button does not open, copy the button link location directly from your mail client and open it in your browser.`,
            html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background: #ffffff;">
                <div style="background: linear-gradient(90deg, #2563eb 0%, #4f46e5 100%); padding: 20px 24px;">
                    <h2 style="margin: 0; color: #fff; font-size: 22px; font-weight: 700; text-align: center;">Verify Your Email Address</h2>
                </div>
                <div style="padding: 24px;">
                <p style="color: #374151; font-size: 16px; margin-top: 0;">
                    Hello ${name},
                </p>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Thank you for registering! Please verify your email address by clicking the button below:
                </p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="${verificationUrl}" 
                       style="background: linear-gradient(90deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; padding: 13px 30px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: 700; letter-spacing: 0.2px;">
                        Verify Email Address
                    </a>
                </div>
                <div style="margin: 14px 0 0; padding: 12px 14px; border-radius: 10px; background: #f8fafc; border: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                        For your security, we do not display raw verification URLs in this email.
                    </p>
                </div>
                <p style="color: #4b5563; font-size: 15px; margin-top: 18px;">
                    If you did not create an account, please ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 22px 0 14px;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                    This link will expire in 24 hours.
                </p>
                </div>
            </div>
        `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Verification email sent to ${email}`);
        } catch (error) {
            console.error('Error sending verification email:', error);
            throw new Error('Failed to send verification email');
        }
    }

    async sendResetPasswordEmail(email: string, resetToken: string, name: string): Promise<void> {
        const resetUrl = `${this.resolveFrontendBaseUrl()}/auth/reset-password?token=${resetToken}`;
        
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Reset Your Password',
            text: `Hello ${name},\n\nPlease reset your password by clicking the "Reset Password" button in this email.`,
            html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background: #ffffff;">
                <div style="background: linear-gradient(90deg, #dc2626 0%, #ea580c 100%); padding: 20px 24px;">
                    <h2 style="margin: 0; color: #fff; font-size: 22px; font-weight: 700; text-align: center;">Reset Your Password</h2>
                </div>
                <div style="padding: 24px;">
                <p style="color: #374151; font-size: 16px; margin-top: 0;">
                    Hello ${name},
                </p>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    We received a request to reset your password. Click the button below to create a new password:
                </p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="${resetUrl}" 
                       style="background: linear-gradient(90deg, #dc2626 0%, #ea580c 100%); color: #ffffff; padding: 13px 30px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: 700; letter-spacing: 0.2px;">
                        Reset Password
                    </a>
                </div>
                <div style="margin: 14px 0 0; padding: 12px 14px; border-radius: 10px; background: #f8fafc; border: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                        For your security, we do not display raw reset URLs in this email.
                    </p>
                </div>
                <p style="color: #4b5563; font-size: 15px; margin-top: 18px;">
                    If you did not request a password reset, please ignore this email. Your password will remain unchanged.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 22px 0 14px;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                    This link will expire in 1 hour. For security reasons, please do not share this link with anyone.
                </p>
                </div>
            </div>
        `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Reset password email sent to ${email}`);
        } catch (error) {
            console.error('Error sending reset password email:', error);
            throw new Error('Failed to send reset password email');
        }
    }

    /**
     * Send credentials when an admin creates a user account (temporary or chosen password).
     */
    async sendTemporaryPasswordEmail(
        email: string,
        name: string,
        username: string,
        plainPassword: string,
    ): Promise<void> {
        const loginUrl = `${this.resolveFrontendBaseUrl()}/auth/jwt/sign-in`;

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Your AI Nexus account credentials',
            text: `Hello ${name},\n\nAn administrator created an account for you.\n\nUsername: ${username}\nTemporary password: ${plainPassword}\n\nSign in: ${loginUrl}\n\nPlease change your password after first login.\n`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; padding: 20px; background-color: #f9f9f9;">
                <h2 style="color: #333; text-align: center;">Your account is ready</h2>
                <p style="color: #555; font-size: 16px;">Hello ${name},</p>
                <p style="color: #555; font-size: 16px;">An administrator created an account for you. Use the credentials below to sign in:</p>
                <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 8px 0;"><strong>Username:</strong> ${username}</p>
                    <p style="margin: 8px 0;"><strong>Temporary password:</strong> <code style="font-size: 15px; background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${plainPassword}</code></p>
                </div>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="${loginUrl}" style="background-color: #2d89ef; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Sign in</a>
                </div>
                <p style="color: #777; font-size: 14px;">For security, please change your password after your first login.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">If you did not expect this email, contact support.</p>
            </div>
        `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Temporary password email sent to ${email}`);
        } catch (error) {
            console.error('Error sending temporary password email:', error);
            throw new Error('Failed to send temporary password email');
        }
    }

}

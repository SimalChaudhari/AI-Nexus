import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import {
    buildBrandTemplate,
    buildCredentialsBodyHtml,
    buildForumReplyBodyHtml,
    buildOrderReceiptBodyHtml,
    escapeHtml,
} from './email-template.util';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {

        //  const host = '192.168.6.4'; //process.env.SMTP_HOST;
        // const port = 25; //process.env.SMTP_PORT;
        // const secure = false; //process.env.SMTP_SECURE;
        // const user = process.env.FROM_EMAIL;
        // const pass = ""; //process.env.SMTP_PASS;

        // const transportOptions: nodemailer.TransportOptions = {
        //     host,
        //     port,
        //     secure,
        // } as nodemailer.TransportOptions;

        // if (user && pass) {
        //     (transportOptions as any).auth = { user, pass };
        // }

        // this.transporter = nodemailer.createTransport(transportOptions);
        this.transporter = nodemailer.createTransport({
            service: 'Gmail', // Use your email service
            auth: {
              user: process.env.FROM_EMAIL,
              pass: process.env.SMTP_PASS,
            },
          });

    
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
        const html = buildBrandTemplate(this.resolveFrontendBaseUrl(), {
            heading: 'Verify Your Email Address',
            greetingName: name,
            intro: 'Thank you for registering with AI Nexus. Please verify your email address to activate your account and continue securely.',
            ctaLabel: 'Verify Email Address',
            ctaUrl: verificationUrl,
            note: 'For your security, this verification link expires in 24 hours.',
            footer: 'AI Nexus account verification',
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Verify Your Email Address',
            text: `Hello ${name},\n\nPlease verify your email address by clicking the "Verify Email Address" button in this email.\n\nIf the button does not open, copy the button link location directly from your mail client and open it in your browser.`,
            html,
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
        const html = buildBrandTemplate(this.resolveFrontendBaseUrl(), {
            heading: 'Reset Your Password',
            greetingName: name,
            intro: 'We received a request to reset your AI Nexus password. Use the secure button below to create a new password.',
            ctaLabel: 'Reset Password',
            ctaUrl: resetUrl,
            note: 'This password reset link expires in 1 hour. Do not share this email with anyone.',
            footer: 'AI Nexus password reset',
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Reset Your Password',
            text: `Hello ${name},\n\nPlease reset your password by clicking the "Reset Password" button in this email.`,
            html,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Reset password email sent to ${email}`);
        } catch (error) {
            console.error('Error sending reset password email:', error);
            throw new Error('Failed to send reset password email');
        }
    }

    async sendStudentVerificationPinEmail(email: string, pin: string, schoolName: string): Promise<void> {
        const safePin = escapeHtml(String(pin || '').trim());
        const bodyHtml = `
            <div style="margin-top:18px; background:#ffffff; border:1px solid #d6e0ee; border-radius:12px; overflow:hidden;">
                <div style="background:#D8E4F3; color:#1C4270; padding:10px 14px; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                    Student Verification PIN
                </div>
                <div style="padding:18px 14px;">
                    <p style="margin:0 0 12px; color:#475569; font-size:14px; line-height:1.6;">
                        Use the following verification PIN in the AI Nexus membership eligibility dialog to continue your student verification.
                    </p>
                    <div style="display:inline-block; background:#fff6f5; border:1px solid #f3c2bf; color:#E32B24; padding:10px 14px; border-radius:10px; font-family:Consolas, 'Courier New', monospace; font-size:22px; font-weight:700; letter-spacing:0.18em;">
                        ${safePin}
                    </div>
                </div>
            </div>
        `;

        const html = buildBrandTemplate(this.resolveFrontendBaseUrl(), {
            heading: 'Your Student Verification PIN',
            greetingName: schoolName || 'Student',
            intro: 'A student membership verification request was started for your school email address.',
            bodyHtml,
            note: 'This PIN expires in 10 minutes. Do not share it with anyone.',
            footer: 'AI Nexus student verification',
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Your AI Nexus student verification PIN',
            text: `Hello ${schoolName || 'Student'},\n\nYour AI Nexus student verification PIN is: ${pin}\n\nThis PIN expires in 10 minutes.\n`,
            html,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Student verification PIN email sent to ${email}`);
        } catch (error) {
            console.error('Error sending student verification PIN email:', error);
            throw new Error('Failed to send student verification PIN email');
        }
    }

    async sendFeeWaiverHrVerificationEmail(params: {
        hrEmail: string;
        learnerEmail: string;
        learnerName: string;
        verificationToken: string;
    }): Promise<void> {
        const hrEmail = String(params.hrEmail || '').trim();
        const learnerEmail = String(params.learnerEmail || '').trim();
        const learnerName = String(params.learnerName || 'Learner').trim() || 'Learner';
        const safeLearnerName = escapeHtml(learnerName);
        const verificationUrl = `${this.resolveFrontendBaseUrl()}/auth/fee-waiver-audit/hr-verify?token=${encodeURIComponent(params.verificationToken)}`;

        const bodyHtml = `
            <p style="margin:0 0 12px; color:#334155; line-height:1.6;">
                ${safeLearnerName} has applied for ISCA AI Fluency Programme – designed for Accounting and Finance professionals.
            </p>
            <p style="margin:0 0 12px; color:#334155; line-height:1.6;">
                As part of IMDA's and audit purposes, we will need your assistance to verify that ${safeLearnerName} is currently working in an accounting and finance related job role.
            </p>
            <p style="margin:0; color:#334155; line-height:1.6;">
                Please click the button below to complete the verification.
            </p>
        `;

        const html = buildBrandTemplate(this.resolveFrontendBaseUrl(), {
            heading: 'ISCA AI Fluency Programme – Job function verification',
            greetingName: `HR of ${safeLearnerName}`,
            intro: '',
            bodyHtml,
            ctaLabel: 'Verify that the mentioned learner is working in an accounting and finance related job role',
            ctaUrl: verificationUrl,
            note: 'This verification link does not expire. You may use it at any time to complete verification.',
            footer: 'ISCA AI Fluency Programme',
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: hrEmail,
            subject: 'ISCA AI Fluency Programme – Job function verification',
            text: `Dear HR of ${learnerName},\n\n${learnerName} has applied for ISCA AI Fluency Programme – designed for Accounting and Finance professionals.\n\nAs part of IMDA's and audit purposes, we will need your assistance to verify that ${learnerName} is currently working in an accounting and finance related job role. Please open the verification link in this email to complete the verification.\n\n${verificationUrl}`,
            html,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Fee waiver HR verification email sent to ${hrEmail}`);
        } catch (error) {
            console.error('Error sending fee waiver HR verification email:', error);
            throw new Error('Failed to send HR verification email');
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
        const signInPath = String(process.env.EMAIL_SIGNIN_PATH || '/auth/sign-in').trim();
        const normalizedPath = signInPath.startsWith('/') ? signInPath : `/${signInPath}`;
        const loginUrl = `${this.resolveFrontendBaseUrl()}${normalizedPath}`;
        const bodyHtml = buildCredentialsBodyHtml(username, plainPassword);
        const html = buildBrandTemplate(this.resolveFrontendBaseUrl(), {
            heading: 'Your Account Is Ready',
            greetingName: name,
            intro: 'An administrator created your AI Nexus account. Please use the credentials below to sign in.',
            bodyHtml,
            ctaLabel: 'Sign In',
            ctaUrl: loginUrl,
            note: 'For security, change your password after your first login.',
            footer: 'AI Nexus account credentials',
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Your AI Nexus account credentials',
            text: `Hello ${name},\n\nAn administrator created an account for you.\n\nUsername: ${username}\nTemporary password: ${plainPassword}\n\nSign in: ${loginUrl}\n\nPlease change your password after first login.\n`,
            html,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Temporary password email sent to ${email}`);
        } catch (error) {
            console.error('Error sending temporary password email:', error);
            throw new Error('Failed to send temporary password email');
        }
    }

    async sendForumReplyNotificationEmail(params: {
        toEmail: string;
        threadStarterName: string;
        replierName: string;
        postTitle: string;
        replyContent: string;
        postId: string;
    }): Promise<void> {
        const { toEmail, threadStarterName, replierName, postTitle, replyContent, postId } = params;
        const postUrl = `${this.resolveFrontendBaseUrl()}/ai-forum/${postId}`;
        const trimmedReply = String(replyContent || '').replace(/\s+/g, ' ').trim();
        const replyPreview = trimmedReply.length > 220 ? `${trimmedReply.slice(0, 217)}...` : trimmedReply;
        const bodyHtml = buildForumReplyBodyHtml(postTitle, replierName, replyPreview);
        const html = buildBrandTemplate(this.resolveFrontendBaseUrl(), {
            heading: 'New Reply on Your Forum Thread',
            greetingName: threadStarterName,
            intro: 'You have received a new reply on your AI Forum discussion.',
            bodyHtml,
            ctaLabel: 'View Thread',
            ctaUrl: postUrl,
            note: 'Stay engaged by replying to keep the conversation active.',
            footer: 'AI Nexus forum notification',
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: toEmail,
            subject: `New reply on your forum thread: ${postTitle}`,
            text: `Hello ${threadStarterName},\n\n${replierName} replied to your thread "${postTitle}".\n\nReply preview:\n${replyPreview}\n\nOpen thread: ${postUrl}\n`,
            html,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Forum reply notification email sent to ${toEmail}`);
        } catch (error) {
            console.error('Error sending forum reply notification email:', error);
            throw new Error('Failed to send forum reply notification email');
        }
    }

    async sendOrderReceiptEmail(params: {
        toEmail: string;
        customerName: string;
        orderId: string;
        amount: number | string;
        currency: string;
        itemLabel: string;
        receiptFilename: string;
        receiptBuffer: Buffer;
    }): Promise<void> {
        const {
            toEmail,
            customerName,
            orderId,
            amount,
            currency,
            itemLabel,
            receiptFilename,
            receiptBuffer,
        } = params;

        const signInPath = String(process.env.EMAIL_SIGNIN_PATH || '/auth/sign-in').trim();
        const normalizedPath = signInPath.startsWith('/') ? signInPath : `/${signInPath}`;
        const loginUrl = `${this.resolveFrontendBaseUrl()}${normalizedPath}`;
        const bodyHtml = buildOrderReceiptBodyHtml({ orderId, amount, currency, itemLabel });
        const html = buildBrandTemplate(this.resolveFrontendBaseUrl(), {
            heading: 'Your Payment Receipt',
            greetingName: customerName,
            intro: 'Thank you for your payment. Your receipt is attached as a PDF for your records.',
            bodyHtml,
            ctaLabel: 'Sign In',
            ctaUrl: loginUrl,
            note: 'Please keep this receipt for your accounting and audit records.',
            footer: 'AI Nexus payment receipt',
        });

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: toEmail,
            subject: 'Your AI Nexus payment receipt',
            text: `Hello ${customerName},\n\nThank you for your payment.\nOrder ID: ${orderId}\nItem: ${itemLabel}\nAmount Paid: ${currency} ${amount}\n\nYour PDF receipt is attached to this email.\n`,
            html,
            attachments: [
                {
                    filename: receiptFilename,
                    content: receiptBuffer,
                    contentType: 'application/pdf',
                },
            ],
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Order receipt email sent to ${toEmail}`);
        } catch (error) {
            console.error('Error sending order receipt email:', error);
            throw new Error('Failed to send order receipt email');
        }
    }

}

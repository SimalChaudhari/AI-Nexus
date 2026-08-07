import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Injectable } from '@nestjs/common';
import {
    buildBrandTemplate,
    buildCorporateNudgeBodyHtml,
    buildCorporateNudgeProgressSentence,
    buildCredentialsBodyHtml,
    buildFeeWaiverHrVerificationBodyHtml,
    buildForumReplyBodyHtml,
    buildOrderReceiptBodyHtml,
    buildStudentAcademicVerificationEmailHtml,
    buildStudentVerificationPinBodyHtml,
} from './email-template.util';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;
    private fromEmail: string;

    constructor() {
        // this.fromEmail = '';
        // const isDevelopment = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
        this.fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'no-reply@localhost';

        // if (isDevelopment) {
        //     this.transporter = nodemailer.createTransport({
        //         service: 'gmail',
        //         auth: {
        //             user: process.env.SMTP_USER,
        //             // pass: process.env.SMTP_PASS,
        //         },
        //     });
        //     return;
        // }
        
        const host = process.env.SMTP_HOST || '127.0.0.1';
        const port = Number(process.env.SMTP_PORT || 25);
        const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
        const user = process.env.SMTP_USER || '';
        const pass = process.env.SMTP_PASS || '';
        const rejectUnauthorized = String(process.env.SMTP_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false';

        const transportOptions: SMTPTransport.Options = {
            host,
            port,
            secure,
            tls: {
                rejectUnauthorized,
            },
        };

        if (user && pass) {
            transportOptions.auth = { user, pass };
        }

        this.transporter = nodemailer.createTransport(transportOptions);
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
            from: this.fromEmail,
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
            from: this.fromEmail,
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
        const bodyHtml = buildStudentVerificationPinBodyHtml(pin);
        const html = buildBrandTemplate(this.resolveFrontendBaseUrl(), {
            heading: 'Your Student Verification PIN',
            greetingName: schoolName || 'Student',
            intro: 'A student membership verification request was started for your school email address.',
            bodyHtml,
            note: 'This PIN expires in 10 minutes. Do not share it with anyone.',
            footer: 'AI Nexus student verification',
        });

        const mailOptions = {
            from: this.fromEmail,
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
        const learnerName = String(params.learnerName || 'Learner').trim() || 'Learner';
        const verificationUrl = `${this.resolveFrontendBaseUrl()}/auth/fee-waiver-audit/hr-verify?token=${encodeURIComponent(params.verificationToken)}`;
        const bodyHtml = buildFeeWaiverHrVerificationBodyHtml(learnerName);

        const html = buildBrandTemplate(this.resolveFrontendBaseUrl(), {
            heading: 'ISCA AI Fluency Programme – Job function verification',
            greetingName: `HR of ${learnerName}`,
            intro: '',
            bodyHtml,
            ctaLabel: 'Verify that the mentioned learner is working in an accounting and finance related job role',
            ctaUrl: verificationUrl,
            note: 'This verification link does not expire. You may use it at any time to complete verification.',
            footer: 'ISCA AI Fluency Programme',
        });

        const mailOptions = {
            from: this.fromEmail,
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

    async sendStudentAcademicVerificationEmail(params: {
        academicEmail: string;
        learnerName: string;
        verificationToken: string;
    }): Promise<void> {
        const academicEmail = String(params.academicEmail || '').trim();
        const learnerName = String(params.learnerName || 'Student').trim() || 'Student';
        const verificationUrl = `${this.resolveFrontendBaseUrl()}/auth/student-verification/confirm?token=${encodeURIComponent(params.verificationToken)}`;
        const declarationLine =
            "By clicking on the verification button below, you declare that you are an accounting student in one of Singapore's local universities/ polytechnics.";
        const html = buildStudentAcademicVerificationEmailHtml({
            learnerName,
            verificationUrl,
        });

        const mailOptions = {
            from: this.fromEmail,
            to: academicEmail,
            subject: 'ISCA AI Fluency Programme – Verify your academic email',
            text: `Hello ${learnerName},\n\nThank you for applying for the ISCA AI Fluency Programme student fee waiver.\n\nPlease verify your academic email to continue your registration.\n\n${declarationLine}\n\n${verificationUrl}`,
            html,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Student academic verification email sent to ${academicEmail}`);
        } catch (error) {
            console.error('Error sending student academic verification email:', error);
            throw new Error('Failed to send student academic verification email');
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
            from: this.fromEmail,
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
            from: this.fromEmail,
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

    /**
     * Corporate learner nudge — remind them to continue the AI fluency program.
     */
    async sendCorporateLearnerNudgeEmail(params: {
        toEmail: string;
        firstName: string;
        progressLabel?: string;
        courseUrl?: string;
    }): Promise<{ subject: string; toEmail: string; progressLabel: string }> {
        const firstName = String(params.firstName || '').trim() || 'there';
        const progressLabel = String(params.progressLabel || '').trim() || 'in progress';
        const coursePath = String(process.env.EMAIL_COURSE_PATH || '/learning').trim();
        const normalizedCoursePath = coursePath.startsWith('/') ? coursePath : `/${coursePath}`;
        const courseUrl =
            String(params.courseUrl || '').trim() ||
            `${this.resolveFrontendBaseUrl()}${normalizedCoursePath}`;
        const supportEmail = 'hello@ainexus.isca.org.sg';
        const subject = 'Reminder: Complete AI fluency program';
        const toEmail = String(params.toEmail || '').trim();

        const ctaLabel = 'Continue the course';
        const bodyHtml = buildCorporateNudgeBodyHtml({
            progressLabel,
            courseUrl,
            ctaLabel,
        });

        const html = buildBrandTemplate(this.resolveFrontendBaseUrl(), {
            heading: 'Complete your AI fluency program',
            greetingPrefix: 'Hi',
            greetingName: firstName,
            greetingBold: true,
            intro: '',
            bodyHtml,
            footer: 'AINEXUS',
        });

        const mailOptions = {
            from: this.fromEmail,
            to: toEmail,
            subject,
            text: [
                `Hi ${firstName},`,
                '',
                `Just a quick reminder to complete AI fluency program. ${buildCorporateNudgeProgressSentence(progressLabel, false)}`,
                'Please set aside some time to finish the remaining modules and any required assessment. You can continue the course here:',
                `${ctaLabel}: ${courseUrl}`,
                '',
                'By completing the course, you will be eligible for the lucky draw, earn applicable CPE hours, and develop the knowledge required for your current and future responsibilities.',
                '',
                `Having trouble accessing the course or need assistance? Please contact ${supportEmail}`,
                '',
                'Thank you,',
                'AINEXUS',
            ].join('\n'),
            html,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Corporate nudge email sent to ${toEmail}`);
            return { subject, toEmail, progressLabel };
        } catch (error) {
            console.error('Error sending corporate nudge email:', error);
            throw new Error('Failed to send nudge email');
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
            from: this.fromEmail,
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

    private resolveCorporateForeignQuotationEmail(): string {
        return String(
            process.env.CORPORATE_FOREIGN_QUOTATION_EMAIL || 'hello@ainexus.isca.org.sg',
        ).trim();
    }

    async sendCorporateForeignQuotationRequestEmail(params: {
        toEmail?: string;
        companyName: string;
        contactPerson: string;
        contactEmail: string;
        estimatedParticipants: number;
        companyCode?: string;
        submittedByName?: string;
        submittedByEmail?: string;
    }): Promise<{ subject: string; toEmail: string }> {
        const toEmail = String(params.toEmail || this.resolveCorporateForeignQuotationEmail()).trim();
        const companyName = String(params.companyName || '').trim();
        const contactPerson = String(params.contactPerson || '').trim();
        const contactEmail = String(params.contactEmail || '').trim();
        const estimatedParticipants = Number(params.estimatedParticipants);
        const companyCode = String(params.companyCode || '').trim();
        const submittedByName = String(params.submittedByName || '').trim();
        const submittedByEmail = String(params.submittedByEmail || '').trim();

        const subject = `Foreign non-member quotation request — ${companyName || 'Corporate enquiry'}`;
        const detailLines = [
            `Company name: ${companyName}`,
            `Contact person: ${contactPerson}`,
            `Contact email: ${contactEmail}`,
            `Estimated number of foreign learners: ${estimatedParticipants}`,
        ];
        if (companyCode) detailLines.push(`Company code: ${companyCode}`);
        if (submittedByName || submittedByEmail) {
            detailLines.push(
                `Submitted by: ${[submittedByName, submittedByEmail].filter(Boolean).join(' — ')}`,
            );
        }

        const bodyHtml = detailLines.map((line) => `<p style="margin:0 0 10px;">${line}</p>`).join('');
        const html = buildBrandTemplate(this.resolveFrontendBaseUrl(), {
            heading: 'Foreign non-member quotation request',
            greetingName: 'ISCA team',
            intro:
                'A corporate HR user has requested a quotation for enrolling foreign non-member learners through AI Fluency.',
            bodyHtml,
            footer: 'AI Nexus corporate portal',
        });

        const text = [
            'Foreign non-member quotation request',
            '',
            ...detailLines,
            '',
            'This request was submitted via the AI Nexus corporate enrolment portal.',
        ].join('\n');

        const mailOptions = {
            from: this.fromEmail,
            to: toEmail,
            replyTo: contactEmail,
            subject,
            text,
            html,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Corporate foreign quotation request email sent to ${toEmail}`);
            return { subject, toEmail };
        } catch (error) {
            console.error('Error sending corporate foreign quotation request email:', error);
            throw new Error('Failed to send quotation request email');
        }
    }

}

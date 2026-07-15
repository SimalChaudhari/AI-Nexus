const BRAND_PRIMARY = '#E32B24';
const BRAND_SECONDARY = '#1C4270';
const BRAND_SECONDARY_LIGHT = '#D8E4F3';
const BRAND_GRADIENT = `linear-gradient(115deg, ${BRAND_PRIMARY} 0%, ${BRAND_SECONDARY} 100%)`;

export type BrandTemplateParams = {
    heading: string;
    greetingName: string;
    greetingPrefix?: string;
    greetingBold?: boolean;
    intro: string;
    bodyHtml?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    note?: string;
    footer?: string;
};

export const escapeHtml = (value: string): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const buildEmailCtaButton = (
    label: string,
    url: string,
    align: 'center' | 'left' = 'center',
): string => {
    const safeLabel = escapeHtml(label);
    const safeUrl = escapeHtml(url);
    const cellAlign = align === 'left' ? 'left' : 'center';
    const margin = align === 'left' ? '8px 0 16px' : '26px auto 10px';
    // Full-width wrapper keeps next paragraphs below the button (align=left alone can float content beside it).
    return `
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; margin:${margin};">
                                <tr>
                                    <td align="${cellAlign}" style="padding:0;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                                            <tr>
                                                <td align="center" bgcolor="${BRAND_PRIMARY}" style="border-radius:10px; background:${BRAND_GRADIENT}; background-color:${BRAND_PRIMARY}; white-space:nowrap;">
                                                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:12px 26px; color:#ffffff; text-decoration:none; font-size:14px; line-height:1.4; font-weight:700; letter-spacing:0.02em; white-space:nowrap;">${safeLabel}</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>`;
};

const buildEmailNoteBox = (note: string): string => {
    const safeNote = escapeHtml(note);
    if (!safeNote) return '';
    return `
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; margin-top:16px; background-color:${BRAND_SECONDARY_LIGHT}; border:1px solid #c3d5ea; border-radius:10px;">
                                <tr>
                                    <td style="padding:10px 12px; color:${BRAND_SECONDARY}; font-size:13px; line-height:1.55;">${safeNote}</td>
                                </tr>
                            </table>`;
};

/** Shared table-based email shell with fully inline CSS. */
export const buildInlineBrandEmailHtml = ({
    title,
    heading,
    greetingName,
    greetingPrefix = 'Hello',
    greetingBold = true,
    intro,
    bodyHtml = '',
    ctaLabel,
    ctaUrl,
    note = '',
    footer = 'This is an automated email from AI Nexus.',
}: {
    title: string;
    heading: string;
    greetingName: string;
    greetingPrefix?: string;
    greetingBold?: boolean;
    intro: string;
    bodyHtml?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    note?: string;
    footer?: string;
}): string => {
    const safeTitle = escapeHtml(title);
    const safeHeading = escapeHtml(heading);
    const safeGreetingName = escapeHtml(greetingName || 'there');
    const safeGreetingPrefix = escapeHtml(greetingPrefix);
    const safeIntro = escapeHtml(intro);
    const safeFooter = escapeHtml(footer).replace(/\n/g, '<br />');
    const introBlock = safeIntro
        ? `<p style="margin:0 0 18px; color:#334155; font-size:15px; line-height:1.65;">${safeIntro}</p>`
        : '';
    const ctaBlock = ctaLabel && ctaUrl ? buildEmailCtaButton(ctaLabel, ctaUrl) : '';
    const noteBlock = buildEmailNoteBox(note);

    const greetingNameHtml = greetingBold
        ? `<strong style="font-weight:700;">${safeGreetingName}</strong>`
        : safeGreetingName;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f6fb; font-family:'Segoe UI', Arial, sans-serif; color:#334155;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; background-color:#f3f6fb; margin:0; padding:0;">
        <tr>
            <td align="center" style="padding:24px 10px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="border-collapse:collapse; max-width:640px; width:100%; border:1px solid #dbe4f0; border-radius:20px; background-color:#ffffff; overflow:hidden;">
                    <tr>
                        <td align="center" style="padding:26px 28px; background:${BRAND_GRADIENT}; background-color:${BRAND_PRIMARY};">
                            <p style="margin:0 0 8px; color:${BRAND_SECONDARY_LIGHT}; font-size:12px; line-height:1.4; letter-spacing:0.18em; text-transform:uppercase; font-weight:700;">AI Nexus</p>
                            <h1 style="margin:0; color:#ffffff; font-size:24px; line-height:1.25; font-weight:800;">${safeHeading}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 26px 22px; background-color:#ffffff;">
                            <p style="margin:0 0 10px; color:${BRAND_SECONDARY}; font-size:16px; line-height:1.5; font-weight:400;">${safeGreetingPrefix} ${greetingNameHtml},</p>
                            ${introBlock}
                            ${bodyHtml}
                            ${ctaBlock}
                            ${noteBlock}
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:14px 22px 18px; border-top:1px solid #e2e8f0; background-color:#ffffff; color:#94a3b8; font-size:12px; line-height:1.55;">
                            ${safeFooter}<br />
                            <span style="display:inline-block; margin-top:3px;">If you did not expect this email, please contact support.</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

export const buildBrandTemplate = (
    _frontendBaseUrl: string,
    { heading, greetingName, greetingPrefix, greetingBold, intro, bodyHtml, ctaLabel, ctaUrl, note, footer }: BrandTemplateParams,
): string =>
    buildInlineBrandEmailHtml({
        title: heading,
        heading,
        greetingName,
        greetingPrefix,
        greetingBold,
        intro,
        bodyHtml,
        ctaLabel,
        ctaUrl,
        note,
        footer,
    });

export const buildCredentialsBodyHtml = (username: string, plainPassword: string): string => {
    const safeUsername = escapeHtml(username);
    const safePassword = escapeHtml(plainPassword);

    return `
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; margin-top:18px; border:1px solid #d6e0ee; border-radius:12px; overflow:hidden; background-color:#ffffff;">
                                <tr>
                                    <td style="padding:10px 14px; background-color:${BRAND_SECONDARY_LIGHT}; color:${BRAND_SECONDARY}; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                                        Account Credentials
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:0; background-color:#ffffff;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                                            <tr>
                                                <td style="padding:12px 14px; width:36%; color:${BRAND_SECONDARY}; font-size:13px; line-height:1.5; font-weight:700; border-top:1px solid #e6edf7;">Username</td>
                                                <td style="padding:12px 14px; color:#0f172a; font-size:14px; line-height:1.5; border-top:1px solid #e6edf7;">${safeUsername}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:12px 14px; width:36%; color:${BRAND_SECONDARY}; font-size:13px; line-height:1.5; font-weight:700; border-top:1px solid #e6edf7;">Temporary Password</td>
                                                <td style="padding:12px 14px; color:#0f172a; font-size:14px; line-height:1.5; border-top:1px solid #e6edf7;">
                                                    <span style="display:inline-block; background-color:#fff6f5; border:1px solid #f3c2bf; color:${BRAND_PRIMARY}; padding:5px 9px; border-radius:7px; font-family:Consolas, 'Courier New', monospace; letter-spacing:0.02em;">${safePassword}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 14px 14px; color:#64748b; font-size:12px; line-height:1.5; background-color:#ffffff;">
                                        Please keep these credentials private and update your password after first login.
                                    </td>
                                </tr>
                            </table>`;
};

const SUPPORT_EMAIL = 'hello@ainexus.isca.org.sg';

/** Build the second sentence of the corporate nudge intro (HTML or plain text). */
export const buildCorporateNudgeProgressSentence = (
    progressLabelRaw: string,
    asHtml: boolean,
): string => {
    const raw = String(progressLabelRaw || '').trim() || 'in progress';
    const lackOutstanding = /lack the/i.test(raw);
    const milestone = /milestone achieved/i.test(raw);
    const zeroPercent = /^0%\s*complete/i.test(raw);
    const moduleMatch = raw.match(/on Module\s+(.+)$/i);
    const moduleTitle = moduleMatch ? String(moduleMatch[1] || '').trim() : '';

    if (lackOutstanding) {
        const sentence =
            raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\.*\s*$/, '');
        return asHtml
            ? `<strong style="font-weight:700;">${escapeHtml(sentence)}</strong>, so you’re almost there.`
            : `${sentence}, so you’re almost there.`;
    }

    if (milestone) {
        return asHtml
            ? `You’ve achieved a <strong style="font-weight:700;">Pillar 2 specialisation milestone</strong>, so you’re almost there.`
            : `You’ve achieved a Pillar 2 specialisation milestone, so you’re almost there.`;
    }

    // 0% — do not say "almost there"
    if (zeroPercent || /^in progress$/i.test(raw)) {
        if (moduleTitle) {
            const safeModule = escapeHtml(moduleTitle);
            return asHtml
                ? `You haven’t started yet — begin with <strong style="font-weight:700;">Module ${safeModule}</strong> when you’re ready.`
                : `You haven’t started yet — begin with Module ${moduleTitle} when you’re ready.`;
        }
        return asHtml
            ? `You haven’t started yet — take the first step when you’re ready.`
            : `You haven’t started yet — take the first step when you’re ready.`;
    }

    return asHtml
        ? `You’re currently <strong style="font-weight:700;">${escapeHtml(raw)}</strong>, so you’re almost there.`
        : `You’re currently ${raw}, so you’re almost there.`;
};

/** Corporate learner nudge — continue AI fluency programme. */
export const buildCorporateNudgeBodyHtml = (params: {
    progressLabel: string;
    courseUrl: string;
    ctaLabel?: string;
}): string => {
    const progressSentence = buildCorporateNudgeProgressSentence(params.progressLabel, true);
    const courseUrl = String(params.courseUrl || '').trim();
    const supportEmail = escapeHtml(SUPPORT_EMAIL);
    const ctaLabel = String(params.ctaLabel || 'Continue the course').trim() || 'Continue the course';

    const courseCtaHtml = courseUrl
        ? buildEmailCtaButton(ctaLabel, courseUrl, 'left')
        : '';

    return `
                            <p style="margin:0 0 14px; color:#334155; font-size:15px; line-height:1.65;">
                                Just a quick reminder to complete <strong style="font-weight:700;">AI fluency program</strong>. ${progressSentence}
                            </p>
                            <p style="margin:0 0 8px; color:#334155; font-size:15px; line-height:1.65;">
                                Please set aside some time to finish the remaining modules and any required assessment. You can continue the course here:
                            </p>
                            ${courseCtaHtml}
                            <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.65;">
                                By completing the course, you will be eligible for the lucky draw, earn applicable CPE hours, and develop the knowledge required for your current and future responsibilities.
                            </p>
                            <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.65;">
                                Having trouble accessing the course or need assistance? Please contact <a href="mailto:${supportEmail}" style="color:${BRAND_SECONDARY}; text-decoration:underline; font-weight:700;"><strong style="font-weight:700;">${supportEmail}</strong></a>
                            </p>
                            <p style="margin:0; color:#0f172a; font-size:15px; line-height:1.65;">
                                Thank you,<br />
                                AINEXUS
                            </p>`;
};

export const buildForumReplyBodyHtml = (postTitle: string, replierName: string, replyPreview: string): string => {
    const safePostTitle = escapeHtml(postTitle);
    const safeReplier = escapeHtml(replierName || 'A user');
    const safeReplyPreview = escapeHtml(replyPreview || 'A new reply was posted.');

    return `
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; margin-top:14px; background-color:${BRAND_SECONDARY_LIGHT}; border:1px solid #c3d5ea; border-radius:12px;">
                                <tr>
                                    <td style="padding:14px;">
                                        <p style="margin:0 0 8px; color:${BRAND_SECONDARY}; font-size:15px; line-height:1.5; font-weight:700;">${safePostTitle}</p>
                                        <p style="margin:0; color:#475569; font-size:14px; line-height:1.6;"><strong style="font-weight:700;">${safeReplier}</strong> replied: ${safeReplyPreview}</p>
                                    </td>
                                </tr>
                            </table>`;
};

export const buildOrderReceiptBodyHtml = (params: {
    orderId: string;
    amount: number | string;
    currency: string;
    itemLabel: string;
}): string => {
    const safeOrderId = escapeHtml(params.orderId);
    const safeAmount = escapeHtml(String(params.amount));
    const safeCurrency = escapeHtml(params.currency || 'SGD');
    const safeItemLabel = escapeHtml(params.itemLabel || 'Order payment');

    return `
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; margin-top:18px; border:1px solid #d6e0ee; border-radius:12px; overflow:hidden; background-color:#ffffff;">
                                <tr>
                                    <td style="padding:10px 14px; background-color:${BRAND_SECONDARY_LIGHT}; color:${BRAND_SECONDARY}; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                                        Payment Receipt
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:0; background-color:#ffffff;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                                            <tr>
                                                <td style="padding:12px 14px; width:36%; color:${BRAND_SECONDARY}; font-size:13px; line-height:1.5; font-weight:700; border-top:1px solid #e6edf7;">Order ID</td>
                                                <td style="padding:12px 14px; color:#0f172a; font-size:14px; line-height:1.5; border-top:1px solid #e6edf7;">${safeOrderId}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:12px 14px; width:36%; color:${BRAND_SECONDARY}; font-size:13px; line-height:1.5; font-weight:700; border-top:1px solid #e6edf7;">Item</td>
                                                <td style="padding:12px 14px; color:#0f172a; font-size:14px; line-height:1.5; border-top:1px solid #e6edf7;">${safeItemLabel}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:12px 14px; width:36%; color:${BRAND_SECONDARY}; font-size:13px; line-height:1.5; font-weight:700; border-top:1px solid #e6edf7;">Amount Paid</td>
                                                <td style="padding:12px 14px; color:#0f172a; font-size:14px; line-height:1.5; border-top:1px solid #e6edf7;">${safeCurrency} ${safeAmount}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 14px 14px; color:#64748b; font-size:12px; line-height:1.5; background-color:#ffffff;">
                                        Your PDF receipt is attached to this email for your records.
                                    </td>
                                </tr>
                            </table>`;
};

export const buildStudentVerificationPinBodyHtml = (pin: string): string => {
    const safePin = escapeHtml(String(pin || '').trim());

    return `
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; margin-top:18px; border:1px solid #d6e0ee; border-radius:12px; overflow:hidden; background-color:#ffffff;">
                                <tr>
                                    <td style="padding:10px 14px; background-color:${BRAND_SECONDARY_LIGHT}; color:${BRAND_SECONDARY}; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                                        Student Verification PIN
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:18px 14px; background-color:#ffffff;">
                                        <p style="margin:0 0 12px; color:#475569; font-size:14px; line-height:1.6;">
                                            Use the following verification PIN in the AI Nexus membership eligibility dialog to continue your student verification.
                                        </p>
                                        <span style="display:inline-block; background-color:#fff6f5; border:1px solid #f3c2bf; color:${BRAND_PRIMARY}; padding:10px 14px; border-radius:10px; font-family:Consolas, 'Courier New', monospace; font-size:22px; line-height:1.2; font-weight:700; letter-spacing:0.18em;">${safePin}</span>
                                    </td>
                                </tr>
                            </table>`;
};

export const buildFeeWaiverHrVerificationBodyHtml = (learnerName: string): string => {
    const safeLearnerName = escapeHtml(learnerName);
    const boldLearnerName = `<strong style="font-weight:700;">${safeLearnerName}</strong>`;

    return `
                            <p style="margin:0 0 18px; color:#334155; font-size:15px; line-height:1.65;">
                                ${boldLearnerName} has applied for the <strong style="font-weight:700;">ISCA AI Fluency Programme</strong>, which is designed for accounting and finance professionals.
                            </p>
                            <p style="margin:0 0 18px; color:#334155; font-size:15px; line-height:1.65;">
                                As part of the application verification process, we kindly request your assistance in confirming that ${boldLearnerName} is currently employed in an accounting and finance-related role within your organisation.
                            </p>
                            <p style="margin:0 0 18px; color:#334155; font-size:15px; line-height:1.65;">
                                Please click the verification button below to complete the employment confirmation.
                            </p>`;
};

export type StudentAcademicVerificationEmailParams = {
    learnerName: string;
    verificationUrl: string;
};

/** Fully inline, table-based HTML for student academic email verification (email-client safe). */
export const buildStudentAcademicVerificationEmailHtml = ({
    learnerName,
    verificationUrl,
}: StudentAcademicVerificationEmailParams): string => {
    const declarationLine =
        "By clicking on the verification button below, you declare that you are an accounting student in one of Singapore's local universities/ polytechnics.";

    const bodyHtml = `
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; border:1px solid #d6e0ee; border-radius:12px; overflow:hidden; background-color:#ffffff;">
                                <tr>
                                    <td style="padding:10px 14px; background-color:${BRAND_SECONDARY_LIGHT}; color:${BRAND_SECONDARY}; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                                        Student Academic Email Verification
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:18px 14px; background-color:#ffffff;">
                                        <p style="margin:0 0 12px; color:#334155; font-size:14px; line-height:1.6;">
                                            You recently submitted your student details for the ISCA AI Fluency Programme fee waiver application using this academic email address.
                                        </p>
                                        <p style="margin:0 0 16px; color:#334155; font-size:14px; line-height:1.6;">
                                            Please verify your academic email to continue your registration.
                                        </p>
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; background-color:${BRAND_SECONDARY_LIGHT}; border:1px solid #c3d5ea; border-radius:10px;">
                                            <tr>
                                                <td style="padding:12px 14px; color:${BRAND_SECONDARY}; font-size:14px; line-height:1.6; font-weight:600;">
                                                    ${escapeHtml(declarationLine)}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>`;

    return buildInlineBrandEmailHtml({
        title: 'ISCA AI Fluency Programme – Verify your academic email',
        heading: 'ISCA AI Fluency Programme – Student email verification',
        greetingName: learnerName,
        intro: 'Thank you for applying for the ISCA AI Fluency Programme student fee waiver.',
        bodyHtml,
        ctaLabel: 'Verify my academic email',
        ctaUrl: verificationUrl,
        note: 'This verification link does not expire. You may use it at any time to complete verification.',
        footer: 'ISCA AI Fluency Programme',
    });
};

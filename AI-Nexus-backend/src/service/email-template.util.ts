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
    ctaAlign?: 'left' | 'center' | 'right';
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

const EMAIL_ALLOWED_TAGS = new Set([
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'ul',
    'ol',
    'li',
    'a',
    'span',
]);

/** Lightweight markdown for plain-text email fields: **bold**, *italic*, _italic_, newlines. */
const formatEmailMarkdown = (value: string): string => {
    let text = escapeHtml(String(value ?? ''));
    text = text.replace(/\r\n|\r|\n/g, '<br />');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
    text = text.replace(/(^|[^_])_([^_]+?)_(?!_)/g, '$1<em>$2</em>');
    return text;
};

/**
 * Prepare admin/editor content for email HTML.
 * Accepts TipTap/CKEditor-style HTML (allowlisted tags) or plain markdown text.
 */
export const formatEmailRichText = (value: string): string => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
    if (!looksLikeHtml) {
        return formatEmailMarkdown(raw);
    }

    let html = raw
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

    html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, tagName: string, attrs = '') => {
        const tag = String(tagName || '').toLowerCase();
        if (!EMAIL_ALLOWED_TAGS.has(tag)) return '';
        if (tag === 'br') return '<br />';
        if (match.startsWith('</')) return `</${tag}>`;
        if (tag === 'a') {
            const hrefMatch = String(attrs).match(
                /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i,
            );
            const href = hrefMatch
                ? String(hrefMatch[2] || hrefMatch[3] || hrefMatch[4] || '').trim()
                : '';
            const safeHref = /^(https?:|mailto:)/i.test(href) ? escapeHtml(href) : '#';
            return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="color:#1C4270; text-decoration:underline;">`;
        }
        return `<${tag}>`;
    });

    return html;
};

/** Wrap rich email content in a styled block (avoids double <p> when TipTap HTML is used). */
export const wrapEmailRichBlock = (
    html: string,
    style = 'margin:0 0 14px; color:#334155; font-size:15px; line-height:1.65;',
): string => {
    const content = formatEmailRichText(html);
    if (!content) return '';
    return `<div style="${style}">${content}</div>`;
};

const buildEmailCtaButton = (
    label: string,
    url: string,
    align: 'left' | 'center' | 'right' = 'center',
): string => {
    const safeLabel = escapeHtml(label);
    const safeUrl = escapeHtml(url);
    const cellAlign = align === 'left' || align === 'right' ? align : 'center';
    const margin =
        align === 'left'
            ? '8px 0 16px'
            : align === 'right'
              ? '8px 0 16px auto'
              : '26px auto 10px';
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
    const safeNote = formatEmailRichText(note);
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
    ctaAlign = 'center',
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
    ctaAlign?: 'left' | 'center' | 'right';
    note?: string;
    footer?: string;
}): string => {
    const safeTitle = escapeHtml(title);
    const safeHeading = escapeHtml(heading);
    const safeGreetingName = escapeHtml(greetingName || 'there');
    const safeGreetingPrefix = escapeHtml(greetingPrefix);
    const introBlock = wrapEmailRichBlock(
        intro,
        'margin:0 0 18px; color:#334155; font-size:15px; line-height:1.65;',
    );
    const safeFooter = escapeHtml(String(footer || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    const ctaBlock = ctaLabel && ctaUrl ? buildEmailCtaButton(ctaLabel, ctaUrl, ctaAlign) : '';
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
                            <p style="margin:0 0 8px; color:${BRAND_SECONDARY_LIGHT}; font-size:12px; line-height:1.4; letter-spacing:0.08em; font-weight:700;">ISCA AINexus</p>
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
    {
        heading,
        greetingName,
        greetingPrefix,
        greetingBold,
        intro,
        bodyHtml,
        ctaLabel,
        ctaUrl,
        ctaAlign,
        note,
        footer,
    }: BrandTemplateParams,
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
        ctaAlign,
        note,
        footer,
    });

/** Shared optional account-details card + body text for welcome emails. */
export const buildWelcomeEmailBodyHtml = (params: {
    bodyText?: string;
    showAccountDetails?: boolean;
    accountDetailsTitle?: string;
    accountDetailsHtml?: string;
}): string => {
    const bodyParagraph = wrapEmailRichBlock(String(params.bodyText || '').trim());
    if (!params.showAccountDetails) {
        return bodyParagraph;
    }

    const title = escapeHtml(String(params.accountDetailsTitle || 'Account details').trim() || 'Account details');
    const detailsHtml = formatEmailRichText(String(params.accountDetailsHtml || '').trim());
    if (!detailsHtml) {
        return bodyParagraph;
    }

    return `
                            ${bodyParagraph}
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; margin-top:8px; border:1px solid #d6e0ee; border-radius:12px; overflow:hidden; background-color:#ffffff;">
                                <tr>
                                    <td style="padding:10px 14px; background-color:${BRAND_SECONDARY_LIGHT}; color:${BRAND_SECONDARY}; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                                        ${title}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 14px 14px; color:#334155; font-size:14px; line-height:1.65; background-color:#ffffff; border-top:1px solid #e6edf7;">
                                        ${detailsHtml}
                                    </td>
                                </tr>
                            </table>`;
};

export const buildUserRegistrationWelcomeBodyHtml = (params: {
    bodyText?: string;
    showAccountDetails?: boolean;
    accountDetailsTitle?: string;
    accountDetailsHtml?: string;
}): string => buildWelcomeEmailBodyHtml(params);

export const buildCorporateRegistrationWelcomeBodyHtml = (params: {
    bodyText?: string;
    showAccountDetails?: boolean;
    accountDetailsTitle?: string;
    accountDetailsHtml?: string;
}): string => buildWelcomeEmailBodyHtml(params);

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

export const buildAnnouncementBodyHtml = (title: string, descriptionHtml: string): string => {
    const safeTitle = escapeHtml(title || 'New announcement');
    const raw = String(descriptionHtml || '').trim();
    const previewSource =
        raw.length > 3000
            ? `${raw
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .slice(0, 400)}${raw.length > 400 ? '...' : ''}`
            : raw;
    const body = wrapEmailRichBlock(
        previewSource,
        'margin:0; color:#475569; font-size:14px; line-height:1.6;',
    );

    return `
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse; margin-top:14px; background-color:${BRAND_SECONDARY_LIGHT}; border:1px solid #c3d5ea; border-radius:12px;">
                                <tr>
                                    <td style="padding:14px;">
                                        <p style="margin:0 0 8px; color:${BRAND_SECONDARY}; font-size:15px; line-height:1.5; font-weight:700;">${safeTitle}</p>
                                        ${body || '<p style="margin:0; color:#475569; font-size:14px; line-height:1.6;">A new announcement was posted on AI Nexus.</p>'}
                                    </td>
                                </tr>
                            </table>`;
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

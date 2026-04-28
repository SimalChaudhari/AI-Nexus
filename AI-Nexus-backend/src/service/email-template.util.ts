const BRAND_PRIMARY = '#E32B24';
const BRAND_SECONDARY = '#1C4270';
const BRAND_PRIMARY_LIGHT = '#F8D6D3';
const BRAND_SECONDARY_LIGHT = '#D8E4F3';

export type BrandTemplateParams = {
    heading: string;
    greetingName: string;
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

export const buildBrandTemplate = (
    frontendBaseUrl: string,
    { heading, greetingName, intro, bodyHtml, ctaLabel, ctaUrl, note, footer }: BrandTemplateParams,
): string => {
    const safeHeading = escapeHtml(heading);
    const safeGreetingName = escapeHtml(greetingName || 'there');
    const safeIntro = escapeHtml(intro);
    const safeNote = escapeHtml(note || '');
    const safeFooter = escapeHtml(footer || 'This is an automated email from AI Nexus.');
    const brandGradient = `linear-gradient(115deg, ${BRAND_PRIMARY} 0%, ${BRAND_SECONDARY} 100%)`;

    return `
        <div style="background:#f3f6fb; padding:24px 10px;">
            <div style="font-family:'Segoe UI', Arial, sans-serif; max-width:640px; margin:auto; border-radius:20px; overflow:hidden; border:1px solid #dbe4f0; background:#ffffff; box-shadow:0 10px 28px rgba(15, 23, 42, 0.08);">
                <div style="background:${brandGradient}; padding:26px 28px; text-align:center;">
                    <div style="color:${BRAND_SECONDARY_LIGHT}; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:8px;">AI Nexus</div>
                    <h2 style="margin:0; color:#ffffff; font-size:24px; line-height:1.25; font-weight:800;">${safeHeading}</h2>
                </div>
                <div style="padding:28px 26px 22px;">
                    <p style="margin:0 0 10px; color:${BRAND_SECONDARY}; font-size:16px; font-weight:700;">Hello ${safeGreetingName},</p>
                    <p style="margin:0; color:#334155; font-size:15px; line-height:1.65;">${safeIntro}</p>
                    ${bodyHtml || ''}
                    ${
                        ctaLabel && ctaUrl
                            ? `<div style="text-align:center; margin:26px 0 10px;">
                                <a href="${ctaUrl}" style="display:inline-block; text-decoration:none; background:${brandGradient}; color:#ffffff; padding:12px 26px; border-radius:10px; font-weight:700; font-size:14px; letter-spacing:0.02em; box-shadow:0 8px 18px rgba(28, 66, 112, 0.28);">${escapeHtml(ctaLabel)}</a>
                            </div>`
                            : ''
                    }
                    ${
                        safeNote
                            ? `<div style="margin-top:16px; background:${BRAND_SECONDARY_LIGHT}; border:1px solid #c3d5ea; border-radius:10px; padding:10px 12px; color:${BRAND_SECONDARY}; font-size:13px; line-height:1.55;">${safeNote}</div>`
                            : ''
                    }
                </div>
                <div style="border-top:1px solid #e2e8f0; padding:14px 22px 18px; text-align:center; color:#94a3b8; font-size:12px; line-height:1.55;">
                    ${safeFooter}<br />
                    <span style="display:inline-block; margin-top:3px;">If you did not expect this email, please contact support.</span>
                </div>
            </div>
        </div>
    `;
};

export const buildCredentialsBodyHtml = (username: string, plainPassword: string): string => {
    const safeUsername = escapeHtml(username);
    const safePassword = escapeHtml(plainPassword);

    return `
        <div style="margin-top:18px; background:#ffffff; border:1px solid #d6e0ee; border-radius:12px; overflow:hidden;">
            <div style="background:${BRAND_SECONDARY_LIGHT}; color:${BRAND_SECONDARY}; padding:10px 14px; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                Account Credentials
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                <tr>
                    <td style="padding:12px 14px; width:36%; color:${BRAND_SECONDARY}; font-size:13px; font-weight:700; border-top:1px solid #e6edf7;">Username</td>
                    <td style="padding:12px 14px; color:#0f172a; font-size:14px; border-top:1px solid #e6edf7;">${safeUsername}</td>
                </tr>
                <tr>
                    <td style="padding:12px 14px; width:36%; color:${BRAND_SECONDARY}; font-size:13px; font-weight:700; border-top:1px solid #e6edf7;">Temporary Password</td>
                    <td style="padding:12px 14px; color:#0f172a; font-size:14px; border-top:1px solid #e6edf7;">
                        <span style="display:inline-block; background:#fff6f5; border:1px solid #f3c2bf; color:${BRAND_PRIMARY}; padding:5px 9px; border-radius:7px; font-family:Consolas, 'Courier New', monospace; letter-spacing:0.02em;">${safePassword}</span>
                    </td>
                </tr>
            </table>
            <div style="padding:10px 14px 14px; color:#64748b; font-size:12px; line-height:1.5;">
                Please keep these credentials private and update your password after first login.
            </div>
        </div>
    `;
};

export const buildForumReplyBodyHtml = (postTitle: string, replierName: string, replyPreview: string): string => {
    const safePostTitle = escapeHtml(postTitle);
    const safeReplier = escapeHtml(replierName || 'A user');
    const safeReplyPreview = escapeHtml(replyPreview || 'A new reply was posted.');

    return `
        <div style="margin-top:14px; background:${BRAND_SECONDARY_LIGHT}; border:1px solid #c3d5ea; border-radius:12px; padding:14px;">
            <p style="margin:0 0 8px; color:${BRAND_SECONDARY}; font-size:15px; font-weight:700;">${safePostTitle}</p>
            <p style="margin:0; color:#475569; font-size:14px; line-height:1.6;"><strong>${safeReplier}</strong> replied: ${safeReplyPreview}</p>
        </div>
    `;
};

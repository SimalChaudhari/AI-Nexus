const AI_NEXUS_WEBSITE_URL = 'https://ainexus.isca.org.sg/';

/** LinkedIn share text cannot use HTML/markdown — approximate bold with Mathematical Bold Unicode. */
export function toLinkedInBoldText(value) {
  return Array.from(String(value || ''))
    .map((ch) => {
      if (ch >= 'A' && ch <= 'Z') {
        return String.fromCodePoint(0x1d400 + (ch.charCodeAt(0) - 65));
      }
      if (ch >= 'a' && ch <= 'z') {
        return String.fromCodePoint(0x1d41a + (ch.charCodeAt(0) - 97));
      }
      if (ch >= '0' && ch <= '9') {
        return String.fromCodePoint(0x1d7ce + (ch.charCodeAt(0) - 48));
      }
      return ch;
    })
    .join('');
}

export function buildLinkedInFeedShareUrl(text, websiteUrl = AI_NEXUS_WEBSITE_URL) {
  const safeText = String(text || '').trim();
  const params = new URLSearchParams({
    shareActive: 'true',
    text: safeText,
    url: websiteUrl,
  });
  return `https://www.linkedin.com/feed/?${params.toString()}`;
}

export function buildCertificateLinkedInShareText({
  certificateNo,
} = {}) {
  const boldProgramme = toLinkedInBoldText('AIxACCOUNTANCY');
  return [
    `I'm proud to have earned the ${boldProgramme} certificate on AI Nexus. Another milestone in my professional learning journey.`,
    '',
    'I encourage you to join me on this learning journey and strengthen your AI skills for the future of accountancy.',
    '',
    'Issued by AI Nexus',
    certificateNo ? `Certificate No.:  ${certificateNo}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export function buildBadgeLinkedInShareText({
  certificateNo,
} = {}) {
  const boldProgramme = toLinkedInBoldText('AIxACCOUNTANCY');
  return [
    `I'm proud to have earned the ${boldProgramme} digital badge on AI Nexus. Another milestone in my professional learning journey.`,
    '',
    'I encourage you to join me on this learning journey and strengthen your AI skills for the future of accountancy.',
    '',
    'Issued by AI Nexus',
    certificateNo ? `Credential No.:  ${certificateNo}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export function buildCourseCompletionLinkedInShareText({
  courseTitle,
  platformName = 'AI Nexus',
}) {
  return `I completed "${courseTitle || 'a course'}" on ${platformName} and earned my certificate. #Learning #AI`;
}

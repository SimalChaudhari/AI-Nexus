export function buildLinkedInFeedShareUrl(text) {
  const safeText = String(text || '').trim();
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(safeText)}`;
}

export function buildCertificateLinkedInShareText({
  courseTitle,
  certificateNo,
  platformName = 'AI Nexus',
}) {
  return [
    `I just earned the "${courseTitle || 'Course'}" certificate on ${platformName}!`,
    certificateNo ? `Certificate No: ${certificateNo}` : null,
    'Continuing my professional learning journey.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildCourseCompletionLinkedInShareText({
  courseTitle,
  platformName = 'AI Nexus',
}) {
  return `I completed "${courseTitle || 'a course'}" on ${platformName} and earned my certificate. #Learning #AI`;
}


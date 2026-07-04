import { SplitQuestionSegment } from '../assessment-evaluation.types';

const QUESTION_START_PATTERNS = [
  /(?:^|\n)\s*(?:question\s*)?(?:q\.?\s*)?(\d{1,2})\s*[.:)\-–—]\s+/gi,
  /(?:^|\n)\s*(\d{1,2})\s*\)\s+/g,
  /(?:^|\n)\s*part\s+([a-z])\s*[.:)\-–—]\s+/gi,
];

function normalizeWhitespace(text: string): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type MarkerMatch = { index: number; questionNumber: number; label: string; matchLength: number };

function collectMarkers(text: string): MarkerMatch[] {
  const markers: MarkerMatch[] = [];

  for (const pattern of QUESTION_START_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const rawNum = match[1];
      const questionNumber =
        /^\d+$/.test(rawNum) ? Number(rawNum) : rawNum.toUpperCase().charCodeAt(0) - 64;
      if (!Number.isFinite(questionNumber) || questionNumber <= 0) continue;
      markers.push({
        index: match.index,
        questionNumber,
        label: /^\d+$/.test(rawNum) ? `Q${rawNum}` : `Part ${rawNum.toUpperCase()}`,
        matchLength: match[0].length,
      });
    }
  }

  markers.sort((a, b) => a.index - b.index || a.questionNumber - b.questionNumber);

  const deduped: MarkerMatch[] = [];
  for (const marker of markers) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.index - marker.index) < 3) {
      if (marker.matchLength > prev.matchLength) deduped[deduped.length - 1] = marker;
      continue;
    }
    deduped.push(marker);
  }

  return deduped;
}

export function splitTextIntoQuestions(text: string): SplitQuestionSegment[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];

  const markers = collectMarkers(normalized);
  if (markers.length === 0) {
    return [
      {
        questionNumber: 1,
        label: 'Q1',
        text: normalized,
        startOffset: 0,
        endOffset: normalized.length,
      },
    ];
  }

  const segments: SplitQuestionSegment[] = [];
  for (let i = 0; i < markers.length; i += 1) {
    const current = markers[i];
    const next = markers[i + 1];
    const start = current.index;
    const end = next ? next.index : normalized.length;
    const chunk = normalized.slice(start, end).trim();
    if (!chunk) continue;
    segments.push({
      questionNumber: current.questionNumber,
      label: current.label,
      text: chunk,
      startOffset: start,
      endOffset: end,
    });
  }

  return renumberSequential(segments);
}

function renumberSequential(segments: SplitQuestionSegment[]): SplitQuestionSegment[] {
  return segments.map((segment, index) => ({
    ...segment,
    questionNumber: index + 1,
    label: `Q${index + 1}`,
  }));
}

export function alignStudentAnswersToQuestions(
  studentSegments: SplitQuestionSegment[],
  questionCount: number,
): string[] {
  const byNumber = new Map<number, string>();
  studentSegments.forEach((segment) => {
    byNumber.set(segment.questionNumber, segment.text);
  });

  const answers: string[] = [];
  for (let i = 1; i <= questionCount; i += 1) {
    answers.push(byNumber.get(i) || '');
  }
  return answers;
}

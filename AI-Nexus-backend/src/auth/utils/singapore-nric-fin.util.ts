/**
 * Standard checksum weights for Singapore NRIC/FIN validation.
 */
export const SINGAPORE_NRIC_FIN_WEIGHTS = [2, 7, 6, 5, 4, 3, 2] as const;

/**
 * Checksum table for the `S` and `T` series, indexed by `sum % 11`.
 */
export const ST_SERIES_CHECKSUM_MAP = ['J', 'Z', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'] as const;

/**
 * Checksum table for the `F` and `G` series, indexed by `sum % 11`.
 */
export const FG_SERIES_CHECKSUM_MAP = ['X', 'W', 'U', 'T', 'R', 'Q', 'P', 'N', 'M', 'L', 'K'] as const;

/**
 * Checksum table for the `M` series, indexed by `sum % 11`.
 */
export const M_SERIES_CHECKSUM_MAP = ['X', 'W', 'U', 'T', 'R', 'Q', 'P', 'N', 'J', 'L', 'K'] as const;

export type SingaporeDocumentPrefix = 'S' | 'T' | 'F' | 'G' | 'M';
export type SingaporeDocumentType = 'NRIC' | 'FIN';

export interface SingaporeNricFinValidationResult {
  normalized: string;
  prefix: SingaporeDocumentPrefix;
  digits: string;
  suffix: string;
  documentType: SingaporeDocumentType;
  expectedSuffix: string;
  isValid: boolean;
  masked: string;
}

export interface ResolvedSingaporeNricFinCandidate {
  rawNormalized: string;
  normalized: string;
  correctedByChecksum: boolean;
}

function countCandidateDifferences(left: string, right: string): number {
  const leftValue = normalizeSingaporeNricFin(left);
  const rightValue = normalizeSingaporeNricFin(right);
  const sharedLength = Math.min(leftValue.length, rightValue.length);
  let differenceCount = Math.abs(leftValue.length - rightValue.length);

  for (let index = 0; index < sharedLength; index += 1) {
    if (leftValue[index] !== rightValue[index]) {
      differenceCount += 1;
    }
  }

  return differenceCount;
}

function getResolvedCandidateScore(candidate: ResolvedSingaporeNricFinCandidate): number {
  const differenceCount = countCandidateDifferences(candidate.rawNormalized, candidate.normalized);
  return (differenceCount * 10) + (candidate.correctedByChecksum ? 1 : 0);
}

export function pickPreferredResolvedSingaporeNricFinCandidate(
  first: ResolvedSingaporeNricFinCandidate | null | undefined,
  second: ResolvedSingaporeNricFinCandidate | null | undefined,
): ResolvedSingaporeNricFinCandidate | null {
  if (!first && !second) return null;
  if (!first) return second || null;
  if (!second) return first;

  const firstScore = getResolvedCandidateScore(first);
  const secondScore = getResolvedCandidateScore(second);

  if (firstScore !== secondScore) {
    return firstScore < secondScore ? first : second;
  }

  return first;
}

const OCR_PREFIX_CANDIDATE_MAP: Record<string, readonly SingaporeDocumentPrefix[]> = {
  S: ['S'],
  '5': ['S'],
  T: ['T'],
  '7': ['T'],
  F: ['F'],
  G: ['G'],
  '6': ['G'],
  M: ['M'],
};

const OCR_DIGIT_CANDIDATE_MAP: Record<string, readonly string[]> = {
  '0': ['0'],
  O: ['0'],
  Q: ['0'],
  D: ['0'],
  U: ['0'],
  '1': ['1'],
  I: ['1'],
  L: ['1'],
  J: ['1'],
  '|': ['1'],
  '2': ['2'],
  Z: ['2'],
  '3': ['3'],
  '4': ['4'],
  A: ['4'],
  '5': ['5'],
  S: ['5'],
  '6': ['6'],
  G: ['6'],
  '7': ['7'],
  T: ['7'],
  Y: ['7'],
  '8': ['8'],
  B: ['8'],
  '9': ['9'],
};

/**
 * Normalizes a possible NRIC/FIN string by removing spaces, dashes and punctuation.
 *
 * @param value Raw OCR or user-provided identifier text.
 * @returns Uppercased alphanumeric-only identifier.
 */
export function normalizeSingaporeNricFin(value: string): string {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Masks a Singapore NRIC/FIN while preserving only the prefix and final 3 characters.
 *
 * @param normalized A normalized 9-character NRIC/FIN string.
 * @returns Masked identifier safe for storage/logging.
 */
export function maskSingaporeNricFin(normalized: string): string {
  if (normalized.length !== 9) return normalized;
  return `${normalized[0]}****${normalized.slice(-4)}`;
}

/**
 * Returns the checksum offset for the NRIC/FIN prefix series.
 *
 * @param prefix Prefix letter (`S`, `T`, `F`, `G`, `M`).
 * @returns Numeric checksum offset.
 */
export function getSingaporeNricFinOffset(prefix: SingaporeDocumentPrefix): number {
  if (prefix === 'T' || prefix === 'G') return 4;
  if (prefix === 'M') return 3;
  return 0;
}

/**
 * Resolves the checksum lookup table for the NRIC/FIN prefix series.
 *
 * @param prefix Prefix letter (`S`, `T`, `F`, `G`, `M`).
 * @returns Lookup table indexed by `sum % 11`.
 */
export function getSingaporeNricFinChecksumMap(prefix: SingaporeDocumentPrefix): readonly string[] {
  if (prefix === 'S' || prefix === 'T') return ST_SERIES_CHECKSUM_MAP;
  if (prefix === 'F' || prefix === 'G') return FG_SERIES_CHECKSUM_MAP;
  return M_SERIES_CHECKSUM_MAP;
}

/**
 * Computes the expected checksum letter for a Singapore NRIC/FIN prefix and 7 digits.
 *
 * @param prefix Prefix letter (`S`, `T`, `F`, `G`, `M`).
 * @param digits Seven-digit numeric body.
 * @returns Expected checksum suffix.
 */
export function computeSingaporeNricFinChecksum(prefix: SingaporeDocumentPrefix, digits: string): string {
  const total = digits
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * SINGAPORE_NRIC_FIN_WEIGHTS[index], 0);

  const adjustedTotal = total + getSingaporeNricFinOffset(prefix);
  const remainder = adjustedTotal % 11;
  return getSingaporeNricFinChecksumMap(prefix)[remainder];
}

/**
 * Validates a Singapore NRIC/FIN identifier using the official checksum rules.
 *
 * Supported rules:
 * - Weights: `2, 7, 6, 5, 4, 3, 2`
 * - `T/G` offset: `+4`
 * - `M` offset: `+3`
 * - Series tables: `ST`, `FG`, `M`
 *
 * @param value Raw or normalized identifier.
 * @returns Validation details for the identifier.
 * @throws {Error} When the identifier format is invalid.
 */
export function validateSingaporeNricFin(value: string): SingaporeNricFinValidationResult {
  const normalized = normalizeSingaporeNricFin(value);

  if (!/^[STFGM]\d{7}[A-Z]$/.test(normalized)) {
    throw new Error('Invalid Singapore NRIC/FIN format.');
  }

  const prefix = normalized[0] as SingaporeDocumentPrefix;
  const digits = normalized.slice(1, 8);
  const suffix = normalized[8];
  const expectedSuffix = computeSingaporeNricFinChecksum(prefix, digits);

  return {
    normalized,
    prefix,
    digits,
    suffix,
    expectedSuffix,
    documentType: prefix === 'S' || prefix === 'T' ? 'NRIC' : 'FIN',
    isValid: suffix === expectedSuffix,
    masked: maskSingaporeNricFin(normalized),
  };
}

/**
 * Generates plausible normalized NRIC/FIN candidates from OCR text.
 * This keeps the prefix fixed, repairs common digit OCR mistakes in the middle 7 digits,
 * and also offers a checksum-corrected suffix candidate.
 *
 * @param value Raw OCR-like identifier candidate.
 * @returns Unique normalized candidates in priority order.
 */
export function generateSingaporeNricFinCandidates(value: string): string[] {
  const normalized = normalizeSingaporeNricFin(value);
  if (normalized.length !== 8 && normalized.length !== 9) return [];

  const prefixOptions = OCR_PREFIX_CANDIDATE_MAP[normalized[0]] || [];
  if (prefixOptions.length === 0) return [];

  const digitOptions = normalized
    .slice(1, 8)
    .split('')
    .map((char) => OCR_DIGIT_CANDIDATE_MAP[char] || []);

  if (digitOptions.some((options) => options.length === 0)) {
    return [];
  }

  const suffix = normalized.length === 9 ? normalized[8] : '';
  const digitsList: string[] = [''];

  for (const options of digitOptions) {
    const nextDigits: string[] = [];
    for (const base of digitsList) {
      for (const option of options) {
        nextDigits.push(`${base}${option}`);
      }
    }
    digitsList.splice(0, digitsList.length, ...nextDigits.slice(0, 256));
  }

  const orderedCandidates = new Set<string>();

  for (const prefix of prefixOptions) {
    for (const digits of digitsList) {
      if (suffix) {
        orderedCandidates.add(`${prefix}${digits}${suffix}`);
      }
      orderedCandidates.add(`${prefix}${digits}${computeSingaporeNricFinChecksum(prefix, digits)}`);
    }
  }

  return [...orderedCandidates];
}

/**
 * Collects checksum-valid Singapore NRIC/FIN candidates from OCR output.
 *
 * @param values OCR candidate strings ordered by confidence/preference.
 * @returns Unique valid candidate details in priority order.
 */
export function collectValidSingaporeNricFinCandidates(values: string[]): ResolvedSingaporeNricFinCandidate[] {
  const resolved: ResolvedSingaporeNricFinCandidate[] = [];
  const seen = new Map<string, number>();

  for (const value of values) {
    const rawNormalized = normalizeSingaporeNricFin(value);
    const variants = generateSingaporeNricFinCandidates(value);
    for (const variant of variants) {
      try {
        const validation = validateSingaporeNricFin(variant);
        if (!validation.isValid) continue;
        const nextCandidate: ResolvedSingaporeNricFinCandidate = {
          rawNormalized,
          normalized: validation.normalized,
          correctedByChecksum: rawNormalized !== validation.normalized,
        };
        const existingIndex = seen.get(validation.normalized);

        if (existingIndex !== undefined) {
          resolved[existingIndex] = pickPreferredResolvedSingaporeNricFinCandidate(
            resolved[existingIndex],
            nextCandidate,
          )!;
          continue;
        }

        seen.set(validation.normalized, resolved.length);
        resolved.push(nextCandidate);
      } catch {
        // Ignore invalid intermediate OCR candidates.
      }
    }
  }

  return resolved;
}

/**
 * Resolves the first checksum-valid Singapore NRIC/FIN candidate from OCR output.
 *
 * @param values OCR candidate strings ordered by confidence/preference.
 * @returns Resolved valid candidate details, or `null` when none validate.
 */
export function resolveValidSingaporeNricFinCandidate(values: string[]): ResolvedSingaporeNricFinCandidate | null {
  const resolved = collectValidSingaporeNricFinCandidates(values);
  return resolved[0] || null;
}

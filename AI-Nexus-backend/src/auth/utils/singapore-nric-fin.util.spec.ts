import { describe, expect, it } from '@jest/globals';
import {
  collectValidSingaporeNricFinCandidates,
  computeSingaporeNricFinChecksum,
  validateSingaporeNricFin,
  normalizeSingaporeNricFin,
  maskSingaporeNricFin,
  generateSingaporeNricFinCandidates,
  pickPreferredResolvedSingaporeNricFinCandidate,
  resolveValidSingaporeNricFinCandidate,
  resolveSalesforceIdTypeFromPrefix,
} from './singapore-nric-fin.util';

describe('singapore-nric-fin.util', () => {
  describe('computeSingaporeNricFinChecksum', () => {
    it('computes valid ST series checksums', () => {
      expect(computeSingaporeNricFinChecksum('S', '1234567')).toBe('D');
      expect(computeSingaporeNricFinChecksum('T', '1234567')).toBe('J');
    });

    it('computes valid FG and M series checksums', () => {
      expect(computeSingaporeNricFinChecksum('F', '1234567')).toBe('N');
      expect(computeSingaporeNricFinChecksum('G', '1234567')).toBe('X');
      expect(computeSingaporeNricFinChecksum('M', '1234567')).toBe('K');
    });
  });

  describe('validateSingaporeNricFin', () => {
    it('accepts valid mock identifiers across all supported series', () => {
      expect(validateSingaporeNricFin('S1234567D').isValid).toBe(true);
      expect(validateSingaporeNricFin('T1234567J').isValid).toBe(true);
      expect(validateSingaporeNricFin('F1234567N').isValid).toBe(true);
      expect(validateSingaporeNricFin('G1234567X').isValid).toBe(true);
      expect(validateSingaporeNricFin('M1234567K').isValid).toBe(true);
    });

    it('rejects identifiers with invalid checksum letters', () => {
      expect(validateSingaporeNricFin('S1234567A').isValid).toBe(false);
      expect(validateSingaporeNricFin('F1234567K').isValid).toBe(false);
      expect(validateSingaporeNricFin('M1234567X').isValid).toBe(false);
    });

    it('throws on invalid formats', () => {
      expect(() => validateSingaporeNricFin('A1234567D')).toThrow('Invalid Singapore NRIC/FIN format.');
      expect(() => validateSingaporeNricFin('S1234D')).toThrow('Invalid Singapore NRIC/FIN format.');
      expect(() => validateSingaporeNricFin('')).toThrow('Invalid Singapore NRIC/FIN format.');
    });
  });

  describe('helpers', () => {
    it('normalizes OCR-like formatting', () => {
      expect(normalizeSingaporeNricFin('s123-4567 d')).toBe('S1234567D');
    });

    it('masks identifiers safely', () => {
      expect(maskSingaporeNricFin('S1234567D')).toBe('S****567D');
    });

    it('generates OCR-tolerant candidates and checksum-corrected variants', () => {
      expect(generateSingaporeNricFinCandidates('S1234567A')).toContain('S1234567D');
      expect(generateSingaporeNricFinCandidates('S12B4567A')).toContain('S1284567A');
      expect(generateSingaporeNricFinCandidates('58520185I')).toContain('S8520185I');
      expect(generateSingaporeNricFinCandidates('S8520185')).toContain('S8520185I');
      expect(generateSingaporeNricFinCandidates('S8SZO18S')).toContain('S8520185I');
    });

    it('resolves a checksum-valid candidate from OCR-like input', () => {
      expect(resolveValidSingaporeNricFinCandidate(['S1234567A'])).toEqual({
        rawNormalized: 'S1234567A',
        normalized: 'S1234567D',
        correctedByChecksum: true,
      });
      const resolved = resolveValidSingaporeNricFinCandidate(['S12B4567A']);
      expect(resolved).not.toBeNull();
      expect(resolved?.rawNormalized).toBe('S12B4567A');
      expect(resolved?.normalized).toMatch(/^S\d{7}[A-Z]$/);
      expect(resolved?.correctedByChecksum).toBe(true);
    });

    it('collects all valid OCR candidates in priority order', () => {
      expect(collectValidSingaporeNricFinCandidates(['S1234567A', 'S1234567D'])).toEqual([
        {
          rawNormalized: 'S1234567D',
          normalized: 'S1234567D',
          correctedByChecksum: false,
        },
      ]);
    });

    it('resolves prefix OCR mistakes like 5 instead of S', () => {
      expect(resolveValidSingaporeNricFinCandidate(['58520185I'])).toEqual({
        rawNormalized: '58520185I',
        normalized: 'S8520185I',
        correctedByChecksum: true,
      });
    });

    it('resolves candidates that are missing the final checksum letter', () => {
      expect(resolveValidSingaporeNricFinCandidate(['S8520185'])).toEqual({
        rawNormalized: 'S8520185',
        normalized: 'S8520185I',
        correctedByChecksum: true,
      });
    });

    it('resolves mixed OCR mistakes across multiple digits', () => {
      expect(resolveValidSingaporeNricFinCandidate(['S8SZO18S'])).toEqual({
        rawNormalized: 'S8SZO18S',
        normalized: 'S8520185I',
        correctedByChecksum: true,
      });
    });

    it('prefers the cleanest raw OCR value for the same canonical identifier', () => {
      expect(collectValidSingaporeNricFinCandidates(['58520185I', 'S8520185I'])).toEqual([
        {
          rawNormalized: 'S8520185I',
          normalized: 'S8520185I',
          correctedByChecksum: false,
        },
      ]);
    });

    it('prefers the cleaner front/back raw candidate when both resolve to the same identifier', () => {
      expect(
        pickPreferredResolvedSingaporeNricFinCandidate(
          {
            rawNormalized: '58520185I',
            normalized: 'S8520185I',
            correctedByChecksum: true,
          },
          {
            rawNormalized: 'S8520185I',
            normalized: 'S8520185I',
            correctedByChecksum: false,
          },
        ),
      ).toEqual({
        rawNormalized: 'S8520185I',
        normalized: 'S8520185I',
        correctedByChecksum: false,
      });
    });
  });

  describe('resolveSalesforceIdTypeFromPrefix', () => {
    it('maps citizen prefixes to Blue NRIC', () => {
      expect(resolveSalesforceIdTypeFromPrefix('S')).toBe('Blue NRIC');
      expect(resolveSalesforceIdTypeFromPrefix('t')).toBe('Blue NRIC');
    });

    it('maps PR prefixes to Pink NRIC', () => {
      expect(resolveSalesforceIdTypeFromPrefix('F')).toBe('Pink NRIC');
      expect(resolveSalesforceIdTypeFromPrefix('g')).toBe('Pink NRIC');
    });

    it('returns null for FIN and unknown prefixes', () => {
      expect(resolveSalesforceIdTypeFromPrefix('M')).toBeNull();
      expect(resolveSalesforceIdTypeFromPrefix('')).toBeNull();
    });
  });
});

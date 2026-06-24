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
  resolveSalesforceIdTypeByCardColorOrNationality,
  resolveSalesforceIdTypeForNricNumber,
  isSalesforceBlueNricIdType,
  isSalesforcePinkNricIdType,
  isSalesforceCitizenOrPrNricIdType,
  mapSingaporeNricFinUserErrorMessage,
  parseSingaporeNricDisplayName,
  SINGAPORE_NRIC_FIN_USER_MESSAGES,
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

  describe('resolveSalesforceIdTypeByCardColorOrNationality', () => {
    it('prefers detected card color', () => {
      expect(
        resolveSalesforceIdTypeByCardColorOrNationality({
          cardColor: 'pink',
          nationality: '',
        }),
      ).toBe('Pink NRIC');

      expect(
        resolveSalesforceIdTypeByCardColorOrNationality({
          cardColor: 'BLUE CARD',
          nationality: 'MALAYSIAN',
        }),
      ).toBe('Blue NRIC');
    });

    it('falls back to foreign nationality when color is unknown', () => {
      expect(
        resolveSalesforceIdTypeByCardColorOrNationality({
          cardColor: '',
          nationality: 'MALAYSIAN',
        }),
      ).toBe('Pink NRIC');
    });

    it('treats Singapore nationality as Blue NRIC', () => {
      expect(
        resolveSalesforceIdTypeByCardColorOrNationality({
          cardColor: '',
          nationality: 'SINGAPORE',
        }),
      ).toBe('Blue NRIC');
    });

    it('defaults to Singapore citizen when no color and no nationality', () => {
      expect(
        resolveSalesforceIdTypeByCardColorOrNationality({
          cardColor: '',
          nationality: '',
        }),
      ).toBe('Blue NRIC');
    });
  });

  describe('resolveSalesforceIdTypeForNricNumber', () => {
    it('prefers explicit id type from AI verification', () => {
      expect(
        resolveSalesforceIdTypeForNricNumber('S1234567D', {
          nationality: 'MALAYSIAN',
          explicitIdType: 'Pink NRIC',
        }),
      ).toBe('Pink NRIC');
    });

    it('falls back to card color and nationality when no explicit id type', () => {
      expect(
        resolveSalesforceIdTypeForNricNumber('S1234567D', {
          cardColor: 'blue',
        }),
      ).toBe('Blue NRIC');
    });
  });

  describe('isSalesforceCitizenOrPrNricIdType', () => {
    it('accepts flexible Blue NRIC labels', () => {
      expect(isSalesforceBlueNricIdType('Blue NRIC')).toBe(true);
      expect(isSalesforceBlueNricIdType('NRIC Blue')).toBe(true);
      expect(isSalesforceBlueNricIdType('blue nric')).toBe(true);
    });

    it('accepts flexible Pink NRIC labels', () => {
      expect(isSalesforcePinkNricIdType('Pink NRIC')).toBe(true);
      expect(isSalesforcePinkNricIdType('NRIC Pink')).toBe(true);
      expect(isSalesforcePinkNricIdType('pink nric')).toBe(true);
    });

    it('rejects unrelated id types', () => {
      expect(isSalesforceCitizenOrPrNricIdType('Passport')).toBe(false);
      expect(isSalesforceCitizenOrPrNricIdType('Blue Card')).toBe(false);
    });
  });

  describe('mapSingaporeNricFinUserErrorMessage', () => {
    it('maps checksum errors to plain language', () => {
      expect(
        mapSingaporeNricFinUserErrorMessage('Invalid Singapore NRIC/FIN checksum for id_number.'),
      ).toBe(SINGAPORE_NRIC_FIN_USER_MESSAGES.invalidChecksum);
    });

    it('maps format errors to plain language', () => {
      expect(
        mapSingaporeNricFinUserErrorMessage('Invalid Singapore NRIC/FIN format for id_number.'),
      ).toBe(SINGAPORE_NRIC_FIN_USER_MESSAGES.invalidFormat);
    });

    it('maps id_type mismatch errors', () => {
      expect(
        mapSingaporeNricFinUserErrorMessage('id_number does not match the specified id_type.'),
      ).toBe(SINGAPORE_NRIC_FIN_USER_MESSAGES.idTypeMismatch);
    });
  });

  describe('parseSingaporeNricDisplayName', () => {
    it('splits surname-first NRIC names into given name and surname', () => {
      expect(parseSingaporeNricDisplayName('LIU XIANLONG, EDMUND')).toEqual({
        firstname: 'XIANLONG EDMUND',
        lastname: 'LIU',
        nameAsPerId: 'LIU XIANLONG, EDMUND',
      });
    });

    it('handles simple two-part names', () => {
      expect(parseSingaporeNricDisplayName('TAN AH KOW')).toEqual({
        firstname: 'AH KOW',
        lastname: 'TAN',
        nameAsPerId: 'TAN AH KOW',
      });
    });

    it('normalizes spacing and casing', () => {
      expect(parseSingaporeNricDisplayName('  liu   xianlong,   edmund  ')).toEqual({
        firstname: 'XIANLONG EDMUND',
        lastname: 'LIU',
        nameAsPerId: 'LIU XIANLONG, EDMUND',
      });
    });
  });
});

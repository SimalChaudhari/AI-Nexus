import { isSalesforceCitizenOrPrIdType } from 'src/utils/nric-id-type';

export const CITIZENSHIP_RECORD_GAP_MESSAGE =
  'Based on your account record, you are not an ISCA member and we do not have your NRIC and citizenship record. If you are a Singaporean or Permanent Resident of Singapore, please update your account with your citizenship information.';

function readNexusFieldRaw(nexusInfo, keys) {
  if (!nexusInfo || typeof nexusInfo !== 'object') return undefined;
  const sources = [nexusInfo, nexusInfo.nexusUser].filter(Boolean);
  for (const source of sources) {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
  }
  return undefined;
}

function readNexusField(nexusInfo, keys) {
  const value = readNexusFieldRaw(nexusInfo, keys);
  return value === undefined || value === null ? '' : String(value).trim();
}

export function isSalesforceNexusMemberAccount(nexusInfo) {
  const accountType = readNexusField(nexusInfo, ['accountType', 'account_type']).toLowerCase();
  if (accountType === 'member') return true;

  const memberClass = readNexusField(nexusInfo, ['memberClass', 'member_class']).toUpperCase();
  if (!memberClass) return false;
  if (memberClass.includes('NON')) return false;
  return true;
}

export function extractNricNumberFromNexusUser(nexusInfo) {
  return readNexusField(nexusInfo, ['NRIC_Number', 'nric_Number', 'nricNumber']).toUpperCase();
}

export function extractIdTypeFromNexusUser(nexusInfo) {
  return readNexusField(nexusInfo, ['idType', 'id_type', 'IDType']);
}

export function extractIsAiNexusUserFromNexusUser(nexusInfo) {
  const value = readNexusFieldRaw(nexusInfo, ['isAINexusUser', 'isAiNexusUser', 'is_ai_nexus_user']);
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Non-members without Blue/Pink NRIC + NRIC on file should see the citizenship gap screen
 * instead of being sent straight to paid signup.
 *
 * @param {Record<string, unknown>} [nexusInfo]
 * @returns {{ allowed: boolean, showCitizenshipGapScreen: boolean, reason: string }}
 */
export function evaluateNexusCitizenshipLoginEligibility(nexusInfo) {
  if (isSalesforceNexusMemberAccount(nexusInfo)) {
    return { allowed: true, showCitizenshipGapScreen: false, reason: 'member' };
  }

  const nricNumber = extractNricNumberFromNexusUser(nexusInfo);
  const idType = extractIdTypeFromNexusUser(nexusInfo);
  const hasCitizenOrPrIdType = isSalesforceCitizenOrPrIdType(idType);

  if (nricNumber && hasCitizenOrPrIdType) {
    return { allowed: true, showCitizenshipGapScreen: false, reason: 'nric_record' };
  }

  return {
    allowed: false,
    showCitizenshipGapScreen: true,
    reason: 'citizenship_gap',
  };
}

export function shouldShowCitizenshipRecordGapScreen(nexusInfo) {
  return evaluateNexusCitizenshipLoginEligibility(nexusInfo).showCitizenshipGapScreen;
}

export function isCitizenshipRecordGapFlow(flow) {
  return flow?.showCitizenshipRecordGap === true && flow?.citizenshipUpdateMode !== true;
}

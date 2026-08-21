export const ADMIN_ENROLMENT_FIELDS = [
  { key: 'email', label: 'Email' },
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'nameAsPerId', label: 'Name as per ID' },
  { key: 'idType', label: 'ID type' },
  { key: 'idNumber', label: 'NRIC / FIN / Passport' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'citizenship', label: 'Citizenship' },
  { key: 'isca', label: 'ISCA member / Non-member' },
  { key: 'otherBodies', label: 'Other accounting bodies' },
  { key: 'job', label: 'Job function' },
  { key: 'accounting', label: 'Accounting related' },
  { key: 'org', label: 'Organisation name' },
  { key: 'memberId', label: 'ISCA member ID' },
  { key: 'userId', label: 'User ID' },
] as const;

export type AdminEnrolmentFieldKey = (typeof ADMIN_ENROLMENT_FIELDS)[number]['key'];

export type AdminEnrolmentColumnIndex = Record<AdminEnrolmentFieldKey, number>;

export type AdminEnrolmentHeaderMapping = {
  field: AdminEnrolmentFieldKey;
  label: string;
  header: string;
  source: 'ai' | 'rules';
};

export type AdminEnrolmentMappedRow = {
  email: string;
  firstname: string;
  lastname: string;
  nameAsPerId: string;
  rawIdType: string;
  idType: string;
  idNumber: string;
  nationality: string;
  citizenshipRaw: string;
  eligibility: 'Singapore Citizen' | 'Singapore PR' | 'Foreigner';
  eligibilityIsSingaporePr: boolean;
  countryOfResidence: string;
  jobFunction: string;
  learnerAsAnAccounting: string;
  iscaMemberStatus: string;
  accountType: string;
  eligibilityIsIscaMember: boolean;
  membershipNumber: string;
  otherAccountingBodies: string;
  organisationName: string;
};

export function compactHeader(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function isMyIdType(idType: string): boolean {
  return compactHeader(idType) === 'myid';
}

export function mapNationalityToCountry(nationality: string): string {
  const n = String(nationality || '').trim().toLowerCase();
  if (n === 'singapore' || n === 'singaporean') return 'Singapore';
  if (n === 'malaysian' || n === 'malaysia') return 'Malaysia';
  if (n === 'chinese' || n === 'china') return 'China';
  if (n === 'indonesian' || n === 'indonesia') return 'Indonesia';
  if (n === 'filipino' || n === 'philippines') return 'Philippines';
  return String(nationality || '').trim() || 'Singapore';
}

export function mapCategoryAndCountry(params: {
  idType: string;
  citizenship: string;
  nationality: string;
}): {
  eligibility: AdminEnrolmentMappedRow['eligibility'];
  eligibilityIsSingaporePr: boolean;
  countryOfResidence: string;
} {
  const cit = String(params.citizenship || '').trim().toLowerCase();
  const id = String(params.idType || '').trim().toLowerCase();
  const isNonSingaporean =
    cit.includes('non-singapore') || cit.includes('non singapore') || cit.includes('foreigner');

  if (isNonSingaporean || id === 'fin' || id === 'passport' || isMyIdType(params.idType)) {
    return {
      eligibility: 'Foreigner',
      eligibilityIsSingaporePr: false,
      countryOfResidence: mapNationalityToCountry(params.nationality),
    };
  }
  if (id === 'pink' || cit.includes('citizen')) {
    return {
      eligibility: 'Singapore Citizen',
      eligibilityIsSingaporePr: false,
      countryOfResidence: 'Singapore',
    };
  }
  if (id === 'blue' || cit.includes('pr') || cit.includes('permanent')) {
    return {
      eligibility: 'Singapore PR',
      eligibilityIsSingaporePr: true,
      countryOfResidence: 'Singapore',
    };
  }
  return {
    eligibility: 'Singapore Citizen',
    eligibilityIsSingaporePr: false,
    countryOfResidence: 'Singapore',
  };
}

export function mapAccountType(status: string): {
  accountType: string;
  eligibilityIsIscaMember: boolean;
} {
  const lower = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (/non\s*member/.test(lower)) {
    return { accountType: 'Non member', eligibilityIsIscaMember: false };
  }
  if (
    (lower.includes('isca') && lower.includes('member'))
    || (lower.includes('member') && !lower.includes('non'))
  ) {
    return { accountType: 'Member', eligibilityIsIscaMember: true };
  }
  return { accountType: '', eligibilityIsIscaMember: false };
}

export function maskNric(idNumber: string): string | null {
  const normalized = String(idNumber || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!normalized) return null;
  if (normalized.length === 9) {
    return `${normalized[0]}****${normalized.slice(-4)}`;
  }
  return idNumber;
}

export function resolveIdFields(rawIdType: string, rawIdNumber: string): {
  idType: string;
  idNumber: string;
} {
  if (isMyIdType(rawIdType)) {
    return { idType: 'Passport', idNumber: '' };
  }
  return {
    idType: String(rawIdType || '').trim(),
    idNumber: String(rawIdNumber || '').trim(),
  };
}

export function membershipNumberFromRow(memberId: string, userId: string): string {
  const raw = String(memberId || userId || '').trim();
  if (!raw || raw.includes('@') || /^na$/i.test(raw)) return '';
  return raw;
}

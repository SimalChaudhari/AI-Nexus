import { UserEntity } from './users.entity';
import { AdminUserProgressFlags } from '../course/admin-user-progress.service';

export const ADMIN_USER_EXPORT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'firstname', label: 'First name' },
  { key: 'lastname', label: 'Last name' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'contactNumber', label: 'Contact number' },
  { key: 'company', label: 'Company' },
  { key: 'companyCode', label: 'Company code' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'authProvider', label: 'OAuth / Auth' },
  { key: 'isVerified', label: 'Email verified' },
  { key: 'feeWaiverJobVerified', label: 'Job / HR verified' },
  { key: 'persona', label: 'Persona' },
  { key: 'financeRole', label: 'Finance role' },
  { key: 'createdAt', label: 'Created at' },
  { key: 'lastLoginAt', label: 'Last login' },
  { key: 'hasBadgeCertificate', label: 'Badge & certificate' },
  { key: 'certificateNo', label: 'Certificate no' },
  { key: 'pillarsCurrent', label: 'Pillars current complete' },
  { key: 'pillars100', label: 'All pillars 100%' },
  { key: 'pillar1Percent', label: 'Pillar 1 %' },
  { key: 'pillar2Percent', label: 'Pillar 2 %' },
  { key: 'pillar3Percent', label: 'Pillar 3 %' },
] as const;

export type AdminUserExportFieldKey = (typeof ADMIN_USER_EXPORT_FIELDS)[number]['key'];

const DEFAULT_EXPORT_FIELDS: AdminUserExportFieldKey[] = [
  'name',
  'firstname',
  'lastname',
  'email',
];

const PROGRESS_FIELD_KEYS = new Set<AdminUserExportFieldKey>([
  'hasBadgeCertificate',
  'certificateNo',
  'pillarsCurrent',
  'pillars100',
  'pillar1Percent',
  'pillar2Percent',
  'pillar3Percent',
]);

export function parseAdminUserExportFields(raw?: string | string[]): AdminUserExportFieldKey[] {
  const allowed = new Set(ADMIN_USER_EXPORT_FIELDS.map((f) => f.key));
  const values = Array.isArray(raw)
    ? raw
    : String(raw || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
  const selected = values.filter((v): v is AdminUserExportFieldKey =>
    allowed.has(v as AdminUserExportFieldKey),
  );
  return selected.length ? selected : [...DEFAULT_EXPORT_FIELDS];
}

export function adminUserExportNeedsProgress(fields: AdminUserExportFieldKey[]): boolean {
  return fields.some((key) => PROGRESS_FIELD_KEYS.has(key));
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function displayName(user: UserEntity): string {
  return `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username || '';
}

function resolveFieldValue(
  key: AdminUserExportFieldKey,
  user: UserEntity & { companyName?: string | null; company?: string | null },
  progress?: AdminUserProgressFlags,
): string {
  switch (key) {
    case 'name':
      return displayName(user);
    case 'firstname':
      return user.firstname || '';
    case 'lastname':
      return user.lastname || '';
    case 'username':
      return user.username || '';
    case 'email':
      return user.email || '';
    case 'contactNumber':
      return user.contactNumber || '';
    case 'company':
      return user.companyName || user.company || '';
    case 'companyCode':
      return user.companyCode || '';
    case 'role':
      return user.role || '';
    case 'status':
      return user.status || '';
    case 'authProvider':
      return user.authProvider || '';
    case 'isVerified':
      return yesNo(Boolean(user.isVerified));
    case 'feeWaiverJobVerified':
      return user.feeWaiverJobVerified == null ? '' : yesNo(Boolean(user.feeWaiverJobVerified));
    case 'persona':
      return user.persona || '';
    case 'financeRole':
      return user.financeRole || '';
    case 'createdAt':
      return formatDate(user.createdAt);
    case 'lastLoginAt':
      return formatDate(user.lastLoginAt);
    case 'hasBadgeCertificate':
      return yesNo(Boolean(progress?.hasBadgeCertificate));
    case 'certificateNo':
      return progress?.certificateNo || '';
    case 'pillarsCurrent':
      return yesNo(Boolean(progress?.pillarsCurrent));
    case 'pillars100':
      return yesNo(Boolean(progress?.pillars100));
    case 'pillar1Percent':
      return String(progress?.pillar1Percent ?? 0);
    case 'pillar2Percent':
      return String(progress?.pillar2Percent ?? 0);
    case 'pillar3Percent':
      return String(progress?.pillar3Percent ?? 0);
    default:
      return '';
  }
}

function escapeCsv(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function buildAdminUsersCsv(params: {
  users: Array<UserEntity & { companyName?: string | null; company?: string | null }>;
  fields: AdminUserExportFieldKey[];
  progressByUser?: Map<string, AdminUserProgressFlags>;
  filenamePrefix?: string;
}): { filename: string; csv: string } {
  const fieldMeta = new Map(ADMIN_USER_EXPORT_FIELDS.map((f) => [f.key, f.label]));
  const header = params.fields.map((key) => fieldMeta.get(key) || key);
  const lines = params.users.map((user) =>
    params.fields
      .map((key) => escapeCsv(resolveFieldValue(key, user, params.progressByUser?.get(user.id))))
      .join(','),
  );
  const csv = `\uFEFF${[header.join(','), ...lines].join('\n')}`;
  const stamp = new Date().toISOString().slice(0, 10);
  const prefix = params.filenamePrefix || 'admin-users-export';
  return { filename: `${prefix}-${stamp}.csv`, csv };
}

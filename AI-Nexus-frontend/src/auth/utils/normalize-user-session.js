import { resolveAssetUrl } from 'src/utils/asset-url';

// ----------------------------------------------------------------------

function buildDisplayName(user) {
  const explicit = typeof user.displayName === 'string' ? user.displayName.trim() : '';
  if (explicit) return explicit;

  const fullName = [user.firstname ?? user.firstName, user.lastname ?? user.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (fullName) return fullName;

  return user.username || user.email || '';
}

/** Normalize API/profile user shape for sessionStorage and auth context. */
export function normalizeUserForSession(user) {
  if (!user || typeof user !== 'object') return user;

  const avatarUrl = resolveAssetUrl(user.avatarUrl ?? user.photoURL ?? '');

  return {
    ...user,
    id: user.id || user._id,
    _id: user._id || user.id,
    firstname: user.firstname ?? user.firstName ?? '',
    lastname: user.lastname ?? user.lastName ?? '',
    displayName: buildDisplayName(user),
    isVerified: user.isVerified ?? user.isVerify ?? false,
    avatarUrl,
    photoURL: avatarUrl,
    contactNumber: user.contactNumber ?? user.phoneNumber ?? '',
    isSCAQCandidate: user.isSCAQCandidate ?? null,
    isAssociateMember: user.isAssociateMember ?? null,
    salesforceAccountId: user.salesforceAccountId ?? null,
    salesforceAccountType: user.salesforceAccountType ?? null,
    salesforceMemberClass: user.salesforceMemberClass ?? null,
    salesforceUsername: user.salesforceUsername ?? null,
    salesforceSyncedAt: user.salesforceSyncedAt ?? null,
    salesforceUserInfoRaw:
      user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
        ? user.salesforceUserInfoRaw
        : null,
    eligibilitySnapshot:
      user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
        ? user.eligibilitySnapshot
        : null,
  };
}

/** Persist API profile data to sessionStorage so auth context matches the server. */
export function syncApiUserToSession(apiUser) {
  if (!apiUser || typeof apiUser !== 'object') return null;

  let existing = {};
  try {
    const raw = sessionStorage.getItem('user');
    if (raw) existing = JSON.parse(raw);
  } catch {
    existing = {};
  }

  const normalized = normalizeUserForSession({
    ...existing,
    ...apiUser,
    id: apiUser.id || existing.id || existing._id,
    _id: apiUser.id || existing._id || existing.id,
  });

  sessionStorage.setItem('user', JSON.stringify(normalized));
  return normalized;
}

import { resolveAssetUrl } from 'src/utils/asset-url';

// ----------------------------------------------------------------------

/** Normalize API/profile user shape for sessionStorage and auth context. */
export function normalizeUserForSession(user) {
  if (!user || typeof user !== 'object') return user;

  return {
    ...user,
    id: user.id || user._id,
    _id: user._id || user.id,
    firstname: user.firstname ?? user.firstName ?? '',
    lastname: user.lastname ?? user.lastName ?? '',
    isVerified: user.isVerified ?? user.isVerify ?? false,
    avatarUrl: resolveAssetUrl(user.avatarUrl ?? user.photoURL ?? ''),
    contactNumber: user.contactNumber ?? user.phoneNumber ?? '',
    isSCAQCandidate: user.isSCAQCandidate ?? null,
    isAssociateMember: user.isAssociateMember ?? null,
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

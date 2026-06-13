// ----------------------------------------------------------------------
// Salesforce Student Membership API — base path + route segments
// Full URL = OAUTH_INSTANCE_URL + base path + route segment [+ applicationId]
// ----------------------------------------------------------------------

export const OAUTH_STUDENT_MEMBERSHIP_API_BASE_PATH =
  process.env.OAUTH_STUDENT_MEMBERSHIP_API_BASE_PATH?.trim()
  || '/services/apexrest/api/student-membership';

export const OAUTH_STUDENT_MEMBERSHIP_API_ROUTES = {
  application: 'application',
  updateApplication: 'updateapplication',
  submitApplication: 'applicationsubmit',
  userCheck: 'usercheck',
  getApplicationDetails: 'getapplicationdetails',
} as const;

export type OAuthStudentMembershipApiRouteKey = keyof typeof OAUTH_STUDENT_MEMBERSHIP_API_ROUTES;

const ROUTE_PATH_ENV: Record<OAuthStudentMembershipApiRouteKey, string> = {
  application: 'OAUTH_STUDENT_MEMBERSHIP_API_ROUTE_APPLICATION',
  updateApplication: 'OAUTH_STUDENT_MEMBERSHIP_API_ROUTE_UPDATE_APPLICATION',
  submitApplication: 'OAUTH_STUDENT_MEMBERSHIP_API_ROUTE_SUBMIT_APPLICATION',
  userCheck: 'OAUTH_STUDENT_MEMBERSHIP_API_ROUTE_USER_CHECK',
  getApplicationDetails: 'OAUTH_STUDENT_MEMBERSHIP_API_ROUTE_GET_APPLICATION_DETAILS',
};

const LEGACY_FULL_URL_ENV: Partial<Record<OAuthStudentMembershipApiRouteKey, string>> = {
  application: 'OAUTH_STUDENT_MEMBERSHIP_APPLICATION_URL',
  updateApplication: 'OAUTH_STUDENT_MEMBERSHIP_UPDATE_APPLICATION_URL',
  submitApplication: 'OAUTH_STUDENT_MEMBERSHIP_SUBMIT_APPLICATION_URL',
  userCheck: 'OAUTH_STUDENT_MEMBERSHIP_USER_CHECK_URL',
  getApplicationDetails: 'OAUTH_STUDENT_MEMBERSHIP_GET_APPLICATION_DETAILS_URL',
};

function normalizeLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function getOAuthStudentMembershipApiPath(
  route: OAuthStudentMembershipApiRouteKey,
  applicationId?: string,
): string {
  const routeOverride = process.env[ROUTE_PATH_ENV[route]]?.trim();
  const segment = routeOverride || OAUTH_STUDENT_MEMBERSHIP_API_ROUTES[route];
  const base = normalizeLeadingSlash(OAUTH_STUDENT_MEMBERSHIP_API_BASE_PATH).replace(/\/$/, '');
  const suffix = segment.replace(/^\//, '');
  const id = String(applicationId || '').trim();
  if (id && route !== 'application' && route !== 'userCheck') {
    return `${base}/${suffix}/${id}`;
  }
  return `${base}/${suffix}`;
}

export interface BuildOAuthStudentMembershipApiUrlOptions {
  siteBaseUrl?: string;
  integrationBaseUrl?: string;
  applicationId?: string;
}

export function buildOAuthStudentMembershipApiUrl(
  route: OAuthStudentMembershipApiRouteKey,
  options: BuildOAuthStudentMembershipApiUrlOptions = {},
): string {
  const legacyKey = LEGACY_FULL_URL_ENV[route];
  if (legacyKey) {
    const legacyUrl = process.env[legacyKey]?.trim();
    if (legacyUrl) {
      const id = String(options.applicationId || '').trim();
      if (id && route !== 'application' && route !== 'userCheck' && !legacyUrl.includes(id)) {
        return `${legacyUrl.replace(/\/$/, '')}/${id}`;
      }
      return legacyUrl;
    }
  }

  const path = getOAuthStudentMembershipApiPath(route, options.applicationId);
  const siteBase = options.siteBaseUrl?.replace(/\/$/, '');
  if (siteBase) return `${siteBase}${path}`;

  const integrationBase = options.integrationBaseUrl?.replace(/\/$/, '');
  if (integrationBase) return `${integrationBase}${path}`;

  return path;
}

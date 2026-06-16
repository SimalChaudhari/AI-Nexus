// ----------------------------------------------------------------------
// Salesforce ApplicationAPI (Nexus membership application) — single base + routes
// Full URL = OAUTH_INSTANCE_URL (or integration base) + base path + route segment
// ----------------------------------------------------------------------

/** Apex REST path prefix for all membership application endpoints. */
export const OAUTH_APPLICATION_API_BASE_PATH =
  process.env.OAUTH_APPLICATION_API_BASE_PATH?.trim()
  || '/services/apexrest/mobileAPI/v1/ApplicationAPI';

/** Route segment appended to the base path (one per ApplicationAPI operation). */
export const OAUTH_APPLICATION_API_ROUTES = {
  create: 'createApplicationNexus',
  personalDetails: 'createApplicationPersonalDetailsNexus',
  employmentDetails: 'createEmploymentDetailsNexus',
  academicQualification: 'createAcademicQualificationNexus',
  professionalQualification: 'createProfessionalQualificationNexus',
  ato: 'createATONexus',
  opb: 'createMembershipForOPBNexus',
  characterReference: 'createCharacterReferenceNexus',
  declaration: 'createDeclarationNexus',
  residentialDeclaration: 'createResidentialDeclarationNexus',
  availableDocumentTypes: 'getAvailableDocumentTypesNexus',
  uploadDocument: 'uploadDocumentNexus',
  checkoutDetails: 'getCheckoutDetailsForNexus',
  createBilling: 'createBillingNexus',
} as const;

export type OAuthApplicationApiRouteKey = keyof typeof OAUTH_APPLICATION_API_ROUTES;

const ROUTE_PATH_ENV: Record<OAuthApplicationApiRouteKey, string> = {
  create: 'OAUTH_APPLICATION_API_ROUTE_CREATE',
  personalDetails: 'OAUTH_APPLICATION_API_ROUTE_PERSONAL_DETAILS',
  employmentDetails: 'OAUTH_APPLICATION_API_ROUTE_EMPLOYMENT_DETAILS',
  academicQualification: 'OAUTH_APPLICATION_API_ROUTE_ACADEMIC_QUALIFICATION',
  professionalQualification: 'OAUTH_APPLICATION_API_ROUTE_PROFESSIONAL_QUALIFICATION',
  ato: 'OAUTH_APPLICATION_API_ROUTE_ATO',
  opb: 'OAUTH_APPLICATION_API_ROUTE_OPB',
  characterReference: 'OAUTH_APPLICATION_API_ROUTE_CHARACTER_REFERENCE',
  declaration: 'OAUTH_APPLICATION_API_ROUTE_DECLARATION',
  residentialDeclaration: 'OAUTH_APPLICATION_API_ROUTE_RESIDENTIAL_DECLARATION',
  availableDocumentTypes: 'OAUTH_APPLICATION_API_ROUTE_AVAILABLE_DOCUMENT_TYPES',
  uploadDocument: 'OAUTH_APPLICATION_API_ROUTE_UPLOAD_DOCUMENT',
  checkoutDetails: 'OAUTH_APPLICATION_API_ROUTE_CHECKOUT_DETAILS',
  createBilling: 'OAUTH_APPLICATION_API_ROUTE_CREATE_BILLING',
};

/** @deprecated Legacy full-URL env vars — prefer OAUTH_INSTANCE_URL + routes above. */
const LEGACY_FULL_URL_ENV: Partial<Record<OAuthApplicationApiRouteKey, string>> = {
  create: 'OAUTH_APPLICATION_CREATE_URL',
  personalDetails: 'OAUTH_APPLICATION_PERSONAL_DETAILS_URL',
  employmentDetails: 'OAUTH_APPLICATION_EMPLOYMENT_DETAILS_URL',
  academicQualification: 'OAUTH_APPLICATION_ACADEMIC_QUALIFICATION_URL',
  professionalQualification: 'OAUTH_APPLICATION_PROFESSIONAL_QUALIFICATION_URL',
  ato: 'OAUTH_APPLICATION_ATO_URL',
  opb: 'OAUTH_APPLICATION_OPB_URL',
  characterReference: 'OAUTH_APPLICATION_CHARACTER_REFERENCE_URL',
  declaration: 'OAUTH_APPLICATION_DECLARATION_URL',
  residentialDeclaration: 'OAUTH_APPLICATION_RESIDENTIAL_DECLARATION_URL',
  availableDocumentTypes: 'OAUTH_APPLICATION_AVAILABLE_DOCUMENT_TYPES_URL',
  uploadDocument: 'OAUTH_APPLICATION_UPLOAD_DOCUMENT_URL',
  checkoutDetails: 'OAUTH_APPLICATION_CHECKOUT_DETAILS_URL',
  createBilling: 'OAUTH_APPLICATION_CREATE_BILLING_URL',
};

function normalizeLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/** Resolved Apex path for a route (e.g. /services/apexrest/.../createApplicationNexus). */
export function getOAuthApplicationApiPath(route: OAuthApplicationApiRouteKey): string {
  const routeOverride = process.env[ROUTE_PATH_ENV[route]]?.trim();
  const segment = routeOverride || OAUTH_APPLICATION_API_ROUTES[route];
  const base = normalizeLeadingSlash(OAUTH_APPLICATION_API_BASE_PATH).replace(/\/$/, '');
  const suffix = segment.replace(/^\//, '');
  return `${base}/${suffix}`;
}

export interface BuildOAuthApplicationApiUrlOptions {
  siteBaseUrl?: string;
  integrationBaseUrl?: string;
}

/** Build full ApplicationAPI URL for a route. */
export function buildOAuthApplicationApiUrl(
  route: OAuthApplicationApiRouteKey,
  options: BuildOAuthApplicationApiUrlOptions = {},
): string {
  const legacyKey = LEGACY_FULL_URL_ENV[route];
  if (legacyKey) {
    const legacyUrl = process.env[legacyKey]?.trim();
    if (legacyUrl) return legacyUrl;
  }

  const path = getOAuthApplicationApiPath(route);
  const siteBase = options.siteBaseUrl?.replace(/\/$/, '');
  if (siteBase) return `${siteBase}${path}`;

  const integrationBase = options.integrationBaseUrl?.replace(/\/$/, '');
  if (integrationBase) return `${integrationBase}${path}`;

  return path;
}

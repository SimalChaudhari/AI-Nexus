/** @deprecated Import from `src/sections/learning/membership-application-picklists` */
export * from 'src/sections/learning/membership-application-picklists';

import { normalizeMembershipPicklistOptions } from 'src/sections/learning/membership-application-picklists';

/** @deprecated Use normalizeMembershipPicklistOptions */
export function normalizeEmploymentCompanyTypeOptions(response) {
  return normalizeMembershipPicklistOptions(response);
}

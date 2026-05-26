import { CONFIG } from 'src/config-global';

/** @typedef {{ title: string, subtitle: string }} HomePathwayExploreLink */

/** @typedef {{ description: string, criteria: string[], footerNote?: string, exploreLinks?: HomePathwayExploreLink[] }} HomePathwayContent */

const PATHWAY_FOOTER_NOTE =
  'Final eligibility is determined by ISCA based on your supporting documents and prevailing admission rules. Use the official application portal to begin.';

const ASSOCIATE_EXPLORE_LINK = [{ key: 'associate', title: 'Associate Pathway', subtitle: 'Associate (ISCA)' }];
const PBA_EXPLORE_LINK = [{ key: 'pba', title: 'ISCA Professional Business Accountant Pathway', subtitle: 'ISCA PBA' }];

/** SCAQ candidate — after associate opt-in (home). */
export const HOME_SCAQ_PATHWAY_BY_SPECIALISATION = {
  'yes-experience': {
    description:
      'ISCA confers specialisation credentials, such as the ISCA Financial Forensic Professional (FFP), to members who complete the relevant qualification and required years of relevant work experience. Non-ISCA members must apply for Associate (ISCA) membership concurrently with the credential.',
    criteria: [
      'Completed an ISCA specialisation qualification (e.g., FFP)',
      'Required years of relevant specialised work experience',
      'Must hold or apply concurrently for ISCA membership',
    ],
    exploreLinks: ASSOCIATE_EXPLORE_LINK,
    footerNote: PATHWAY_FOOTER_NOTE,
  },
  no: {
    description:
      'Apply for Associate (ISCA) membership if you have a recognised accounting degree or an equivalent professional accountancy qualification, including SCAQ Foundation/Professional Programme candidates. Overseas applicants may need a letter of good standing or an employer letter verifying at least six months of work experience.',
    criteria: [
      'Recognised accounting degree (direct-entry to SCAQ Professional or other recognised list), or',
      'Recognised professional accountancy qualification, or',
      'SCAQ Foundation / Professional Programme candidate',
      'Overseas: letter of good standing or 6-month employer letter may apply',
    ],
    exploreLinks: PBA_EXPLORE_LINK,
    footerNote: PATHWAY_FOOTER_NOTE,
  },
};

/** Experienced pathway — after membership agreement (home). */
export const HOME_EXPERIENCED_PATHWAY_BY_SPECIALISATION = {
  'yes-experience': {
    description:
      'ISCA confers specialisation credentials, such as the ISCA Financial Forensic Professional (FFP), to members who complete the relevant qualification and required years of relevant work experience. Non-ISCA members must apply for Associate (ISCA) membership concurrently with the credential.',
    criteria: [
      'Completed an ISCA specialisation qualification (e.g., FFP)',
      'Required years of relevant specialised work experience',
      'Must hold or apply concurrently for ISCA membership',
    ],
    exploreLinks: ASSOCIATE_EXPLORE_LINK,
    footerNote: PATHWAY_FOOTER_NOTE,
  },
  no: {
    description:
      'The ISCA PBA designation recognises Associate (ISCA) members with the right blend of qualifications and relevant experience. Routes include SCAQ Foundation completion, a recognised qualification eligible for SCAQ Professional Programme direct admission, completion of the PBA programme with three years of post-qualification experience, or a recognised body such as CIMA.',
    criteria: [
      'SCAQ Foundation Programme completed, or recognised accounting qualification eligible for SCAQ Professional direct entry, or',
      'PBA programme completed with 3 years of post-qualification relevant experience, or',
      'Member of a recognised body such as CIMA, subject to criteria',
      'Must hold or apply concurrently for Associate (ISCA) membership',
    ],
    exploreLinks: ASSOCIATE_EXPLORE_LINK,
    footerNote: PATHWAY_FOOTER_NOTE,
  },
};

/** Recognition Arrangement (chartered) — after ISCA specialisation Yes / No (home). */
export const HOME_RECOGNITION_PATHWAY_BY_SPECIALISATION = {
  'yes-experience': {
    description:
      'The CA (Singapore) designation marks a fully qualified accounting professional. You may be admitted via the Singapore CA Qualification, the Recognition Arrangement (CA ANZ, CAI, CPA Australia, ICAEW, ICAS), the Enhanced Pathway for ACCA Members and Affiliates, or applicable Transitional Arrangements.',
    criteria: [
      'Completion of the SCAQ Professional Programme, or',
      'Full membership of CA ANZ, CAI, CPA Australia, ICAEW or ICAS, or',
      'ACCA member / affiliate via the enhanced pathway, or',
      'Associate (ISCA) under specified Transitional Arrangements',
    ],
    exploreLinks: [
      ...ASSOCIATE_EXPLORE_LINK,
      ...PBA_EXPLORE_LINK,
    ],
    footerNote: PATHWAY_FOOTER_NOTE,
  },
  no: {
    description:
      'The CA (Singapore) designation marks a fully qualified accounting professional. You may be admitted via the Singapore CA Qualification, the Recognition Arrangement (CA ANZ, CAI, CPA Australia, ICAEW, ICAS), the Enhanced Pathway for ACCA Members and Affiliates, or applicable Transitional Arrangements.',
    criteria: [
      'Completion of the SCAQ Professional Programme, or',
      'Full membership of CA ANZ, CAI, CPA Australia, ICAEW or ICAS, or',
      'ACCA member / affiliate via the enhanced pathway, or',
      'Associate (ISCA) under specified Transitional Arrangements',
    ],
    exploreLinks: [
      ...ASSOCIATE_EXPLORE_LINK,
      ...PBA_EXPLORE_LINK,
    ],
    footerNote: PATHWAY_FOOTER_NOTE,
  },
};

/** Home pathway — student eligibility after membership agreement. */
export const HOME_STUDENT_PATHWAY_CONTENT = {
  description:
    "ISCA's student membership is open to students at any academic level interested in accountancy career opportunities. The student membership fee is waived for all students, and members get access to talks, workshops, networking and resources.",
  criteria: [
    'Open to students at any academic level',
    'Membership fee waived for all students',
    'Access to talks, workshops, internships and youth ambassador programmes',
  ],
  footerNote: PATHWAY_FOOTER_NOTE,
};

export function isHomeSpecialisationPathwayFlow(state) {
  return (
    state?.homePostOptInFlow
    && (
      (state.eligibilityType === 'scaq-candidate' && state.scaqAssociateOptIn === true)
      || (
        state.eligibilityType === 'experienced'
        && (state.experiencedMembershipApplicationAgreed || state.homeGetStartedFlow)
      )
      || (
        state.eligibilityType === 'recognition'
        && (
          state.charteredAccountantPathway === 'recognition-arrangement'
          || state.charteredAccountantPathway === 'enhanced-pathway'
        )
      )
    )
  );
}

export function getHomePathwayContent(eligibilityType, specialisationAnswer) {
  if (eligibilityType === 'recognition') {
    return (
      HOME_RECOGNITION_PATHWAY_BY_SPECIALISATION[specialisationAnswer]
      || HOME_RECOGNITION_PATHWAY_BY_SPECIALISATION.no
    );
  }
  if (eligibilityType === 'experienced') {
    return (
      HOME_EXPERIENCED_PATHWAY_BY_SPECIALISATION[specialisationAnswer]
      || HOME_EXPERIENCED_PATHWAY_BY_SPECIALISATION.no
    );
  }
  return (
    HOME_SCAQ_PATHWAY_BY_SPECIALISATION[specialisationAnswer]
    || HOME_SCAQ_PATHWAY_BY_SPECIALISATION.no
  );
}

export function getHomeStudentPathwayUrls() {
  const student = CONFIG.membership?.homeStudent || {};
  const legacyPortal = CONFIG.membership?.homeAssociateEservicesSignupUrl;
  return {
    applicationPortal: student.applicationPortalUrl || legacyPortal,
    readPathwayPage: student.readPathwayPageUrl,
  };
}

export function getHomePathwayUrls(eligibilityType, specialisationAnswer) {
  const legacyPortal = CONFIG.membership?.homeAssociateEservicesSignupUrl;
  const legacyReadPathway = CONFIG.membership?.homeReadPathwayPageUrl;
  const specYes = CONFIG.membership?.homeSpecialisationYes || {};
  const specNo = CONFIG.membership?.homeSpecialisationNo || {};
  const expNo = CONFIG.membership?.homeExperiencedNo || {};

  if (specialisationAnswer === 'yes-experience') {
    return {
      applicationPortal: specYes.applicationPortalUrl || legacyPortal,
      explore: specYes.exploreAssociatePathwayUrl,
      readPathwayPage: specYes.readPathwayPageUrl || legacyReadPathway,
    };
  }

  if (eligibilityType === 'recognition') {
    return {
      applicationPortal: specNo.applicationPortalUrl || legacyPortal,
      explore: specYes.exploreAssociatePathwayUrl,
      readPathwayPage: specNo.readPathwayPageUrl,
    };
  }

  if (eligibilityType === 'experienced') {
    return {
      applicationPortal: expNo.applicationPortalUrl || specNo.applicationPortalUrl || legacyPortal,
      explore:
        expNo.exploreAssociatePathwayUrl
        || specYes.exploreAssociatePathwayUrl,
      readPathwayPage:
        expNo.readPathwayPageUrl
        || specNo.readPathwayPageUrl,
    };
  }

  return {
    applicationPortal: specNo.applicationPortalUrl || legacyPortal,
    explore: specNo.explorePbaPathwayUrl,
    readPathwayPage: specNo.readPathwayPageUrl,
  };
}

export function getHomePathwayExploreUrl(eligibilityType, specialisationAnswer, exploreKey) {
  const specYes = CONFIG.membership?.homeSpecialisationYes || {};
  const specNo = CONFIG.membership?.homeSpecialisationNo || {};

  if (eligibilityType === 'recognition') {
    if (exploreKey === 'pba') return specNo.explorePbaPathwayUrl;
    return specYes.exploreAssociatePathwayUrl;
  }

  const urls = getHomePathwayUrls(eligibilityType, specialisationAnswer);
  return urls.explore;
}

/** @deprecated Use getHomePathwayContent */
export function getHomeAssociatePathwayContent(specialisationAnswer) {
  return getHomePathwayContent('scaq-candidate', specialisationAnswer);
}

/** @deprecated Use getHomePathwayUrls */
export function getHomeAssociatePathwayUrls(specialisationAnswer) {
  return getHomePathwayUrls('scaq-candidate', specialisationAnswer);
}

export function openHomePathwayExternalUrl(url) {
  const trimmed = String(url || '').trim();
  if (!/^https?:\/\//i.test(trimmed)) return;
  window.open(trimmed, '_blank', 'noopener,noreferrer');
}

export const CORPORATE_REF_ID = 'PWC-SG24';

export const CORPORATE_STAFF = [
  {
    name: 'Amelia Tan',
    email: 'amelia.tan@example.com',
    department: 'Finance',
    role: 'Finance Manager',
    eligibility: 'Singaporean/PR',
    profession: 'Yes',
    status: 'Completed',
    lastActive: 'Today',
    cert: true,
    pending: 'No pending items. Programme completion criteria met.',
    p1: { c: 9.5, t: 9.5, q: true, a: true },
    p2: { c: 8, t: 14.5, q: true, a: true, e: true },
    p3: { c: 6, t: 6 },
  },
  {
    name: 'Joshua Lee',
    email: 'joshua.lee@example.com',
    department: 'Audit',
    role: 'Audit Associate',
    eligibility: 'Singaporean/PR',
    profession: 'Yes',
    status: 'In Progress',
    lastActive: '2 days ago',
    cert: false,
    pending:
      'Complete 1.5h in Pillar 1, pass Pillar 1 quiz and assessment, then complete one eligible Pillar 2 specialisation with quiz and assessment.',
    p1: { c: 8, t: 9.5, q: false, a: false },
    p2: { c: 3, t: 14.5, q: false, a: false, e: false },
    p3: { c: 1, t: 6 },
  },
  {
    name: 'Nadia Rahim',
    email: 'nadia.rahim@example.com',
    department: 'Tax',
    role: 'Tax Specialist',
    eligibility: 'Singapore Citizen',
    profession: 'Yes',
    status: 'In Progress',
    lastActive: 'Yesterday',
    cert: false,
    pending:
      'Pillar 1 completed. Pending one eligible Pillar 2 specialisation module and its quiz/assessment.',
    p1: { c: 9.5, t: 9.5, q: true, a: true },
    p2: { c: 2.5, t: 14.5, q: false, a: false, e: false },
    p3: { c: 0, t: 6 },
  },
  {
    name: 'Marcus Wong',
    email: 'marcus.wong@example.com',
    department: 'Risk',
    role: 'Risk Analyst',
    eligibility: 'Singapore PR',
    profession: 'Yes',
    status: 'At Risk',
    lastActive: '11 days ago',
    cert: false,
    pending:
      'Learner inactive. Nudge learner to continue Pillar 1 modules before starting an eligible specialisation.',
    p1: { c: 2, t: 9.5, q: false, a: false },
    p2: { c: 0, t: 14.5, q: false, a: false, e: false },
    p3: { c: 0, t: 6 },
  },
];

export const CORPORATE_METRICS = [
  { label: 'Total learners', value: '4', hint: `Tagged to ${CORPORATE_REF_ID}` },
  { label: 'Completed', value: '1', hint: '25% completion rate' },
  { label: 'At risk', value: '1', hint: 'Inactive or low progress' },
  { label: 'Certificates', value: '1', hint: 'Ready for download' },
];

export const CORPORATE_ACTIONS = [
  '5 learners completed a Pillar 1 quiz this week',
  '2 certificates became available for download',
  '1 foreign non-member quotation request pending',
  '3 learners have been inactive for more than 7 days',
];

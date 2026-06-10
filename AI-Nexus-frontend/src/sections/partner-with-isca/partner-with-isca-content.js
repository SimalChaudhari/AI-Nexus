// Static copy for the Partner with ISCA employer landing page.

export const PARTNER_ISCA_STATS = [
  {
    icon: 'solar:buildings-2-bold-duotone',
    title: 'Free Access',
    label: 'For SG Citizens, PRs & ISCA Members',
  },
  {
    icon: 'solar:medal-ribbon-bold-duotone',
    title: 'CPE Hours',
    label: 'Awarded upon completion',
  },
  {
    icon: 'solar:diploma-bold-duotone',
    title: 'Digital Badge',
    label: 'Verifiable on LinkedIn',
  },
  {
    icon: 'solar:shield-check-bold-duotone',
    title: 'NAIIP',
    label: 'Endorsed by IMDA',
  },
];

export const PARTNER_ISCA_BENEFITS = [
  {
    icon: 'solar:widget-bold-duotone',
    iconTone: 'navy',
    title: 'Live progress dashboard',
    description:
      "See every linked staff member's progress in real time — module by module, no manual tracking needed.",
  },
  {
    icon: 'solar:user-id-bold-duotone',
    iconTone: 'red',
    title: 'Unique company ID code',
    description:
      'Your corporate account comes with a unique ID code. Staff enter it when signing up, instantly linking them to your dashboard.',
  },
  {
    icon: 'solar:diploma-verified-bold-duotone',
    iconTone: 'navy',
    title: 'Download completion certificates',
    description:
      'Download a verified completion certificate for any staff member who finishes the programme — ready for CPD records.',
  },
  {
    icon: 'solar:letter-bold-duotone',
    iconTone: 'red',
    title: 'Send nudges to inactive staff',
    description:
      'Spot staff who have stalled and send a reminder directly from your dashboard — no manual emails required.',
  },
  {
    icon: 'solar:export-bold-duotone',
    iconTone: 'blue',
    title: 'Exportable staff reports',
    description:
      "Download a full CSV of your team's enrolment and completion status at any time — for audits or L&D reporting.",
  },
  {
    icon: 'solar:users-group-rounded-bold-duotone',
    iconTone: 'navy',
    title: 'No seat limit',
    description:
      'Enrol your entire accounting and finance team — from graduates to the CFO — with no cap on linked accounts.',
  },
];

export const PARTNER_ISCA_DASHBOARD_FEATURES = [
  {
    title: 'Real-time progress sync',
    description: 'Updates instantly when a learner completes a module',
  },
  {
    title: 'One-click certificate download',
    description: 'Verified PDF certificates for completed staff, ready for CPD records',
  },
  {
    title: 'Exportable CSV reports',
    description: 'Full enrolment and completion data, downloadable anytime',
  },
  {
    title: 'Nudge inactive learners',
    description: 'Prompt unstarted or stalled staff directly from the dashboard',
  },
];

export const PARTNER_ISCA_STAFF_ROWS = [
  {
    initials: 'AL',
    name: 'Amanda Lee',
    role: 'Audit',
    progress: 100,
    progressColor: '#0F6E56',
    status: 'Done',
    statusTone: 'done',
    cert: 'download',
  },
  {
    initials: 'RK',
    name: 'Raj Kumar',
    role: 'Tax',
    progress: 75,
    progressColor: '#E8192C',
    status: 'Active',
    statusTone: 'prog',
    cert: null,
  },
  {
    initials: 'FT',
    name: 'Fiona Tan',
    role: 'Advisory',
    progress: 28,
    progressColor: '#EF9F27',
    status: 'Slow',
    statusTone: 'slow',
    cert: null,
  },
  {
    initials: 'MC',
    name: 'Marcus Chan',
    role: 'Finance',
    progress: 0,
    progressColor: '#E8192C',
    status: 'Not started',
    statusTone: 'none',
    cert: null,
  },
];

export const PARTNER_ISCA_STEPS = [
  {
    icon: 'solar:buildings-2-bold-duotone',
    badge: 'HR / Admin',
    title: 'Register your corporate account',
    description:
      'Sign up for a free corporate account on AI Nexus. You will receive a unique company ID code to share with your staff.',
    done: true,
  },
  {
    icon: 'solar:user-check-bold-duotone',
    badge: 'Your staff',
    title: 'Staff enrol and enter your code',
    description:
      'Each staff member creates their own AI Nexus account and enters your company code to link themselves to your dashboard.',
    done: false,
  },
  {
    icon: 'solar:chart-2-bold-duotone',
    badge: 'You',
    title: 'Track progress and download certs',
    description:
      'Your dashboard updates live as staff complete modules. Download certificates for completers and nudge anyone who has stalled.',
    done: false,
  },
];

export const PARTNER_ISCA_FAQS = [
  {
    question: 'Is there a cost to register a corporate account?',
    answer:
      'No — registering a corporate account on AI Nexus is free. Individual access fees depend on each staff member\'s eligibility: Singapore Citizens, PRs, and ISCA members access the programme at no cost. Non-members who are not Singaporean or PR pay SGD 900 per person, excluding GST.',
  },
  {
    question: 'How does the company ID code work?',
    answer:
      'When you register your corporate account, you receive a unique company ID code. Share this with your staff — they enter it when creating their AI Nexus learner account. Once entered, their progress is automatically visible on your corporate dashboard in real time.',
  },
  {
    question: 'What information can I see for each staff member?',
    answer:
      'Your dashboard shows each linked staff member\'s name, their overall completion percentage, current status (not started, in progress, or completed), and a download link for their verified certificate once they have finished the programme.',
  },
  {
    question: 'How do I download a completion certificate?',
    answer:
      'Once a staff member completes the full programme, a Download button appears next to their name in your dashboard. The certificate is a verified PDF showing their name, completion date, and CPE hours awarded — suitable for CPD records and internal reporting.',
  },
  {
    question: 'Is there a cap on how many staff I can enrol?',
    answer:
      'No. There is no limit on the number of staff who can link to your company code. You can enrol your entire accounting and finance team — from graduates to the CFO — and all of them will appear in your corporate dashboard.',
  },
  {
    question: 'What if some staff are not ISCA members or Singapore residents?',
    answer:
      'They can still participate at the standard fee of SGD 900 per person, excluding GST. Their enrolment and progress will appear in your corporate dashboard exactly the same as any other linked staff member.',
  },
  {
    question: 'When will the programme and corporate dashboard be available?',
    answer:
      'The AI Fluency Programme and AI Nexus platform are expected to launch in June 2026. Register your interest now and we will notify you as soon as corporate account registration opens.',
  },
];

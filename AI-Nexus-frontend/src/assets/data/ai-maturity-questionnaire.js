/**
 * Structured AI maturity self-check (six pillars, 20 dimensions, 1–5 scale, half-steps in UI).
 * Wording is paraphrased for in-app use; replace with your licensed source text if required.
 */

/** Five-level maturity scale (average-score bands). */
export const MATURITY_LEVELS = [
  { level: 1, name: 'Initial', label: 'Level 1 – Initial', bandMin: 1.0, bandMax: 1.9 },
  { level: 2, name: 'Engaged', label: 'Level 2 – Engaged', bandMin: 2.0, bandMax: 2.9 },
  { level: 3, name: 'Defined', label: 'Level 3 – Defined', bandMin: 3.0, bandMax: 3.9 },
  { level: 4, name: 'Managed', label: 'Level 4 – Managed', bandMin: 4.0, bandMax: 4.4 },
  { level: 5, name: 'Optimized', label: 'Level 5 – Optimized', bandMin: 4.5, bandMax: 5.0 },
];

/**
 * Map a pillar or overall average (1–5) to the canonical level object.
 * @returns {{ level: number, name: string, label: string, bandMin: number, bandMax: number }}
 */
export function averageToMaturityLevelInfo(avg) {
  const a = Number(avg);
  if (Number.isNaN(a)) return MATURITY_LEVELS[0];
  if (a < 2) return MATURITY_LEVELS[0];
  if (a < 3) return MATURITY_LEVELS[1];
  if (a < 4) return MATURITY_LEVELS[2];
  if (a < 4.5) return MATURITY_LEVELS[3];
  return MATURITY_LEVELS[4];
}

/** @returns {'Initial'|'Engaged'|'Defined'|'Managed'|'Optimized'} */
export function averageToMaturityLevel(avg) {
  return averageToMaturityLevelInfo(avg).name;
}

export const AI_MATURITY_QUESTIONNAIRE = [
  {
    id: 'ethical',
    title: 'Ethical, equitable, and responsible use',
    dimensions: [
      {
        id: 'ethical-accountable',
        title: 'Responsible and contestable AI',
        questions: [
          {
            id: 'ethical-accountable-1',
            text: 'Clear accountability exists for AI governance across the organization.',
          },
          {
            id: 'ethical-accountable-2',
            text: 'Policies support challenging or contesting AI-driven decisions where appropriate.',
          },
          {
            id: 'ethical-accountable-3',
            text: 'Those policies are known and reachable for staff and affected parties.',
          },
        ],
      },
      {
        id: 'ethical-transparent',
        title: 'Transparency',
        questions: [
          {
            id: 'ethical-transparent-1',
            text: 'AI systems are documented so decision logic can be explained.',
          },
          {
            id: 'ethical-transparent-2',
            text: 'Outputs are traceable and auditable end-to-end.',
          },
          {
            id: 'ethical-transparent-3',
            text: 'External or third-party review is available when needed.',
          },
        ],
      },
      {
        id: 'ethical-fair',
        title: 'Human-centric and fair use',
        questions: [
          {
            id: 'ethical-fair-1',
            text: 'Fairness is defined for your operating context.',
          },
          {
            id: 'ethical-fair-2',
            text: 'Systems are assessed for fairness, bias, and inclusivity.',
          },
          {
            id: 'ethical-fair-3',
            text: 'Fairness indicators are tracked over time.',
          },
        ],
      },
    ],
  },
  {
    id: 'strategy',
    title: 'Strategy and resources',
    dimensions: [
      {
        id: 'strategy-plan',
        title: 'AI strategic plan',
        questions: [
          {
            id: 'strategy-plan-1',
            text: 'AI is part of organizational strategy and planning cycles.',
          },
          {
            id: 'strategy-plan-2',
            text: 'Leadership backs AI work with sustained funding.',
          },
          {
            id: 'strategy-plan-3',
            text: 'AI objectives align with business and workforce goals.',
          },
        ],
      },
      {
        id: 'strategy-partners',
        title: 'Partnerships',
        questions: [
          {
            id: 'strategy-partners-1',
            text: 'You collaborate with external partners on AI innovation or governance.',
          },
          {
            id: 'strategy-partners-2',
            text: 'Partnership outcomes are reviewed for effectiveness.',
          },
        ],
      },
      {
        id: 'strategy-value',
        title: 'Value and outcomes',
        questions: [
          {
            id: 'strategy-value-1',
            text: 'AI investments are tied to measurable business or risk outcomes.',
          },
          {
            id: 'strategy-value-2',
            text: 'Benefits and costs of AI initiatives are reviewed on a regular cadence.',
          },
        ],
      },
    ],
  },
  {
    id: 'organization',
    title: 'Organization',
    dimensions: [
      {
        id: 'org-governance',
        title: 'Governance structure',
        questions: [
          {
            id: 'org-governance-1',
            text: 'Roles are defined for AI development, deployment, and oversight.',
          },
          {
            id: 'org-governance-2',
            text: 'A cross-functional AI governance forum or committee exists.',
          },
        ],
      },
      {
        id: 'org-culture',
        title: 'Culture and change management',
        questions: [
          {
            id: 'org-culture-1',
            text: 'AI-related change is communicated clearly to employees.',
          },
          {
            id: 'org-culture-2',
            text: 'Staff are encouraged and supported to work with AI tools.',
          },
          {
            id: 'org-culture-3',
            text: 'Structured practices address resistance to AI adoption.',
          },
        ],
      },
      {
        id: 'org-workforce',
        title: 'Workforce development',
        questions: [
          {
            id: 'org-workforce-1',
            text: 'A competency model or skills map covers AI literacy needs.',
          },
          {
            id: 'org-workforce-2',
            text: 'Role-specific training exists for HR, legal, IT, and business teams.',
          },
        ],
      },
      {
        id: 'org-risk-compliance',
        title: 'Risk and compliance alignment',
        questions: [
          {
            id: 'org-risk-compliance-1',
            text: 'AI risks are represented in the enterprise risk register or equivalent.',
          },
          {
            id: 'org-risk-compliance-2',
            text: 'AI deployments are mapped to applicable laws, standards, and internal policies.',
          },
        ],
      },
    ],
  },
  {
    id: 'technology',
    title: 'Technology enablers',
    dimensions: [
      {
        id: 'tech-platform',
        title: 'Platforms and architecture',
        questions: [
          {
            id: 'tech-platform-1',
            text: 'Standardized AI platforms and tools are in use.',
          },
          {
            id: 'tech-platform-2',
            text: 'Architecture supports scale, monitoring, and versioning.',
          },
        ],
      },
      {
        id: 'tech-validation',
        title: 'Testing and validation',
        questions: [
          {
            id: 'tech-validation-1',
            text: 'AI systems are tested for performance, robustness, and safety.',
          },
          {
            id: 'tech-validation-2',
            text: 'Validation steps are documented and repeatable.',
          },
        ],
      },
      {
        id: 'tech-security',
        title: 'Security and privacy',
        questions: [
          {
            id: 'tech-security-1',
            text: 'AI-specific data security controls are in place.',
          },
          {
            id: 'tech-security-2',
            text: 'Personal data in AI workflows meets GDPR or applicable regulations.',
          },
        ],
      },
      {
        id: 'tech-operations',
        title: 'Operations and resilience',
        questions: [
          {
            id: 'tech-operations-1',
            text: 'AI services have defined availability targets and incident response playbooks.',
          },
          {
            id: 'tech-operations-2',
            text: 'Capacity, cost, and performance of AI workloads are monitored in production.',
          },
        ],
      },
    ],
  },
  {
    id: 'data',
    title: 'Data',
    dimensions: [
      {
        id: 'data-governance',
        title: 'Data governance',
        questions: [
          {
            id: 'data-governance-1',
            text: 'Provenance, quality, and labeling expectations are clear.',
          },
          {
            id: 'data-governance-2',
            text: 'Policies explicitly cover AI needs (for example training-data fairness).',
          },
        ],
      },
      {
        id: 'data-access',
        title: 'Accessibility',
        questions: [
          {
            id: 'data-access-1',
            text: 'The right people can access the right data at the right time.',
          },
          {
            id: 'data-access-2',
            text: 'Data access decisions are logged and auditable.',
          },
        ],
      },
      {
        id: 'data-lifecycle',
        title: 'Data for the AI lifecycle',
        questions: [
          {
            id: 'data-lifecycle-1',
            text: 'Training, validation, and production data flows are documented and controlled.',
          },
          {
            id: 'data-lifecycle-2',
            text: 'A data catalog or metadata practice supports AI discovery and reuse.',
          },
        ],
      },
    ],
  },
  {
    id: 'performance',
    title: 'Performance and application',
    dimensions: [
      {
        id: 'perf-adoption',
        title: 'Use and adoption',
        questions: [
          {
            id: 'perf-adoption-1',
            text: 'AI use cases are documented and tied to business outcomes.',
          },
          {
            id: 'perf-adoption-2',
            text: 'AI is embedded in day-to-day decision-making where intended.',
          },
        ],
      },
      {
        id: 'perf-monitoring',
        title: 'Monitoring and continuous improvement',
        questions: [
          {
            id: 'perf-monitoring-1',
            text: 'Deployed models are monitored for unintended effects.',
          },
          {
            id: 'perf-monitoring-2',
            text: 'Feedback loops exist to refine or retire models.',
          },
        ],
      },
      {
        id: 'perf-trust',
        title: 'Trust and robustness',
        questions: [
          {
            id: 'perf-trust-1',
            text: 'Stakeholders trust outputs and know when and how to override them.',
          },
          {
            id: 'perf-trust-2',
            text: 'Trust is checked through surveys or other measurable signals.',
          },
        ],
      },
    ],
  },
];

export function countQuestionnaireDimensions() {
  return AI_MATURITY_QUESTIONNAIRE.reduce((n, pillar) => n + pillar.dimensions.length, 0);
}

export function buildInitialScoreMap() {
  const map = {};
  AI_MATURITY_QUESTIONNAIRE.forEach((pillar) => {
    pillar.dimensions.forEach((dimension) => {
      dimension.questions.forEach((question) => {
        map[question.id] = 3;
      });
    });
  });
  return map;
}

const mean = (values) => {
  if (!values.length) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
};

/**
 * @param {Record<string, number>} scores questionId -> 1..5 (0.5 steps)
 */
export function computeMaturitySummary(scores) {
  const allValues = [];
  AI_MATURITY_QUESTIONNAIRE.forEach((pillar) => {
    pillar.dimensions.forEach((dimension) => {
      dimension.questions.forEach((q) => {
        allValues.push(scores[q.id] ?? 3);
      });
    });
  });

  const pillarSummaries = AI_MATURITY_QUESTIONNAIRE.map((pillar) => {
    const pillarValues = [];
    const dimensions = pillar.dimensions.map((dimension) => {
      const dimValues = dimension.questions.map((q) => {
        const v = scores[q.id] ?? 3;
        pillarValues.push(v);
        return v;
      });
      const dimAvg = Math.round(mean(dimValues) * 10) / 10;
      return {
        id: dimension.id,
        title: dimension.title,
        average: dimAvg,
        levelInfo: averageToMaturityLevelInfo(dimAvg),
      };
    });
    const average = Math.round(mean(pillarValues) * 10) / 10;
    return {
      id: pillar.id,
      title: pillar.title,
      average,
      levelInfo: averageToMaturityLevelInfo(average),
      dimensions,
    };
  });

  const overallAverage = Math.round(mean(allValues) * 10) / 10;
  const overallLevelInfo = averageToMaturityLevelInfo(overallAverage);

  return {
    pillarSummaries,
    overallAverage,
    overallLevel: overallLevelInfo.name,
    overallLevelInfo,
  };
}

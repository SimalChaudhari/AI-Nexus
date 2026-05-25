export const DEFAULT_TESTIMONIALS_CONTENT = {
  heading: '',
  subtitle: '',
  testimonials: [],
  industryQuotes: [],
};

/** Preview copy when admin has not saved testimonials yet */
export const DUMMY_TESTIMONIALS_CONTENT = {
  heading: 'What Our Customers Say',
  subtitle:
    'Trusted by learners, team leads, and employers building practical AI fluency for everyday work.',
  testimonials: [
    {
      quote:
        'Our team finally shares one approach to AI. The modules are practical, well-paced, and immediately useful in reporting and operations.',
      name: 'Sarah Chen',
      role: 'Head of Learning & Development',
      rating: 5,
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
    },
    {
      quote:
        'Clear structure and hands-on exercises removed the guesswork. I use AI assistants weekly for analysis, drafting, and stakeholder updates.',
      name: 'Raj Patel',
      role: 'Finance Manager',
      rating: 5,
      avatarUrl: 'https://i.pravatar.cc/150?img=12',
    },
    {
      quote:
        'As a newcomer to AI tools, the self-paced format built real confidence. Community sessions added context I still reference months later.',
      name: 'Emily Wong',
      role: 'Customer Success Lead',
      rating: 4.5,
      avatarUrl: 'https://i.pravatar.cc/150?img=5',
    },
    {
      quote:
        'We rolled this out org-wide for L&D. Enrollment was simple, and managers can see consistent skill growth across departments.',
      name: 'Marcus Lee',
      role: 'People Operations Director',
      rating: 5,
      avatarUrl: 'https://i.pravatar.cc/150?img=8',
    },
    {
      quote:
        'No hype—just applied learning. The capstone tasks mirror real workflows, which is why the skills actually stick.',
      name: 'Priya Sharma',
      role: 'Strategy Consultant',
      rating: 5,
      avatarUrl: 'https://i.pravatar.cc/150?img=9',
    },
    {
      quote:
        'Funding support made the decision straightforward. Within six weeks our cohort was collaborating on AI-enabled process improvements.',
      name: 'James Okafor',
      role: 'Operations Manager',
      rating: 4.5,
      avatarUrl: 'https://i.pravatar.cc/150?img=11',
    },
    {
      quote:
        'The responsible-AI guidance was as valuable as the tooling. We now have guardrails our compliance team is comfortable endorsing.',
      name: 'Helena Müller',
      role: 'Risk & Compliance Officer',
      rating: 5,
      avatarUrl: 'https://i.pravatar.cc/150?img=20',
    },
    {
      quote:
        'I recommend this to every hiring manager I work with. Candidates with this foundation onboard faster into AI-assisted roles.',
      name: 'David Okonkwo',
      role: 'Talent Acquisition Partner',
      rating: 5,
      avatarUrl: 'https://i.pravatar.cc/150?img=15',
    },
    {
      quote:
        'Marketing workflows improved within the first month—briefs, variations, and research summaries are faster without sacrificing quality.',
      name: 'Aisha Rahman',
      role: 'Marketing Manager',
      rating: 4,
      avatarUrl: 'https://i.pravatar.cc/150?img=16',
    },
    {
      quote:
        'Engineers on my squad use the programme to align with business users. Shared vocabulary reduced friction on AI feature delivery.',
      name: 'Tom Bradley',
      role: 'Engineering Lead',
      rating: 5,
      avatarUrl: 'https://i.pravatar.cc/150?img=33',
    },
    {
      quote:
        'Excellent balance of theory and practice. The facilitator feedback on assignments helped me refine prompts for client deliverables.',
      name: 'Nina Kowalski',
      role: 'Management Consultant',
      rating: 4.5,
      avatarUrl: 'https://i.pravatar.cc/150?img=25',
    },
    {
      quote:
        'A credible upskilling path for public-sector teams. Content is accessible, inclusive, and aligned with how we serve citizens digitally.',
      name: 'Grace Tan',
      role: 'Digital Transformation Lead',
      rating: 5,
      avatarUrl: 'https://i.pravatar.cc/150?img=47',
    },
  ],
  industryQuotes: [
    {
      quote:
        'Workforce AI fluency is no longer optional — programmes like this help professionals use AI responsibly and productively.',
      organisation: 'Industry Partner',
      logoUrl: '',
    },
    {
      quote:
        'Strong alignment with national upskilling goals. Employers benefit when teams share a common foundation in AI literacy.',
      organisation: 'Professional Body',
      logoUrl: '',
    },
  ],
};

export const TESTIMONIALS_MAX = 12;
export const INDUSTRY_QUOTES_MAX = 8;

export function normalizeTestimonialsContent(source) {
  if (!source || typeof source !== 'object') {
    return {
      ...DEFAULT_TESTIMONIALS_CONTENT,
      testimonials: [],
      industryQuotes: [],
    };
  }
  const rawTestimonials = Array.isArray(source.testimonials) ? source.testimonials : [];
  const rawQuotes = Array.isArray(source.industryQuotes) ? source.industryQuotes : [];
  return {
    heading: source.heading != null ? String(source.heading) : '',
    subtitle: source.subtitle != null ? String(source.subtitle) : '',
    testimonials: rawTestimonials.slice(0, TESTIMONIALS_MAX).map((row) => ({
      quote: row?.quote != null ? String(row.quote) : '',
      name: row?.name != null ? String(row.name) : '',
      role: row?.role != null ? String(row.role) : '',
      avatarUrl: row?.avatarUrl != null ? String(row.avatarUrl) : '',
      rating: row?.rating != null ? Number(row.rating) : 5,
    })),
    industryQuotes: rawQuotes.slice(0, INDUSTRY_QUOTES_MAX).map((row) => ({
      quote: row?.quote != null ? String(row.quote) : '',
      organisation: row?.organisation != null ? String(row.organisation) : '',
      logoUrl: row?.logoUrl != null ? String(row.logoUrl) : '',
    })),
  };
}

export function hasTestimonialsContent(content) {
  const c = content || {};
  if (String(c.heading || '').trim()) return true;
  if (String(c.subtitle || '').trim()) return true;
  const testimonials = Array.isArray(c.testimonials) ? c.testimonials : [];
  const quotes = Array.isArray(c.industryQuotes) ? c.industryQuotes : [];
  return (
    testimonials.some((r) => r?.quote?.trim() || r?.name?.trim()) ||
    quotes.some((r) => r?.quote?.trim() || r?.organisation?.trim())
  );
}

export function isTestimonialsContentEmpty(source) {
  if (!source || typeof source !== 'object') return true;
  return !hasTestimonialsContent(normalizeTestimonialsContent(source));
}

/** API content when saved; otherwise dummy preview data */
export function resolveTestimonialsContent(source) {
  if (isTestimonialsContentEmpty(source)) {
    return normalizeTestimonialsContent(DUMMY_TESTIMONIALS_CONTENT);
  }
  return normalizeTestimonialsContent(source);
}

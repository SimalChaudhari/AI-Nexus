export const DEFAULT_PROGRAMME_FEES_CONTENT = {
  heading: 'Programme Fee & Funding Information',
  tiers: [
    {
      title: 'Singapore Citizens And Singapore Permanent Residents Tech Professional',
      description: '',
      linkLabel: 'See the list of eligible tech roles',
      linkHref: '',
      price: 'S$196.20',
      priceNote: 'Programme fees after funding, inclusive of 9% GST',
      priceVariant: 'primary',
    },
    {
      title: 'Information & Digital Technologies (IDT) Final Year Students From Local IHLs',
      description:
        'Eligible students will receive an invitation from their registered institutions and AI Singapore to enjoy 100% funding for the programme.',
      linkLabel: '',
      linkHref: '',
      price: 'FREE',
      priceNote: '',
      priceVariant: 'primary',
    },
    {
      title: 'Others',
      description: 'Other participants who wish to join.',
      linkLabel: '',
      linkHref: '',
      price: 'S$2,186.93',
      priceNote: 'Full programme fees inclusive of 9% GST',
      priceVariant: 'default',
    },
  ],
  fundingPartnersHeading: 'Funding Partners',
  fundingPartnersBody:
    '<p>Self-sponsored learners can offset course fees for AIxTech using <em>SkillsFuture Credits</em> and the <em>Union Training Assistance Programme</em>.</p>',
  agency: {
    logoUrl: '',
    name: 'Infocomm Media Development Authority (IMDA)',
    tagline: 'Supporting agency for the programme',
  },
};

export function normalizeProgrammeFeesContent(source) {
  if (!source || typeof source !== 'object') {
    return { ...DEFAULT_PROGRAMME_FEES_CONTENT, tiers: DEFAULT_PROGRAMME_FEES_CONTENT.tiers.map((t) => ({ ...t })) };
  }
  const rawTiers = Array.isArray(source.tiers) ? source.tiers : DEFAULT_PROGRAMME_FEES_CONTENT.tiers;
  return {
    heading: source.heading != null ? String(source.heading) : DEFAULT_PROGRAMME_FEES_CONTENT.heading,
    tiers: rawTiers.slice(0, 8).map((tier, i) => {
      const fallback = DEFAULT_PROGRAMME_FEES_CONTENT.tiers[i] || {};
      return {
        title: tier?.title != null ? String(tier.title) : fallback.title || '',
        description: tier?.description != null ? String(tier.description) : fallback.description || '',
        linkLabel: tier?.linkLabel != null ? String(tier.linkLabel) : fallback.linkLabel || '',
        linkHref: tier?.linkHref != null ? String(tier.linkHref) : fallback.linkHref || '',
        price: tier?.price != null ? String(tier.price) : fallback.price || '',
        priceNote: tier?.priceNote != null ? String(tier.priceNote) : fallback.priceNote || '',
        priceVariant: tier?.priceVariant === 'default' ? 'default' : 'primary',
      };
    }),
    fundingPartnersHeading:
      source.fundingPartnersHeading != null
        ? String(source.fundingPartnersHeading)
        : DEFAULT_PROGRAMME_FEES_CONTENT.fundingPartnersHeading,
    fundingPartnersBody:
      source.fundingPartnersBody != null
        ? String(source.fundingPartnersBody)
        : DEFAULT_PROGRAMME_FEES_CONTENT.fundingPartnersBody,
    agency: {
      logoUrl: source?.agency?.logoUrl != null ? String(source.agency.logoUrl) : '',
      name:
        source?.agency?.name != null
          ? String(source.agency.name)
          : DEFAULT_PROGRAMME_FEES_CONTENT.agency.name,
      tagline:
        source?.agency?.tagline != null
          ? String(source.agency.tagline)
          : DEFAULT_PROGRAMME_FEES_CONTENT.agency.tagline,
    },
  };
}

export function normalizeProgrammeFeesContent(source) {
  if (!source || typeof source !== 'object') {
    return {
      heading: '',
      tiers: [],
      fundingPartnersHeading: '',
      fundingPartnersBody: '',
      agency: {
        logoUrl: '',
        name: '',
        tagline: '',
      },
    };
  }
  const rawTiers = Array.isArray(source.tiers) ? source.tiers : [];
  return {
    heading: source.heading != null ? String(source.heading) : '',
    tiers: rawTiers.slice(0, 8).map((tier) => {
      return {
        title: tier?.title != null ? String(tier.title) : '',
        description: tier?.description != null ? String(tier.description) : '',
        linkLabel: tier?.linkLabel != null ? String(tier.linkLabel) : '',
        linkHref: tier?.linkHref != null ? String(tier.linkHref) : '',
        price: tier?.price != null ? String(tier.price) : '',
        priceNote: tier?.priceNote != null ? String(tier.priceNote) : '',
        priceVariant: tier?.priceVariant === 'default' ? 'default' : 'primary',
      };
    }),
    fundingPartnersHeading:
      source.fundingPartnersHeading != null
        ? String(source.fundingPartnersHeading)
        : '',
    fundingPartnersBody:
      source.fundingPartnersBody != null
        ? String(source.fundingPartnersBody)
        : '',
    agency: {
      logoUrl: source?.agency?.logoUrl != null ? String(source.agency.logoUrl) : '',
      name: source?.agency?.name != null ? String(source.agency.name) : '',
      tagline: source?.agency?.tagline != null ? String(source.agency.tagline) : '',
    },
  };
}

import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { PartnerWithIscaView } from 'src/sections/partner-with-isca';

// ----------------------------------------------------------------------

const metadata = {
  title: `For Employers — AI Nexus by ISCA | ${CONFIG.site.name}`,
  description:
    'Give your accounting and finance staff access to the AI Fluency Programme and track team progress from your corporate dashboard.',
};

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </Helmet>

      <PartnerWithIscaView />
    </>
  );
}

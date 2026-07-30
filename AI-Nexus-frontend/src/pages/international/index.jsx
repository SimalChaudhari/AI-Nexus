import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { InternationalLandingView } from 'src/sections/international';

// ----------------------------------------------------------------------

const metadata = {
  title: `International — AI Nexus | ${CONFIG.site.name}`,
  description:
    'AI Nexus for international participants — choose your region and enter the AI Fluency programme.',
};

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </Helmet>

      <InternationalLandingView />
    </>
  );
}

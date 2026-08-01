import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { PathwayPlannerView } from 'src/sections/international/pathway/pathway-planner-view';

// ----------------------------------------------------------------------

const metadata = {
  title: `AI Fluency Pathway Planner — International | ${CONFIG.site.name}`,
  description:
    'Build your 10-hour AI Fluency route — choose a specialization track and fine-tune Foundation, Essential, Recommended and Optional modules.',
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

      <PathwayPlannerView />
    </>
  );
}

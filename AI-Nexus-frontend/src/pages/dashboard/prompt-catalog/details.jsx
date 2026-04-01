import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { PromptCatalogDetailsView } from 'src/sections/dashboard/prompt-catalog';

const metadata = { title: `Prompt details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <PromptCatalogDetailsView />
    </>
  );
}


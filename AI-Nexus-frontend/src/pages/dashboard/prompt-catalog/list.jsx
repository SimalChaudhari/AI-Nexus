import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { PromptCatalogListView } from 'src/sections/dashboard/prompt-catalog';

const metadata = { title: `Prompt catalog | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <PromptCatalogListView />
    </>
  );
}

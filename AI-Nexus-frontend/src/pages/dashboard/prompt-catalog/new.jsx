import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { PromptCatalogNewEditView } from 'src/sections/dashboard/prompt-catalog';

const metadata = { title: `Create prompt | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <PromptCatalogNewEditView />
    </>
  );
}


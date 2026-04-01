import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { PromptProviderDetailsView } from 'src/sections/dashboard/prompt-catalog';

const metadata = { title: `Provider details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <PromptProviderDetailsView />
    </>
  );
}


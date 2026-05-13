import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { PromptCategoryItemsView } from 'src/sections/dashboard/prompt/view';

// ----------------------------------------------------------------------

const metadata = { title: `Prompt items | Dashboard - ${CONFIG.site.name}` };

export default function PromptAdminCategoryItemsPage() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <PromptCategoryItemsView />
    </>
  );
}

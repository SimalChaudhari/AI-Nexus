import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { PromptListView } from 'src/sections/dashboard/prompt/view';

// ----------------------------------------------------------------------

const metadata = { title: `Prompt categories | Dashboard - ${CONFIG.site.name}` };

export default function PromptAdminListPage() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <PromptListView />
    </>
  );
}

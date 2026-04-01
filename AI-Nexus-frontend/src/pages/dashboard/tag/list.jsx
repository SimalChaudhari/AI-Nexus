import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { TagListView } from 'src/sections/dashboard/tag/view';

// ----------------------------------------------------------------------

const metadata = { title: `Tag list | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <TagListView />
    </>
  );
}


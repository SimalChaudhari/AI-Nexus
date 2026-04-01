import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { TagCreateView } from 'src/sections/dashboard/tag/view';

// ----------------------------------------------------------------------

const metadata = { title: `Create a new tag | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <TagCreateView />
    </>
  );
}


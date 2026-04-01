import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { LabelListView } from 'src/sections/dashboard/label/view';

// ----------------------------------------------------------------------

const metadata = { title: `Label list | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <LabelListView />
    </>
  );
}


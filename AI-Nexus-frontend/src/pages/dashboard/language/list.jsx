import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { LanguageListView } from 'src/sections/dashboard/language/view';

const metadata = { title: `Language list | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <LanguageListView />
    </>
  );
}

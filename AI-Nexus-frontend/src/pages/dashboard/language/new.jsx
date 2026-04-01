import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { LanguageCreateView } from 'src/sections/dashboard/language/view/language-create-view';

// ----------------------------------------------------------------------

const metadata = { title: `Language create | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <LanguageCreateView />
    </>
  );
}

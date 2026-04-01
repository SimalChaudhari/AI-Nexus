import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { CategoryCreateView } from 'src/sections/dashboard/category/view';

// ----------------------------------------------------------------------

const metadata = { title: `Category create | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <CategoryCreateView />
    </>
  );
}


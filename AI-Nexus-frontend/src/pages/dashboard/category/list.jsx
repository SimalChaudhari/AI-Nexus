import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { CategoryListView } from 'src/sections/dashboard/category/view';

// ----------------------------------------------------------------------

const metadata = { title: `Category list | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <CategoryListView />
    </>
  );
}


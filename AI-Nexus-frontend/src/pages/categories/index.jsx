import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { CategoriesView } from 'src/sections/categories/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `Categories | ${CONFIG.site.name}`,
  description: 'Explore different sections of our community',
};

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </Helmet>

      <CategoriesView />
    </>
  );
}


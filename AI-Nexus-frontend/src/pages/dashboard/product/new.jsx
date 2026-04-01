import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ProductCreateView } from 'src/sections/product/view';

// ----------------------------------------------------------------------

const metadata = { title: `New Product | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <ProductCreateView />
    </>
  );
}

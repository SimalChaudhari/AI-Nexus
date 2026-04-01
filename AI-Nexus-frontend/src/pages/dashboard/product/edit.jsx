import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { ProductEditView } from 'src/sections/product/view';
import { useGetProduct } from 'src/actions/product';

// ----------------------------------------------------------------------

const metadata = { title: `Edit Product | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const { product, loading, error } = useGetProduct(params.id);

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <ProductEditView product={product} />
    </>
  );
}

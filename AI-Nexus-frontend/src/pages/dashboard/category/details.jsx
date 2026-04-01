import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';
import { useGetCategory } from 'src/actions/category';

import { CategoryDetailsView } from 'src/sections/dashboard/category/view';

// ----------------------------------------------------------------------

const metadata = { title: `Category details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();

  const { category, categoryLoading, categoryError } = useGetCategory(id);

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <CategoryDetailsView category={category} loading={categoryLoading} error={categoryError} />
    </>
  );
}


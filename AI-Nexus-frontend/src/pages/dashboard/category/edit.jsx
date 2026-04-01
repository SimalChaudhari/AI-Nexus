import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';
import { LoadingScreen } from 'src/components/loading-screen';

import { CategoryEditView } from 'src/sections/dashboard/category/view';
import { useGetCategory } from 'src/actions/category';

// ----------------------------------------------------------------------

const metadata = { title: `Category edit | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();

  const { category, categoryLoading, categoryError } = useGetCategory(id);

  if (categoryLoading) {
    return <LoadingScreen />;
  }

  if (categoryError || !category) {
    return (
      <>
        <Helmet>
          <title> {metadata.title}</title>
        </Helmet>
        <CategoryEditView category={null} />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <CategoryEditView category={category} />
    </>
  );
}


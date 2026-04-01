import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { CONFIG } from 'src/config-global';
import { tagService } from 'src/services/tag.service';
import { fetchTags } from 'src/store/slices/tagSlice';

import { TagDetailsView } from 'src/sections/dashboard/tag/view';
import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

const metadata = { title: `Tag details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const dispatch = useDispatch();
  const [tag, setTag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dispatch(fetchTags());
    if (params.id) {
      tagService
        .getTagById(params.id)
        .then((data) => {
          setTag(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [dispatch, params.id]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <TagDetailsView tag={tag} loading={loading} error={error} />
    </>
  );
}


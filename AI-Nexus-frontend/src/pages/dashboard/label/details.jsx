import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { CONFIG } from 'src/config-global';
import { labelService } from 'src/services/label.service';
import { fetchLabels } from 'src/store/slices/labelSlice';

import { LabelDetailsView } from 'src/sections/dashboard/label/view';
import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

const metadata = { title: `Label details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const dispatch = useDispatch();
  const [label, setLabel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dispatch(fetchLabels());
    if (params.id) {
      labelService
        .getLabelById(params.id)
        .then((data) => {
          setLabel(data);
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

      <LabelDetailsView label={label} loading={loading} error={error} />
    </>
  );
}


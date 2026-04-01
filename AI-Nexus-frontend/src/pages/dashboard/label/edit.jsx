import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { CONFIG } from 'src/config-global';
import { labelService } from 'src/services/label.service';

import { LabelEditView } from 'src/sections/dashboard/label/view';
import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

const metadata = { title: `Label edit | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const dispatch = useDispatch();
  const { labels, loading } = useSelector((state) => state.labels);
  const currentLabel = labels.find((label) => label.id === params.id);

  useEffect(() => {
    if (!currentLabel && params.id) {
      labelService.getLabelById(params.id).then((label) => {
        // This will be handled by Redux if needed
      });
    }
  }, [currentLabel, params.id]);

  if (loading || !currentLabel) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <LabelEditView label={currentLabel} />
    </>
  );
}


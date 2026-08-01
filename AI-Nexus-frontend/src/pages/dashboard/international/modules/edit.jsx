import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';
import { IntlPathwayModuleFormView } from 'src/sections/dashboard/international/view';
import { intlPathwayService } from 'src/services/intl-pathway.service';
import { LoadingScreen } from 'src/components/loading-screen';
import { toast } from 'src/components/snackbar';

const metadata = { title: `Edit pathway module | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id } = useParams();
  const [currentModule, setCurrentModule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    intlPathwayService
      .getModuleById(id)
      .then((row) => {
        if (active) setCurrentModule(row);
      })
      .catch((error) => {
        toast.error(error?.message || 'Failed to load module');
        if (active) setCurrentModule(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <IntlPathwayModuleFormView currentModule={currentModule} />
    </>
  );
}

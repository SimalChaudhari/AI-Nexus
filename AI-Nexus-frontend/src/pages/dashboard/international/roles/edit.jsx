import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';
import { IntlPathwayRoleFormView } from 'src/sections/dashboard/international/view';
import { intlPathwayService } from 'src/services/intl-pathway.service';
import { LoadingScreen } from 'src/components/loading-screen';
import { toast } from 'src/components/snackbar';

const metadata = { title: `Edit pathway role | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id } = useParams();
  const [currentRole, setCurrentRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    intlPathwayService
      .getRoleById(id)
      .then((row) => {
        if (active) setCurrentRole(row);
      })
      .catch((error) => {
        toast.error(error?.message || 'Failed to load role');
        if (active) setCurrentRole(null);
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
      <IntlPathwayRoleFormView currentRole={currentRole} />
    </>
  );
}

import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';
import { newsletterService } from 'src/services/newsletter.service';
import { toast } from 'src/components/snackbar';
import { NewsletterCreateView, NewsletterDetailsView } from 'src/sections/dashboard/newsletter/view';

const metadata = { title: `Newsletter details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();
  const [newsletter, setNewsletter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isCreatePath = id === 'new';
  const isListPath = id === 'list';

  useEffect(() => {
    if (isCreatePath || isListPath) return undefined;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await newsletterService.getNewsletterById(id, { includeUnpublished: true });
        if (mounted) {
          setNewsletter(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err);
        toast.error(err?.message || 'Failed to load newsletter details');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, isCreatePath, isListPath]);

  if (isCreatePath) {
    return <NewsletterCreateView />;
  }

  if (isListPath) {
    return <Navigate to={paths.admin.newsletter.list} replace />;
  }

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <NewsletterDetailsView newsletter={newsletter} loading={loading} error={error} />
    </>
  );
}

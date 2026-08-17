import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';

import { CONFIG } from 'src/config-global';
import { useParams } from 'src/routes/hooks';
import { newsletterService } from 'src/services/newsletter.service';
import { toast } from 'src/components/snackbar';
import { NewsletterEditView } from 'src/sections/dashboard/newsletter/view';
import { LoadingScreen } from 'src/components/loading-screen';

const metadata = { title: `Newsletter edit | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();
  const [newsletter, setNewsletter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await newsletterService.getNewsletterById(id, { includeUnpublished: true });
        if (mounted) setNewsletter(data || null);
      } catch (error) {
        if (mounted) setNewsletter(null);
        toast.error(error?.message || 'Failed to load newsletter');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <NewsletterEditView newsletter={newsletter} />
    </>
  );
}

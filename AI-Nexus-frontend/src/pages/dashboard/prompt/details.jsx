import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';

import { CONFIG } from 'src/config-global';
import { useParams } from 'src/routes/hooks';
import { promptCatalogService } from 'src/services/prompt-catalog.service';
import { toast } from 'src/components/snackbar';
import { PromptDetailsView } from 'src/sections/dashboard/prompt/view';

const metadata = { title: `Prompt details | Dashboard - ${CONFIG.site.name}` };

export default function PromptDetailsPage() {
  const { id = '' } = useParams();
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await promptCatalogService.getAdminPromptItemById(id);
        if (mounted) {
          setPrompt(data);
          setError(null);
        }
      } catch (error) {
        if (mounted) setError(error);
        toast.error(error?.message || 'Failed to load prompt details');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <PromptDetailsView prompt={prompt} loading={loading} error={error} />
    </>
  );
}

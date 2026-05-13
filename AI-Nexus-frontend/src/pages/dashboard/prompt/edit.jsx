import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';

import { CONFIG } from 'src/config-global';
import { useParams } from 'src/routes/hooks';
import { promptCatalogService } from 'src/services/prompt-catalog.service';
import { toast } from 'src/components/snackbar';
import { PromptEditView } from 'src/sections/dashboard/prompt/view';
import { LoadingScreen } from 'src/components/loading-screen';

const metadata = { title: `Prompt edit | Dashboard - ${CONFIG.site.name}` };

export default function PromptEditPage() {
  const { id = '' } = useParams();
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await promptCatalogService.getAdminPromptItemById(id);
        if (mounted) {
          setPrompt(data || null);
          setLoadError(null);
        }
      } catch (error) {
        if (mounted) setLoadError(error);
        toast.error(error?.message || 'Failed to load prompt');
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
      {loading ? <LoadingScreen /> : <PromptEditView prompt={loadError ? null : prompt} />}
    </>
  );
}

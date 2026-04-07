import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AiForumDetailsView } from 'src/sections/dashboard/ai-forum/view';
import { aiForumService } from 'src/services/ai-forum.service';
import { useAiForumListSocket } from 'src/hooks/use-ai-forum-list-socket';

// ----------------------------------------------------------------------

const metadata = { title: `AI Forum — post details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const [post, setAiForumPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAiForumPost = useCallback(async () => {
    if (!params.id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await aiForumService.getPostById(params.id);
      setAiForumPost(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchAiForumPost();
  }, [fetchAiForumPost]);

  useAiForumListSocket(
    {
      onAiForumPostUpdated: (q) => {
        if (q?.id === params.id) fetchAiForumPost();
      },
      onAiForumPostDeleted: (payload) => {
        if (payload?.postId === params.id) setAiForumPost(null);
      },
    },
    { enabled: !!params.id }
  );

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <AiForumDetailsView post={post} loading={loading} error={error} />
    </>
  );
}



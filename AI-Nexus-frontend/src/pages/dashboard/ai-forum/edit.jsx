import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useSelector } from 'react-redux';

import { CONFIG } from 'src/config-global';

import { AiForumEditView } from 'src/sections/dashboard/ai-forum/view';
import { LoadingScreen } from 'src/components/loading-screen';
import { aiForumService } from 'src/services/ai-forum.service';

// ----------------------------------------------------------------------

const metadata = { title: `AI Forum — edit post | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const { posts, loading } = useSelector((state) => state.aiForum);
  const currentAiForumPost = posts.find((item) => item.id === params.id);
  const [fetchedAiForumPost, setFetchedAiForumPost] = useState(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!params.id || currentAiForumPost) return;
    const fetchOne = async () => {
      setFetching(true);
      try {
        const data = await aiForumService.getPostById(params.id);
        setFetchedAiForumPost(data);
      } catch {
        setFetchedAiForumPost(null);
      } finally {
        setFetching(false);
      }
    };
    fetchOne();
  }, [params.id, currentAiForumPost]);

  const displayAiForumPost = currentAiForumPost || fetchedAiForumPost;

  if ((loading || fetching) && !displayAiForumPost) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <AiForumEditView post={displayAiForumPost} />
    </>
  );
}



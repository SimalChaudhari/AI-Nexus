import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';

import { CONFIG } from 'src/config-global';
import { tagService } from 'src/services/tag.service';

import { TagEditView } from 'src/sections/dashboard/tag/view';
import { LoadingScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

const metadata = { title: `Tag edit | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const params = useParams();
  const { tags, loading } = useSelector((state) => state.tags);
  const currentTag = tags.find((tag) => tag.id === params.id);

  useEffect(() => {
    if (!currentTag && params.id) {
      tagService.getTagById(params.id).then(() => {
        // This will be handled by Redux if needed
      });
    }
  }, [currentTag, params.id]);

  if (loading || !currentTag) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <TagEditView tag={currentTag} />
    </>
  );
}


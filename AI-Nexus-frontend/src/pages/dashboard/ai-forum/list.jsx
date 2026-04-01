import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AiForumListView } from 'src/sections/dashboard/ai-forum/view/ai-forum-list-view';

// ----------------------------------------------------------------------

const metadata = { title: `AI Forum | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <AiForumListView />
    </>
  );
}


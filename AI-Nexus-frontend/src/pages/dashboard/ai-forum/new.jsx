import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { AiForumCreateView } from 'src/sections/dashboard/ai-forum/view';

// ----------------------------------------------------------------------

const metadata = { title: `AI Forum — create post | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <AiForumCreateView />
    </>
  );
}


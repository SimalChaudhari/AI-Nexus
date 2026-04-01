import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { AiForumView } from 'src/sections/ai-forum/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `AI Forum | ${CONFIG.site.name}`,
  description: 'Join the AI Forum, ask posts, get help, and share knowledge with the community',
};

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </Helmet>

      <AiForumView />
    </>
  );
}



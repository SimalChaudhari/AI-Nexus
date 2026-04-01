import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { AiForumDetailView } from 'src/sections/ai-forum/view';

// ----------------------------------------------------------------------

const metadata = {
  title: `AI Forum Details | ${CONFIG.site.name}`,
  description: 'View AI Forum discussion details',
};

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </Helmet>

      <AiForumDetailView />
    </>
  );
}



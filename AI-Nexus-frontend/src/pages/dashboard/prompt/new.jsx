import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';
import { PromptCreateView } from 'src/sections/dashboard/prompt/view/prompt-create-view';

const metadata = { title: `Add prompt | Dashboard - ${CONFIG.site.name}` };

export default function PromptCreatePage() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <PromptCreateView />
    </>
  );
}

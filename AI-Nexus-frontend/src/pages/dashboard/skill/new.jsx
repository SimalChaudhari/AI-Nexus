import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { SkillCreateView } from 'src/sections/dashboard/skill/view';

// ----------------------------------------------------------------------

const metadata = { title: `Create a new skill | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <SkillCreateView />
    </>
  );
}

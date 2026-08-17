import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { SkillListView } from 'src/sections/dashboard/skill/view';

// ----------------------------------------------------------------------

const metadata = { title: `Skill list | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <SkillListView />
    </>
  );
}

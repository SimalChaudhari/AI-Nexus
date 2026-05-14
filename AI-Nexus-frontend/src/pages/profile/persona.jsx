import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { PersonaSettingsView } from 'src/sections/dashboard/profile/persona-settings-view';

// ----------------------------------------------------------------------

const metadata = { title: `Persona & learning profile | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <PersonaSettingsView />
    </>
  );
}

import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { SpeakerCreateView } from 'src/sections/dashboard/speaker/view';

const metadata = { title: `New speaker | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <SpeakerCreateView />
    </>
  );
}

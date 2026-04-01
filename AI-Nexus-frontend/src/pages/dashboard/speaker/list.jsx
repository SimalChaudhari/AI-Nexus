import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { SpeakerListView } from 'src/sections/dashboard/speaker/view';

const metadata = { title: `Speaker list | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <SpeakerListView />
    </>
  );
}

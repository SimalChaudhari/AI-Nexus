import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { CONFIG } from 'src/config-global';
import { SpeakerDetailsView } from 'src/sections/dashboard/speaker/view';

const metadata = { title: `Speaker details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id } = useParams();
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <SpeakerDetailsView id={id} />
    </>
  );
}

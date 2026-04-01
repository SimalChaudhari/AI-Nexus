import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { CONFIG } from 'src/config-global';
import { SpeakerEditView } from 'src/sections/dashboard/speaker/view';

const metadata = { title: `Edit speaker | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id } = useParams();
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      <SpeakerEditView id={id} />
    </>
  );
}

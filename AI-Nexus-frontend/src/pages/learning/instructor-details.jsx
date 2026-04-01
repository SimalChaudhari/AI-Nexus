import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import { CONFIG } from 'src/config-global';

import { LearningInstructorDetailsView } from 'src/sections/learning/view/learning-instructor-details-view';

// ----------------------------------------------------------------------

const metadata = { title: `Instructor | ${CONFIG.site.name}` };

export default function LearningInstructorDetailsPage() {
  const params = useParams();

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <LearningInstructorDetailsView id={params.id} />
    </>
  );
}

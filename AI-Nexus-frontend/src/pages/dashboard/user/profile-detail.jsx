import { Helmet } from 'react-helmet-async';
import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { UserProfileDetailView } from 'src/sections/dashboard/user/view';

// ----------------------------------------------------------------------

const metadata = { title: `Profile | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id } = useParams();
  const isOwnProfile = !id; // If no id, it's own profile

  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <UserProfileDetailView isOwnProfile={isOwnProfile} />
    </>
  );
}


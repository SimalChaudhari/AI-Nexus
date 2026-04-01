import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { UserProfileDetailView } from 'src/sections/dashboard/user/view';

// ----------------------------------------------------------------------

const metadata = { title: `My Profile | ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <UserProfileDetailView isOwnProfile />
    </>
  );
}


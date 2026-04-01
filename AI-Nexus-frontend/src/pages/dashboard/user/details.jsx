import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';
import { useGetUser } from 'src/actions/user';

import { UserDetailsView } from 'src/sections/dashboard/user/view';

// ----------------------------------------------------------------------

const metadata = { title: `User details | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();

  const { user, userLoading, userError } = useGetUser(id);

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <UserDetailsView user={user} loading={userLoading} error={userError} />
    </>
  );
}


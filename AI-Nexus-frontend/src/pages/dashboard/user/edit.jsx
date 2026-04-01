import { Helmet } from 'react-helmet-async';

import { useParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';
import { useGetUser } from 'src/actions/user';
import { LoadingScreen } from 'src/components/loading-screen';

import { UserEditView } from 'src/sections/dashboard/user/view';

// ----------------------------------------------------------------------

const metadata = { title: `User edit | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  const { id = '' } = useParams();

  const { user, userLoading, userError } = useGetUser(id);

  if (userLoading) {
    return <LoadingScreen />;
  }

  if (userError || !user) {
    return (
      <>
        <Helmet>
          <title> {metadata.title}</title>
        </Helmet>
        <UserEditView user={null} />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title> {metadata.title}</title>
      </Helmet>

      <UserEditView user={user} />
    </>
  );
}

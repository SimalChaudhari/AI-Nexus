import { Helmet } from 'react-helmet-async';
import { useParams } from 'src/routes/hooks';
import { CONFIG } from 'src/config-global';
import { LoadingScreen } from 'src/components/loading-screen';
import { ProgramEditView } from 'src/sections/dashboard/course/program/view';
import { useGetProgram } from 'src/actions/program';

export default function Page() {
  const { id = '' } = useParams();
  const { program, programLoading } = useGetProgram(id);
  if (programLoading) return <LoadingScreen />;
  return (
    <>
      <Helmet><title>{`Edit program | ${CONFIG.site.name}`}</title></Helmet>
      <ProgramEditView program={program} />
    </>
  );
}

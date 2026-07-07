import { Helmet } from 'react-helmet-async';
import { useParams } from 'src/routes/hooks';
import { CONFIG } from 'src/config-global';
import { ProgramDetailsView } from 'src/sections/dashboard/course/program/view';
import { useGetProgram } from 'src/actions/program';

export default function Page() {
  const { id = '' } = useParams();
  const { program, programLoading, programError } = useGetProgram(id);
  return (
    <>
      <Helmet><title>{`Program | ${CONFIG.site.name}`}</title></Helmet>
      <ProgramDetailsView program={program} loading={programLoading} error={programError} />
    </>
  );
}

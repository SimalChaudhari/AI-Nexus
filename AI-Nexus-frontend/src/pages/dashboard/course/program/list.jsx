import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { ProgramListView } from 'src/sections/dashboard/course/program/view';

export default function Page() {
  return (
    <>
      <Helmet><title>{`Programs | ${CONFIG.site.name}`}</title></Helmet>
      <ProgramListView />
    </>
  );
}

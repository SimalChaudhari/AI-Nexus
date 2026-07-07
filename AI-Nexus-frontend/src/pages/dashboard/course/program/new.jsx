import { Helmet } from 'react-helmet-async';
import { CONFIG } from 'src/config-global';
import { ProgramCreateView } from 'src/sections/dashboard/course/program/view';

export default function Page() {
  return (
    <>
      <Helmet><title>{`New program | ${CONFIG.site.name}`}</title></Helmet>
      <ProgramCreateView />
    </>
  );
}

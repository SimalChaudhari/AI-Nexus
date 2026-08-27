import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { WeeklyMetricsView } from 'src/sections/dashboard/weekly-metrics/view/weekly-metrics-view';

const metadata = { title: `Weekly Metrics | Dashboard - ${CONFIG.site.name}` };

export default function Page() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>

      <WeeklyMetricsView />
    </>
  );
}

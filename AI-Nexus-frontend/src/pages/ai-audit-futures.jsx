import { Stack } from '@mui/material';

import { PageSectionHeader } from 'src/components/page-section-header/page-section-header';
import { DashboardContent } from 'src/layouts/dashboard';

import AiMaturityAssessmentPanel from 'src/sections/audit/ai-maturity-assessment-panel';

export default function AiAuditFuturesPage() {
  return (
    <DashboardContent>
      <Stack spacing={2.5}>
        <PageSectionHeader
          title="AI Readiness Assessment"
          description="Run a structured AI readiness assessment with live rollup scores."
        />

        <AiMaturityAssessmentPanel />
      </Stack>
    </DashboardContent>
  );
}

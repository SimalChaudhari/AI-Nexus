import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

import { Iconify } from 'src/components/iconify';

import { CourseAssignmentSubmissionsTable } from './course-assignment-submissions-table';

// ----------------------------------------------------------------------

export function CourseAssignmentSubmissionsModuleDetail({
  moduleSummary,
  deletingId,
  verifyingId,
  regradingId,
  onBack,
  onDeleteRow,
  onVerifyRow,
  onRegradeRow,
  onViewLogRow,
}) {
  const count = moduleSummary?.submissions.length || 0;

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
        <Button
          size="small"
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          onClick={onBack}
        >
          All modules
        </Button>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {moduleSummary?.label}
        </Typography>
        <Chip
          size="small"
          variant="soft"
          color="primary"
          label={`${count} submission${count !== 1 ? 's' : ''}`}
        />
      </Stack>

      <CourseAssignmentSubmissionsTable
        rows={moduleSummary?.submissions || []}
        deletingId={deletingId}
        verifyingId={verifyingId}
        regradingId={regradingId}
        onDeleteRow={onDeleteRow}
        onVerifyRow={onVerifyRow}
        onRegradeRow={onRegradeRow}
        onViewLogRow={onViewLogRow}
      />
    </Stack>
  );
}

import { useState } from 'react';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { CourseAssignmentSubmissionsModuleList } from './assignment-submissions/course-assignment-submissions-module-list';
import { CourseAssignmentSubmissionsModuleDetail } from './assignment-submissions/course-assignment-submissions-module-detail';
import { CourseAssignmentSubmissionsManualVerifyDialog } from './assignment-submissions/course-assignment-submissions-manual-verify-dialog';
import { CourseAssignmentVerificationLogDialog } from './assignment-submissions/course-assignment-verification-log-dialog';
import { useCourseAssignmentSubmissions } from './assignment-submissions/use-course-assignment-submissions';

// ----------------------------------------------------------------------

export function CourseAssignmentSubmissionsPanel({ courseId, sx }) {
  const submissions = useCourseAssignmentSubmissions(courseId);
  const [logTarget, setLogTarget] = useState(null);

  if (!courseId) return null;

  return (
    <Card sx={{ p: 3, ...sx }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:document-add-bold" width={24} />
          <Typography variant="h6">My assessment files</Typography>
        </Stack>
        <Chip
          size="small"
          label={`${submissions.rows.length} file${submissions.rows.length !== 1 ? 's' : ''}`}
          variant="soft"
        />
      </Stack>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Learner assessment uploads grouped by module. AI grades submissions automatically; use manual
        verify when review is needed.
      </Typography>

      {submissions.userOptions.length > 1 ? (
        <FormControl size="small" sx={{ minWidth: 240, mb: 2 }}>
          <InputLabel>Filter by learner</InputLabel>
          <Select
            label="Filter by learner"
            value={submissions.filterUserId}
            onChange={(e) => submissions.setFilterUserId(e.target.value)}
          >
            <MenuItem value="">All learners</MenuItem>
            {submissions.userOptions.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}

      {submissions.loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading submissions…
        </Typography>
      ) : !submissions.selectedModuleId ? (
        <CourseAssignmentSubmissionsModuleList
          modules={submissions.moduleSummaries}
          onSelectModule={submissions.setSelectedModuleId}
        />
      ) : (
        <CourseAssignmentSubmissionsModuleDetail
          moduleSummary={submissions.activeModule}
          deletingId={submissions.deletingId}
          verifyingId={submissions.verifyingId}
          regradingId={submissions.regradingId}
          onBack={() => submissions.setSelectedModuleId(null)}
          onDeleteRow={submissions.setDeleteTarget}
          onVerifyRow={submissions.setVerifyTarget}
          onRegradeRow={submissions.handleRegrade}
          onViewLogRow={setLogTarget}
        />
      )}

      <CourseAssignmentVerificationLogDialog
        open={Boolean(logTarget)}
        submission={logTarget}
        onClose={() => setLogTarget(null)}
      />

      <CourseAssignmentSubmissionsManualVerifyDialog
        open={Boolean(submissions.verifyTarget)}
        row={submissions.verifyTarget}
        saving={Boolean(submissions.verifyingId)}
        onClose={() => submissions.setVerifyTarget(null)}
        onSubmit={submissions.handleManualVerify}
      />

      <ConfirmDialog
        open={Boolean(submissions.deleteTarget)}
        onClose={() => submissions.setDeleteTarget(null)}
        title="Delete assessment file"
        content={
          submissions.deleteTarget
            ? `Remove the uploaded file from ${submissions.deleteTarget.userName || 'this learner'}? This cannot be undone.`
            : ''
        }
        action={
          <Button
            variant="contained"
            color="error"
            disabled={Boolean(submissions.deletingId)}
            onClick={submissions.handleConfirmDelete}
          >
            Delete
          </Button>
        }
      />
    </Card>
  );
}

import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { Iconify } from 'src/components/iconify';
import { resolveAssetUrl } from 'src/utils/asset-url';

import { truncateSubmissionText } from './course-assignment-submissions-utils';

// ----------------------------------------------------------------------

export function CourseAssignmentSubmissionsTable({
  rows,
  deletingId,
  onDeleteRow,
}) {
  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No assessment files uploaded for this module yet.
      </Typography>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Learner</TableCell>
          <TableCell>Assessment</TableCell>
          <TableCell>File</TableCell>
          <TableCell>Uploaded</TableCell>
          <TableCell align="right">Action</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {row.userName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.userEmail}
              </Typography>
            </TableCell>
            <TableCell>{truncateSubmissionText(row.questionPrompt)}</TableCell>
            <TableCell>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Iconify icon="solar:download-bold" width={16} />}
                href={resolveAssetUrl(row.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {truncateSubmissionText(row.originalFileName, 28)}
              </Button>
            </TableCell>
            <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {row.uploadedAt ? new Date(row.uploadedAt).toLocaleString() : '—'}
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Delete file">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={Boolean(deletingId)}
                    onClick={() => onDeleteRow(row)}
                  >
                    {deletingId === row.id ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

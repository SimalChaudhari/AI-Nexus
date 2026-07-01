import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

import { Iconify } from 'src/components/iconify';

import { UNLINKED_MODULE_KEY } from './course-assignment-submissions-utils';

// ----------------------------------------------------------------------

export function CourseAssignmentSubmissionsModuleList({ modules, onSelectModule }) {
  if (!modules.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No modules in this course yet.
      </Typography>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Module</TableCell>
          <TableCell width={120}>Submissions</TableCell>
          <TableCell align="right" width={56} />
        </TableRow>
      </TableHead>
      <TableBody>
        {modules.map((mod) => (
          <TableRow
            key={mod.id}
            hover
            sx={{ cursor: 'pointer' }}
            onClick={() => onSelectModule(mod.id)}
          >
            <TableCell>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Iconify
                  icon={
                    mod.id === UNLINKED_MODULE_KEY
                      ? 'solar:diploma-verified-bold'
                      : 'solar:book-2-bold'
                  }
                  width={20}
                  sx={{ color: 'primary.main', flexShrink: 0 }}
                />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {mod.label}
                </Typography>
              </Stack>
            </TableCell>
            <TableCell>
              <Chip
                size="small"
                variant="soft"
                color={mod.submissions.length > 0 ? 'primary' : 'default'}
                label={mod.submissions.length}
              />
            </TableCell>
            <TableCell align="right">
              <Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ color: 'text.disabled' }} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

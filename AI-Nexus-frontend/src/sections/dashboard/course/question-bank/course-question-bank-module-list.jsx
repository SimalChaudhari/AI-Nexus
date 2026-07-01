import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import {
  UNLINKED_MODULE_KEY,
  QUESTION_BANK_CATEGORIES,
  getModuleCategoryCount,
} from './course-question-bank-utils';

// ----------------------------------------------------------------------

function moduleRowSx(mod, count, theme) {
  if (mod.id === UNLINKED_MODULE_KEY) {
    return {
      cursor: 'pointer',
      bgcolor: count > 0 ? alpha(theme.palette.info.main, 0.08) : alpha(theme.palette.grey[500], 0.04),
      borderLeft: `3px solid ${count > 0 ? theme.palette.info.main : theme.palette.grey[400]}`,
      '&:hover': {
        bgcolor: alpha(theme.palette.info.main, 0.12),
      },
    };
  }

  if (count > 0) {
    return {
      cursor: 'pointer',
      bgcolor: alpha(theme.palette.success.main, 0.08),
      borderLeft: `3px solid ${theme.palette.success.main}`,
      '&:hover': {
        bgcolor: alpha(theme.palette.success.main, 0.12),
      },
    };
  }

  return {
    cursor: 'pointer',
    borderLeft: `3px solid ${alpha(theme.palette.grey[500], 0.2)}`,
  };
}

export function CourseQuestionBankModuleList({ modules, categoryKey, onSelectModule }) {
  const theme = useTheme();
  const category = QUESTION_BANK_CATEGORIES[categoryKey] || QUESTION_BANK_CATEGORIES.quiz;

  if (!modules.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No modules in this course yet. Add modules first, then create questions.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          variant="soft"
          color="success"
          icon={<Iconify icon="solar:link-circle-bold" width={16} />}
          label="Linked to module — highlighted in green"
        />
        <Chip
          size="small"
          variant="soft"
          color="info"
          icon={<Iconify icon="solar:unlink-bold" width={16} />}
          label="Course-level (not linked) — highlighted in blue"
        />
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Module</TableCell>
            <TableCell width={120}>Link status</TableCell>
            <TableCell width={100}>{category.shortLabel}s</TableCell>
            <TableCell align="right" width={56} />
          </TableRow>
        </TableHead>
        <TableBody>
          {modules.map((mod) => {
            const count = getModuleCategoryCount(mod, categoryKey);
            const isUnlinked = mod.id === UNLINKED_MODULE_KEY;

            return (
              <TableRow
                key={mod.id}
                hover
                sx={moduleRowSx(mod, count, theme)}
                onClick={() => onSelectModule(mod.id)}
              >
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1.25}>
                    <Iconify
                      icon={
                        isUnlinked ? 'solar:diploma-verified-bold' : 'solar:book-2-bold'
                      }
                      width={20}
                      sx={{
                        color: isUnlinked ? 'info.main' : count > 0 ? 'success.main' : 'text.disabled',
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {mod.label}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  {isUnlinked ? (
                    <Chip size="small" variant="soft" color="info" label="Not linked" />
                  ) : (
                    <Chip size="small" variant="soft" color="success" label="Linked" />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="soft"
                    color={count > 0 ? category.color : 'default'}
                    label={count}
                  />
                </TableCell>
                <TableCell align="right">
                  <Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ color: 'text.disabled' }} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Stack>
  );
}

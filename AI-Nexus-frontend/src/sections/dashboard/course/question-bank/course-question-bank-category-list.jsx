import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import { CourseQuestionBankQuestionRow } from './course-question-bank-question-row';
import {
  QUESTION_BANK_CATEGORIES,
  flattenCategoryQuestions,
} from './course-question-bank-utils';

// ----------------------------------------------------------------------

function linkedRowSx(isLinked, theme) {
  if (isLinked) {
    return {
      bgcolor: alpha(theme.palette.success.main, 0.06),
      borderLeft: `3px solid ${theme.palette.success.main}`,
    };
  }
  return {
    bgcolor: alpha(theme.palette.info.main, 0.06),
    borderLeft: `3px solid ${theme.palette.info.main}`,
  };
}

export function CourseQuestionBankCategoryList({
  moduleSummaries,
  categoryKey,
  onBack,
  onAdd,
  onEditQuestion,
  onDeleteQuestion,
}) {
  const theme = useTheme();
  const category = QUESTION_BANK_CATEGORIES[categoryKey] || QUESTION_BANK_CATEGORIES.quiz;
  const items = flattenCategoryQuestions(moduleSummaries, categoryKey);

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Button
            size="small"
            startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            onClick={onBack}
          >
            Quiz &amp; Assessment
          </Button>
          <Iconify icon={category.icon} width={20} sx={{ color: `${category.color}.main` }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {category.label}
          </Typography>
          <Chip
            size="small"
            variant="soft"
            color={category.color}
            label={`${items.length} item${items.length !== 1 ? 's' : ''}`}
          />
        </Stack>
        <Button
          variant="contained"
          size="small"
          color={category.color}
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={onAdd}
        >
          Add {category.shortLabel.toLowerCase()}
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          variant="soft"
          color="success"
          icon={<Iconify icon="solar:link-circle-bold" width={16} />}
          label="Linked to module"
        />
        <Chip
          size="small"
          variant="soft"
          color="info"
          icon={<Iconify icon="solar:unlink-bold" width={16} />}
          label="Course-level (not linked)"
        />
      </Stack>

      {items.length === 0 ? (
        <Box
          sx={{
            py: 4,
            px: 2,
            textAlign: 'center',
            borderRadius: 1,
            border: (t) =>
              `1px dashed ${alpha(t.palette[category.color]?.main || t.palette.primary.main, 0.24)}`,
            bgcolor: alpha(theme.palette[category.color]?.main || theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No {category.label.toLowerCase()} yet.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            color={category.color}
            startIcon={<Iconify icon={category.icon} />}
            onClick={onAdd}
          >
            Add {category.shortLabel.toLowerCase()}
          </Button>
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={100}>Type</TableCell>
              <TableCell>Question</TableCell>
              <TableCell width={200}>Module</TableCell>
              <TableCell width={120}>Link</TableCell>
              <TableCell align="right" width={132}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(({ question, moduleLabel, isLinked }) => (
              <TableRow key={question.id} hover sx={linkedRowSx(isLinked, theme)}>
                <CourseQuestionBankQuestionRow
                  question={question}
                  moduleLabel={moduleLabel}
                  isLinked={isLinked}
                  renderAsCells
                  onEdit={onEditQuestion}
                  onDelete={onDeleteQuestion}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}

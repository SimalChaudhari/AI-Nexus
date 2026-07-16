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
  UNLINKED_MODULE_KEY,
  QUESTION_BANK_CATEGORIES,
  getModuleCategoryQuestions,
} from './course-question-bank-utils';

// ----------------------------------------------------------------------

export function CourseQuestionBankModuleQuestions({
  moduleSummary,
  categoryKey,
  onBack,
  onAddItem,
  onEditQuestion,
  onDeleteQuestion,
}) {
  const theme = useTheme();
  const category = QUESTION_BANK_CATEGORIES[categoryKey] || QUESTION_BANK_CATEGORIES.quiz;
  const questions = getModuleCategoryQuestions(moduleSummary, categoryKey);
  const isLinked = moduleSummary?.id !== UNLINKED_MODULE_KEY;

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
        <Chip size="small" variant="soft" color={category.color} label={category.label} />
        <Chip
          size="small"
          variant="soft"
          color={isLinked ? 'success' : 'info'}
          icon={
            <Iconify
              icon={isLinked ? 'solar:link-circle-bold' : 'solar:unlink-bold'}
              width={14}
            />
          }
          label={isLinked ? 'Linked to module' : 'Not linked to module'}
        />
        <Chip
          size="small"
          variant="soft"
          color={questions.length > 0 ? category.color : 'default'}
          label={`${questions.length} item${questions.length !== 1 ? 's' : ''}`}
        />
      </Stack>

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          size="small"
          color={category.color}
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={onAddItem}
        >
          Add {category.shortLabel.toLowerCase()}
        </Button>
      </Stack>

      {questions.length === 0 ? (
        <Box
          sx={{
            py: 4,
            px: 2,
            textAlign: 'center',
            borderRadius: 1,
            border: (t) => `1px dashed ${alpha(t.palette[category.color]?.main || t.palette.primary.main, 0.24)}`,
            bgcolor: alpha(theme.palette[category.color]?.main || theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No {category.label.toLowerCase()} in this {isLinked ? 'module' : 'course-level bucket'} yet.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            color={category.color}
            startIcon={<Iconify icon={category.icon} />}
            onClick={onAddItem}
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
              <TableCell align="right" width={132}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.map((question) => (
              <CourseQuestionBankQuestionRow
                key={question.id}
                question={question}
                onEdit={onEditQuestion}
                onDelete={onDeleteQuestion}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}

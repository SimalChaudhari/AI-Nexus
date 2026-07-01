import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

import { QUESTION_BANK_CATEGORIES } from './course-question-bank-utils';

// ----------------------------------------------------------------------

function CategoryCard({ category, count, onSelect, onAdd }) {
  const theme = useTheme();
  const paletteColor = theme.palette[category.color] || theme.palette.primary;

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onSelect(category.key)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(category.key);
        }
      }}
      sx={{
        p: 2.5,
        borderRadius: 1.5,
        cursor: 'pointer',
        border: `1px solid ${alpha(paletteColor.main, 0.24)}`,
        bgcolor: alpha(paletteColor.main, 0.08),
        transition: (t) =>
          t.transitions.create(['border-color', 'box-shadow', 'transform'], {
            duration: t.transitions.duration.shorter,
          }),
        '&:hover': {
          borderColor: paletteColor.main,
          boxShadow: `0 8px 24px ${alpha(paletteColor.main, 0.16)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 1,
              bgcolor: alpha(paletteColor.main, 0.16),
              color: paletteColor.main,
            }}
          >
            <Iconify icon={category.icon} width={24} />
          </Box>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {category.label}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {category.key === 'quiz'
                ? 'MCQ, True/False, and short text questions'
                : 'File upload assessments with reference materials'}
            </Typography>
          </Stack>
        </Stack>
        <Stack alignItems="flex-end" spacing={0.75}>
          <Chip
            size="small"
            variant="soft"
            color={category.color}
            label={`${count} item${count !== 1 ? 's' : ''}`}
          />
          <Button
            size="small"
            variant="contained"
            color={category.color}
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={(e) => {
              e.stopPropagation();
              onAdd(category.key);
            }}
          >
            Add {category.shortLabel.toLowerCase()}
          </Button>
          <Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ color: 'text.disabled' }} />
        </Stack>
      </Stack>
    </Box>
  );
}

export function CourseQuestionBankCategoryPicker({ moduleSummaries, onSelectCategory, onAdd }) {
  const quizCount = (moduleSummaries || []).reduce((sum, mod) => sum + (mod.quizCount || 0), 0);
  const assessmentCount = (moduleSummaries || []).reduce(
    (sum, mod) => sum + (mod.assessmentCount || 0),
    0
  );

  return (
    <Stack spacing={1.5}>
      <CategoryCard
        category={QUESTION_BANK_CATEGORIES.quiz}
        count={quizCount}
        onSelect={onSelectCategory}
        onAdd={onAdd}
      />
      <CategoryCard
        category={QUESTION_BANK_CATEGORIES.assessment}
        count={assessmentCount}
        onSelect={onSelectCategory}
        onAdd={onAdd}
      />
    </Stack>
  );
}

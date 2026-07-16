import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';

import { CourseQuestionBankCategoryPicker } from './question-bank/course-question-bank-category-picker';
import { CourseQuestionBankCategoryList } from './question-bank/course-question-bank-category-list';
import { CourseQuestionBankQuestionFormDrawer } from './question-bank/course-question-bank-question-form-drawer';
import { useCourseQuestionBank } from './question-bank/use-course-question-bank';

// ----------------------------------------------------------------------

export function CourseQuestionBankPanel({ courseId, sx }) {
  const bank = useCourseQuestionBank(courseId);

  if (!courseId) return null;

  return (
    <Card sx={{ p: 3, ...sx }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:clipboard-list-bold" width={24} />
          <Typography variant="h6">Question bank</Typography>
        </Stack>
      </Stack>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Choose <strong>Quiz</strong> or <strong>Assessment</strong> to see all items in that category.
        Linked modules are highlighted in <strong>green</strong>; course-level items in{' '}
        <strong>blue</strong>.
      </Typography>

      {bank.loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      ) : !bank.selectedCategory ? (
        <CourseQuestionBankCategoryPicker
          moduleSummaries={bank.moduleSummaries}
          onSelectCategory={bank.setSelectedCategory}
          onAdd={bank.openCreate}
        />
      ) : (
        <CourseQuestionBankCategoryList
          moduleSummaries={bank.moduleSummaries}
          categoryKey={bank.selectedCategory}
          onBack={() => bank.setSelectedCategory(null)}
          onAdd={() => bank.openCreate(bank.selectedCategory)}
          onEditQuestion={bank.openEdit}
          onDeleteQuestion={bank.setDeleteTarget}
        />
      )}

      <CourseQuestionBankQuestionFormDrawer
        open={bank.dialogOpen}
        saving={bank.saving}
        editing={bank.editing}
        moduleChoices={bank.moduleChoices}
        formType={bank.formType}
        formTypeOptions={bank.formTypeOptions}
        formTypeLocked={bank.formTypeLocked}
        formPrompt={bank.formPrompt}
        formModuleId={bank.formModuleId}
        formExplanation={bank.formExplanation}
        formOptions={bank.formOptions}
        formCorrectIndex={bank.formCorrectIndex}
        formTfCorrect={bank.formTfCorrect}
        formShortCorrect={bank.formShortCorrect}
        formAssignedUsers={bank.formAssignedUsers}
        userOptions={bank.userOptions}
        usersLoading={bank.usersLoading}
        formPassingPercentage={bank.formPassingPercentage}
        questionMaterials={bank.questionMaterials}
        answerSheetMaterials={bank.answerSheetMaterials}
        guideMaterials={bank.guideMaterials}
        referenceMaterials={bank.referenceMaterials}
        onClose={bank.closeDialog}
        onSave={bank.handleSave}
        onFormTypeChange={bank.handleFormTypeChange}
        onFormPromptChange={(e) => bank.setFormPrompt(e.target.value)}
        onFormModuleIdChange={(e) => bank.setFormModuleId(e.target.value)}
        onFormExplanationChange={(e) => bank.setFormExplanation(e.target.value)}
        onFormCorrectIndexChange={(e) => bank.setFormCorrectIndex(Number(e.target.value))}
        onFormTfCorrectChange={(e) => bank.setFormTfCorrect(e.target.value)}
        onFormShortCorrectChange={(e) => bank.setFormShortCorrect(e.target.value)}
        onFormAssignedUsersChange={bank.setFormAssignedUsers}
        onFormPassingPercentageChange={(e) => bank.setFormPassingPercentage(Number(e.target.value))}
        onQuestionMaterialsChange={bank.setQuestionMaterials}
        onAnswerSheetMaterialsChange={bank.setAnswerSheetMaterials}
        onGuideMaterialsChange={bank.setGuideMaterials}
        onReferenceMaterialsChange={bank.setReferenceMaterials}
        onAddOption={bank.addOption}
        onSetOptionAt={bank.setOptionAt}
        onRemoveOption={bank.removeOption}
      />

      <ConfirmDialog
        open={Boolean(bank.deleteTarget)}
        onClose={() => bank.setDeleteTarget(null)}
        title="Delete question"
        content="Remove this question from the bank?"
        action={
          <Button variant="contained" color="error" onClick={bank.handleConfirmDelete}>
            Delete
          </Button>
        }
      />
    </Card>
  );
}

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';
import { resolveAssetUrl } from 'src/utils/asset-url';

import { questionTypeChipLabel, truncateQuestionPrompt } from './course-question-bank-utils';

// ----------------------------------------------------------------------

function QuestionCells({ question, moduleLabel, isLinked, onEdit, onDelete }) {
  return (
    <>
      <TableCell width={100}>
        <Chip size="small" label={questionTypeChipLabel(question.questionType)} variant="soft" />
      </TableCell>
      <TableCell>{truncateQuestionPrompt(question.prompt)}</TableCell>
      {moduleLabel != null ? (
        <>
          <TableCell width={200}>
            <Typography variant="body2" noWrap title={moduleLabel}>
              {moduleLabel}
            </Typography>
          </TableCell>
          <TableCell width={120}>
            <Chip
              size="small"
              variant="soft"
              color={isLinked ? 'success' : 'info'}
              label={isLinked ? 'Linked' : 'Not linked'}
            />
          </TableCell>
        </>
      ) : null}
      <TableCell align="right" width={132}>
        {question.questionType === 'assignment' && question.referenceFileUrl ? (
          <Tooltip title="Download reference file" arrow>
            <IconButton
              size="small"
              color="primary"
              component="a"
              href={resolveAssetUrl(question.referenceFileUrl)}
              download={question.referenceFileName || 'reference-file'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Iconify icon="eva:cloud-download-fill" width={18} />
            </IconButton>
          </Tooltip>
        ) : null}
        <IconButton size="small" color="default" onClick={() => onEdit(question)}>
          <Iconify icon="solar:pen-bold" width={18} />
        </IconButton>
        <IconButton size="small" color="error" onClick={() => onDelete(question)}>
          <Iconify icon="solar:trash-bin-trash-bold" width={18} />
        </IconButton>
      </TableCell>
    </>
  );
}

export function CourseQuestionBankQuestionRow({
  question,
  moduleLabel,
  isLinked,
  renderAsCells = false,
  onEdit,
  onDelete,
}) {
  if (renderAsCells) {
    return (
      <QuestionCells
        question={question}
        moduleLabel={moduleLabel}
        isLinked={isLinked}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <TableRow hover>
      <QuestionCells question={question} onEdit={onEdit} onDelete={onDelete} />
    </TableRow>
  );
}

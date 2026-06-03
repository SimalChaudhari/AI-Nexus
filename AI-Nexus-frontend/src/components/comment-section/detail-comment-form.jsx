import { CommentRichTextComposer } from './comment-rich-text-composer';

// ----------------------------------------------------------------------

export function DetailCommentForm({
  commentText,
  commentEditorKey,
  onChange,
  onUploadImage,
  onClear,
  onSubmit,
  submitting = false,
  maxLength = 50000,
  title = 'Write a comment',
  submitLabel = 'Post',
  placeholder = 'Write a comment…',
}) {
  return (
    <CommentRichTextComposer
      value={commentText}
      editorKey={commentEditorKey}
      onChange={onChange}
      onUploadImage={onUploadImage}
      onSecondary={onClear}
      onSubmit={onSubmit}
      submitting={submitting}
      maxLength={maxLength}
      title={title}
      placeholder={placeholder}
      secondaryLabel="Clear"
      submitLabel={submitLabel}
      submittingLabel="Posting…"
      showHeaderIcon
      stopPropagation={false}
    />
  );
}

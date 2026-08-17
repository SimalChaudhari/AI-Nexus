export function getNewsletterStatus(item) {
  if (!item?.isActive) {
    return { label: 'Hidden', color: 'default' };
  }
  if (item.publishAt && new Date(item.publishAt).getTime() > Date.now()) {
    return { label: 'Scheduled', color: 'warning' };
  }
  return { label: 'Published', color: 'success' };
}

export function getNewsletterFormatLabel(format) {
  return format === 'pdf' ? 'PDF' : 'Article';
}

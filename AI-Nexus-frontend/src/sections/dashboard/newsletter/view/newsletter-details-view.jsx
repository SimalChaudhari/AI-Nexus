import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';
import { fDateTime } from 'src/utils/format-time';
import { NewsletterDocumentViewer } from 'src/sections/workflows/newsletter-document-viewer';
import { getNewsletterFormatLabel, getNewsletterStatus } from '../newsletter-status';

// ----------------------------------------------------------------------

export function NewsletterDetailsView({ newsletter, loading, error }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !newsletter) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Newsletter not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.newsletter.list}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  const displayName = newsletter.title || '-';
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const status = getNewsletterStatus(newsletter);

  const headerChips = [
    {
      label: getNewsletterFormatLabel(newsletter.format),
      icon: newsletter.format === 'pdf' ? 'solar:file-text-bold' : 'solar:document-text-bold',
      color: newsletter.format === 'pdf' ? 'info' : 'primary',
      variant: 'soft',
    },
    {
      label: status.label,
      icon: status.label === 'Published' ? 'solar:check-circle-bold' : 'solar:clock-circle-bold',
      color: status.color,
      variant: 'soft',
    },
  ];

  const sections = [
    {
      title: 'Newsletter information',
      icon: 'solar:letter-bold',
      rows: [
        { label: 'Title', value: newsletter.title || '-' },
        { label: 'Summary', value: newsletter.summary || '-' },
        { label: 'Format', value: getNewsletterFormatLabel(newsletter.format) },
        {
          label: 'File',
          value: newsletter.fileUrl ? (
            <Link href={newsletter.fileUrl} target="_blank" rel="noopener noreferrer">
              {newsletter.originalFileName || 'Open file'}
            </Link>
          ) : (
            '-'
          ),
        },
        {
          label: 'Publish at',
          value: newsletter.publishAt
            ? fDateTime(newsletter.publishAt, 'DD MMM YYYY h:mm A')
            : 'Immediately',
        },
        { label: 'Sort order', value: String(newsletter.sortOrder ?? 0) },
      ],
    },
    {
      title: 'Preview',
      icon: 'solar:eye-bold',
      fullWidth: true,
      rows: [
        {
          label: 'Content',
          value: newsletter.fileUrl ? (
            <NewsletterDocumentViewer newsletter={newsletter} minHeight={560} includeUnpublished />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              —
            </Typography>
          ),
        },
      ],
    },
    {
      title: 'Meta',
      icon: 'solar:clock-circle-bold',
      rows: [
        {
          label: 'Created At',
          value: newsletter.createdAt ? fDateTime(newsletter.createdAt, 'DD MMM YYYY h:mm A') : '-',
        },
        {
          label: 'Updated At',
          value: newsletter.updatedAt ? fDateTime(newsletter.updatedAt, 'DD MMM YYYY h:mm A') : '-',
        },
      ],
    },
  ];

  return (
    <EntityDetailsLayout
      heading="Newsletter Details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'Newsletters', href: paths.admin.newsletter.list },
        { name: displayName },
      ]}
      editHref={paths.admin.newsletter.edit(newsletter?.id)}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarText: initials,
        title: displayName,
        subtitle: getNewsletterFormatLabel(newsletter.format),
        chips: headerChips,
      }}
      sections={sections}
    />
  );
}

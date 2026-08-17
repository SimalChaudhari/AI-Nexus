import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';
import { fDateTime } from 'src/utils/format-time';
import { skillMarkdownSx } from 'src/sections/workflows/skill-markdown-sx';

// ----------------------------------------------------------------------

export function SkillDetailsView({ skill, loading, error }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !skill) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Skill not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.skill.list}
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

  const displayName = skill.title || skill.name || '-';
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const extraFieldRows = (skill.extraFields || [])
    .filter((field) => field?.key)
    .map((field) => ({
      label: field.key,
      value: field.value || '-',
    }));

  const headerChips = [
    {
      label: skill.isActive ? 'Active' : 'Hidden',
      icon: skill.isActive ? 'solar:check-circle-bold' : 'solar:eye-closed-bold',
      color: skill.isActive ? 'success' : 'default',
      variant: 'soft',
    },
  ];

  const sections = [
    {
      title: 'Skill information',
      icon: 'solar:document-text-bold',
      rows: [
        { label: 'Name', value: skill.name || '-' },
        { label: 'Title', value: skill.title || '-' },
        { label: 'Description', value: skill.description || '-' },
        { label: 'License', value: skill.license || '-' },
        {
          label: 'Source URL',
          value: skill.sourceUrl ? (
            <Link href={skill.sourceUrl} target="_blank" rel="noopener noreferrer">
              {skill.sourceUrl}
            </Link>
          ) : (
            '-'
          ),
        },
        { label: 'Sort order', value: String(skill.sortOrder ?? 0) },
      ],
    },
    ...(extraFieldRows.length
      ? [
          {
            title: 'Extra fields',
            icon: 'solar:widget-bold',
            rows: extraFieldRows,
          },
        ]
      : []),
    {
      title: 'Skill content',
      icon: 'solar:notes-bold',
      fullWidth: true,
      rows: [
        {
          label: 'Content',
          value: skill.content ? (
            <Markdown sx={skillMarkdownSx}>{skill.content}</Markdown>
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
          value: skill.createdAt ? fDateTime(skill.createdAt, 'DD MMM YYYY h:mm A') : '-',
        },
        {
          label: 'Updated At',
          value: skill.updatedAt ? fDateTime(skill.updatedAt, 'DD MMM YYYY h:mm A') : '-',
        },
      ],
    },
  ];

  return (
    <EntityDetailsLayout
      heading="Skill Details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'Skills', href: paths.admin.skill.list },
        { name: displayName },
      ]}
      editHref={paths.admin.skill.edit(skill?.id)}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarText: initials,
        title: displayName,
        subtitle: skill.name,
        chips: headerChips,
      }}
      sections={sections}
    />
  );
}

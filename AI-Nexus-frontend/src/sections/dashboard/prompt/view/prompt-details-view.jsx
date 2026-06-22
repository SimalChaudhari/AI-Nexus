import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';
import { RichTextContent } from 'src/components/html-content';
import { htmlToPlain } from '../prompt-table-row';

const PROVIDER_TITLE = { chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini' };

export function PromptDetailsView({ prompt, loading, error }) {
  if (loading) return <LoadingScreen />;

  if (error || !prompt) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Prompt not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.prompt.list}
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

  const title = htmlToPlain(prompt.sectionTitle) || 'Prompt';
  const initials =
    title
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const sections = [
    {
      title: 'Prompt information',
      icon: 'solar:document-text-bold',
      fullWidth: true,
      rows: [
        {
          label: 'Providers',
          value: (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {(prompt.providers || []).map((providerId) => (
                <Chip key={providerId} size="small" color="primary" variant="soft" label={PROVIDER_TITLE[providerId] || providerId} />
              ))}
            </Stack>
          ),
        },
        { label: 'Section', value: htmlToPlain(prompt.sectionTitle) || '-' },
        { label: 'Use Case', value: htmlToPlain(prompt.useCase) || '-' },
      ],
    },
    {
      title: 'Prompt body',
      icon: 'solar:chat-round-bold',
      fullWidth: true,
      rows: [
        {
          label: 'Prompt',
          value: prompt.prompt ? (
            <RichTextContent html={prompt.prompt} sx={{ color: 'text.primary' }} />
          ) : (
            '-'
          ),
        },
      ],
    },
  ];

  return (
    <EntityDetailsLayout
      heading="Prompt details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'Prompts', href: paths.admin.prompt.list },
        { name: title },
      ]}
      editHref={paths.admin.prompt.edit(prompt.id)}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarText: initials,
        title,
        subtitle: htmlToPlain(prompt.useCase) || undefined,
      }}
      sections={sections}
    />
  );
}

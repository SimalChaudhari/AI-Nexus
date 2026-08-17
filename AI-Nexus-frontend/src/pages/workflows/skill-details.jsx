import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';
import { LoadingScreen } from 'src/components/loading-screen';
import { EmptyContent } from 'src/components/empty-content';
import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown';
import { toast } from 'src/components/snackbar';
import { skillService } from 'src/services/skill.service';
import { skillMarkdownSx } from 'src/sections/workflows/skill-markdown-sx';

export default function WorkflowSkillDetailsPage() {
  const theme = useTheme();
  const { id = '' } = useParams();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await skillService.getSkillById(id);
        if (mounted) setSkill(data);
      } catch (error) {
        if (mounted) setSkill(null);
        toast.error(error?.message || 'Failed to load skill');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleCopy = async () => {
    if (!skill) return;
    const text = [skill.title, skill.description, skill.content].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!skill) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Skill not found"
          action={
            <Button
              component={RouterLink}
              href={`${paths.workflows}?tab=resources`}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to skills
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${skill.title || 'Skill'} | ${CONFIG.site.name}`}</title>
      </Helmet>
      <DashboardContent>
        <Button
          component={RouterLink}
          href={`${paths.workflows}?tab=resources`}
          color="inherit"
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
          sx={{ mb: 3, alignSelf: 'flex-start' }}
        >
          Back to skills
        </Button>

        <Card
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
            boxShadow: 'none',
          }}
        >
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ sm: 'flex-start' }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  letterSpacing: '-0.02em',
                  fontSize: { xs: '1.5rem', md: '1.75rem' },
                  lineHeight: 1.3,
                }}
              >
                {skill.title}
              </Typography>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<Iconify icon="solar:copy-bold" />}
                onClick={handleCopy}
                sx={{ flexShrink: 0 }}
              >
                Copy
              </Button>
            </Stack>

            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                fontFamily: 'inherit',
                fontSize: '1rem',
                lineHeight: 1.75,
              }}
            >
              {skill.description}
            </Typography>

            {skill.sourceUrl ? (
              <Link href={skill.sourceUrl} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 600 }}>
                Reference
              </Link>
            ) : null}

            <Box
              sx={{
                pt: 1,
                borderTop: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
              }}
            >
              <Markdown sx={skillMarkdownSx}>{skill.content}</Markdown>
            </Box>
          </Stack>
        </Card>
      </DashboardContent>
    </>
  );
}

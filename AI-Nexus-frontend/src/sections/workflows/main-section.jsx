import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { MyWorkflows } from './my-workflows';
import { Skills } from './skills';
// import { Templates } from './templates';
import { Newsletter } from './newsletter';
import { PROMPT_PROVIDER_IDS } from './data/prompt-providers';
import { AI_PLAYBOOKS_PROMPTS_TITLE } from './ai-playbooks-labels';
import { WorkflowMainTabIcon } from './workflow-main-tab-icon';

// ----------------------------------------------------------------------

const WORKFLOW_MAIN_TABS = [
  // Templates tab temporarily hidden
  // {
  //   id: 'templates',
  //   label: 'Templates',
  //   icon: 'solar:widget-5-bold-duotone',
  //   imageSrc: null,
  // },
  {
    id: 'resources',
    label: AI_PLAYBOOKS_PROMPTS_TITLE,
    icon: 'simple-icons:openai',
    imageSrc: null,
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: 'solar:settings-minimalistic-bold-duotone',
    imageSrc: null,
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    icon: 'solar:letter-bold-duotone',
    imageSrc: null,
  },
];

// ----------------------------------------------------------------------

export function WorkflowMainSection() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromQuery = searchParams.get('tab');
  const resolveTab = (tab) =>
    tab === 'tools' || tab === 'resources' || tab === 'newsletter' ? tab : 'resources';
  const initialTab = resolveTab(tabFromQuery);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const nextTab = resolveTab(tabFromQuery);
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [tabFromQuery, activeTab]);

  /** URL updates only on tab click — avoids breaking navigation after refresh on this page. */
  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    setSearchParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev);
        nextParams.set('tab', nextTab);
        if (nextTab === 'resources') {
          const typo = nextParams.get('cproivder');
          if (typo && PROMPT_PROVIDER_IDS.has(typo)) {
            nextParams.set('provider', typo);
          } else {
            const raw = nextParams.get('provider') || nextParams.get('cproivder');
            if (!raw || !PROMPT_PROVIDER_IDS.has(raw)) {
              nextParams.set('provider', 'chatgpt');
            }
          }
          nextParams.delete('cproivder');
        } else {
          nextParams.delete('provider');
          nextParams.delete('cproivder');
        }
        return nextParams;
      },
      { replace: true }
    );
  };

  const getTabButtonSx = (tabId) => {
    const isActive = activeTab === tabId;
    return {
      flex: { xs: 1, sm: 'none' },
      px: { xs: 2.5, sm: 5 },
      py: 1.5,
      borderRadius: { xs: 2, sm: '50px' },
      fontWeight: 500,
      fontSize: { xs: '0.875rem', sm: '1rem' },
      textTransform: 'none',
      gap: { xs: 0.75, sm: 1 },
      '& .MuiButton-startIcon': {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ml: 0,
        mr: { xs: 0.5, sm: 0.75 },
      },
      ...(isActive
        ? {
            bgcolor: 'primary.main',
            color: 'common.white',
            boxShadow: theme.customShadows.z8,
            '&:hover': {
              bgcolor: 'primary.dark',
              cursor: 'not-allowed',
            },
          }
        : {
            color: 'text.secondary',
            border: `2px solid ${theme.palette.grey[300]}`,
            '&:hover': {
              bgcolor: 'grey.50',
              color: 'text.primary',
              borderColor: theme.palette.grey[400],
            },
          }),
    };
  };

  const toolsComingSoon = (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        px: 2,
        textAlign: 'center',
        borderRadius: 2,
        border: `1px dashed ${alpha(theme.palette.grey[500], 0.3)}`,
        bgcolor: alpha(theme.palette.grey[500], 0.04),
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Tools
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        Coming soon...
      </Typography>
    </Box>
  );

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: { xs: 6, md: 8 },
          px: 2,
        }}
      >
        <Box
          sx={{
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(8px)',
            borderRadius: { xs: 2, md: '50px' },
            p: 1,
            boxShadow: theme.customShadows.z24,
            border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {WORKFLOW_MAIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                aria-label={tab.label}
                onClick={() => handleTabChange(tab.id)}
                variant={isActive ? 'contained' : 'outlined'}
                startIcon={
                  <WorkflowMainTabIcon
                    imageSrc={tab.imageSrc}
                    iconifyIcon={tab.icon}
                    active={isActive}
                    width={{ xs: 20, sm: 24 }}
                  />
                }
                sx={getTabButtonSx(tab.id)}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>
      </Box>

      <Box>
        {/* Templates tab temporarily hidden */}
        {/* {activeTab === 'templates' && <Templates />} */}
        {activeTab === 'resources' && (
          <>
            <MyWorkflows />
            <Box sx={{ mt: { xs: 6, md: 8 } }}>
              <Skills />
            </Box>
          </>
        )}
        {activeTab === 'tools' && toolsComingSoon}
        {activeTab === 'newsletter' && <Newsletter />}
      </Box>
    </>
  );
}

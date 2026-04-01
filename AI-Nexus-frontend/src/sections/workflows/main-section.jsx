import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import { DashboardContent } from 'src/layouts/dashboard';

import { Templates } from './templates';
import { MyWorkflows } from './my-workflows';

// ----------------------------------------------------------------------

export function WorkflowMainSection() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromQuery = searchParams.get('tab');
  const resolveTab = (tab) => (tab === 'resources' || tab === 'workflows' ? 'resources' : 'templates');
  const initialTab = resolveTab(tabFromQuery);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const nextTab = resolveTab(tabFromQuery);
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [tabFromQuery, activeTab]);

  const handleTabChange = (nextTab) => {
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextTab);
    setSearchParams(nextParams);
  };

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
          <Button
            onClick={() => handleTabChange('templates')}
            variant={activeTab === 'templates' ? 'contained' : 'outlined'}
            sx={{
              flex: { xs: 1, sm: 'none' },
              px: { xs: 4, sm: 6 },
              py: 1.5,
              borderRadius: { xs: 2, sm: '50px' },
              fontWeight: 500,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              textTransform: 'none',
              ...(activeTab === 'templates'
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
            }}
          >
            Templates
          </Button>
          <Button
            onClick={() => handleTabChange('resources')}
            variant={activeTab === 'resources' ? 'contained' : 'outlined'}
            sx={{
              flex: { xs: 1, sm: 'none' },
              px: { xs: 4, sm: 6 },
              py: 1.5,
              borderRadius: { xs: 2, sm: '50px' },
              fontWeight: 500,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              textTransform: 'none',
              ...(activeTab === 'resources'
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
            }}
          >
            News
          </Button>
        </Box>
      </Box>

      <Box>
        {activeTab === 'templates' && <Templates />}
        {activeTab === 'resources' && <MyWorkflows />}
      </Box>
    </>
  );
}


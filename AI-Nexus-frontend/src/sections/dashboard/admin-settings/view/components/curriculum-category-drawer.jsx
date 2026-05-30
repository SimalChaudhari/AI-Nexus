import { useCallback, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { CurriculumCategoryPickerPanel } from './curriculum-category-picker-panel';

// ----------------------------------------------------------------------

export function CurriculumCategoryDrawer({
  open,
  onClose,
  initialCategory = null,
  selectedCategoryIds = [],
  selectedCourseIds = [],
  categoryCourseIdsMap = {},
  disabled = false,
  maxCategories = 20,
  onApply,
}) {
  const closeDrawer = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, closeDrawer]);

  const handleApply = (payload) => {
    onApply?.(payload);
    closeDrawer();
  };

  const title = initialCategory?.id ? 'Edit category courses' : 'Add category & courses';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={closeDrawer}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 520 },
          p: 0,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Stack sx={{ height: '100%', minHeight: 0 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 2.5,
            py: 2,
            flexShrink: 0,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" sx={HERO_TYPOGRAPHY.adminCardTitle}>
            {title}
          </Typography>
          <IconButton onClick={closeDrawer} aria-label="Close panel">
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>

        <Stack sx={{ flex: 1, overflow: 'hidden', p: 2.5, minHeight: 0, display: 'flex' }}>
          <CurriculumCategoryPickerPanel
            key={open ? initialCategory?.id || 'new' : 'closed'}
            initialCategory={initialCategory}
            selectedCategoryIds={selectedCategoryIds}
            selectedCourseIds={selectedCourseIds}
            categoryCourseIdsMap={categoryCourseIdsMap}
            disabled={disabled}
            enabled={open}
            maxCategories={maxCategories}
            onApply={handleApply}
            onClose={closeDrawer}
          />
        </Stack>
      </Stack>
    </Drawer>
  );
}

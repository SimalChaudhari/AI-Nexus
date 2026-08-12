import { useCallback, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';

import { varAlpha } from 'src/theme/styles';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

import { userService } from 'src/services/user.service';
import {
  USER_EXPORT_DEFAULT_FIELDS,
  USER_EXPORT_FIELDS,
  USER_PROGRESS_FILTER_OPTIONS,
} from './constants';

// ----------------------------------------------------------------------

const EXPORT_SCOPE_OPTIONS = [
  {
    value: 'all',
    label: 'All users',
    shortDescription: 'No progress filter — search/status only.',
    description: 'Download every user matching the current search and status tabs only.',
    icon: 'solar:users-group-rounded-bold',
    color: 'default',
  },
  ...USER_PROGRESS_FILTER_OPTIONS.filter((option) => option.value !== 'all').map((option) => ({
    value: option.value,
    label: option.label,
    shortDescription: option.shortDescription,
    description: option.description,
    icon: option.icon,
    color: option.color,
  })),
];

// ----------------------------------------------------------------------

export function UserExportDialog({ open, onClose, exportQuery }) {
  const [selectedFields, setSelectedFields] = useState(() => [...USER_EXPORT_DEFAULT_FIELDS]);
  const [progressFilter, setProgressFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const allKeys = useMemo(() => USER_EXPORT_FIELDS.map((field) => field.key), []);
  const allSelected = selectedFields.length === allKeys.length;

  const handleToggle = useCallback((key) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedFields((prev) => (prev.length === allKeys.length ? [] : [...allKeys]));
  }, [allKeys]);

  const handleExport = useCallback(async () => {
    if (!selectedFields.length) {
      toast.error('Select at least one field to download.');
      return;
    }

    setExporting(true);
    try {
      await userService.exportUsersCsv({
        search: exportQuery?.search,
        status: exportQuery?.status,
        progressFilter: progressFilter !== 'all' ? progressFilter : undefined,
        fields: selectedFields.join(','),
      });
      toast.success('Users CSV downloaded');
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to download users CSV');
    } finally {
      setExporting(false);
    }
  }, [exportQuery?.search, exportQuery?.status, onClose, progressFilter, selectedFields]);

  return (
    <Dialog open={open} onClose={exporting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>Download users</DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle2">1. Choose fields</Typography>
          <Stack direction="row" justifyContent="flex-end">
            <Button size="small" onClick={handleToggleAll}>
              {allSelected ? 'Clear all' : 'Select all'}
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 0,
              maxHeight: 220,
              overflowY: 'auto',
              pr: 0.5,
            }}
          >
            {USER_EXPORT_FIELDS.map((field) => (
              <FormControlLabel
                key={field.key}
                sx={{ mr: 0, my: 0 }}
                control={
                  <Checkbox
                    size="small"
                    checked={selectedFields.includes(field.key)}
                    onChange={() => handleToggle(field.key)}
                  />
                }
                label={<Typography variant="body2">{field.label}</Typography>}
              />
            ))}
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1}>
          <Typography variant="subtitle2">2. Choose who to include</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Hover an option for full details.
          </Typography>

          <RadioGroup
            value={progressFilter}
            onChange={(event) => setProgressFilter(event.target.value)}
          >
            <Stack spacing={0.75}>
              {EXPORT_SCOPE_OPTIONS.map((option) => {
                const selected = progressFilter === option.value;
                const color = option.color === 'default' ? 'primary' : option.color;

                return (
                  <Tooltip
                    key={option.value}
                    arrow
                    placement="left"
                    enterDelay={200}
                    title={
                      <Box sx={{ maxWidth: 240 }}>
                        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.45 }}>
                          {option.description}
                        </Typography>
                      </Box>
                    }
                  >
                    <Box
                      component="label"
                      sx={{
                        px: 1,
                        py: 0.75,
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: selected ? `${color}.main` : 'divider',
                        bgcolor: (theme) =>
                          selected
                            ? varAlpha(theme.vars.palette[color].mainChannel, 0.08)
                            : 'transparent',
                        '&:hover': {
                          borderColor: `${color}.main`,
                          bgcolor: (theme) =>
                            varAlpha(theme.vars.palette[color].mainChannel, 0.04),
                        },
                      }}
                    >
                      <Radio value={option.value} size="small" color={color} sx={{ p: 0.5 }} />
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          flexShrink: 0,
                          borderRadius: 0.75,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: `${color}.dark`,
                          bgcolor: (theme) =>
                            varAlpha(theme.vars.palette[color].mainChannel, 0.12),
                        }}
                      >
                        <Iconify icon={option.icon} width={16} />
                      </Box>
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                          {option.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.3 }}
                        >
                          {option.shortDescription}
                        </Typography>
                      </Box>
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </RadioGroup>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={exporting} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={exporting || !selectedFields.length}
          startIcon={
            exporting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Iconify icon="solar:download-bold" />
            )
          }
        >
          {exporting ? 'Downloading...' : 'Download CSV'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

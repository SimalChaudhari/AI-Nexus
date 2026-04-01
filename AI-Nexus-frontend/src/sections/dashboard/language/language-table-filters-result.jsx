import { Stack, Chip } from '@mui/material';

// ----------------------------------------------------------------------

const STATUS_LABELS = { all: 'All', active: 'Active', deleted: 'Deleted' };

export function LanguageTableFiltersResult({ filters, onResetPage, totalResults, sx, ...other }) {
  const handleRemoveName = () => {
    filters.setState({ name: '' });
    onResetPage();
  };

  const handleRemoveStatus = () => {
    filters.setState({ status: 'all' });
    onResetPage();
  };

  return (
    <Stack spacing={1.5} sx={{ p: 2 }} {...other}>
      <Stack flexGrow={1} spacing={1} direction="row" flexWrap="wrap" alignItems="center">
        {!!filters.state.name && (
          <Chip label={`Title: ${filters.state.name}`} size="small" onDelete={handleRemoveName} />
        )}
        {filters.state.status !== 'all' && (
          <Chip
            label={`Status: ${STATUS_LABELS[filters.state.status] || filters.state.status}`}
            size="small"
            onDelete={handleRemoveStatus}
          />
        )}
        <Chip label={`Total: ${totalResults} results`} size="small" variant="soft" color="primary" />
      </Stack>
    </Stack>
  );
}

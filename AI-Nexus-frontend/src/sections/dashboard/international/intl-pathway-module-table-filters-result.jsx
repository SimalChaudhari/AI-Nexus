import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

// ----------------------------------------------------------------------

const STATUS_LABELS = { all: 'All', active: 'Active', deleted: 'Deleted' };

export function IntlPathwayModuleTableFiltersResult({
  filters,
  onResetPage,
  totalResults,
  sx,
  ...other
}) {
  const handleRemoveName = () => {
    filters.setState({ name: '' });
    onResetPage();
  };

  const handleRemoveStatus = () => {
    filters.setState({ status: 'all' });
    onResetPage();
  };

  return (
    <Stack spacing={1.5} sx={{ p: 2, ...sx }} {...other}>
      <Stack flexGrow={1} spacing={1} direction="row" flexWrap="wrap" alignItems="center">
        {!!filters.state.name && (
          <Chip label={`Search: ${filters.state.name}`} size="small" onDelete={handleRemoveName} />
        )}
        {filters.state.status !== 'all' && (
          <Chip
            label={`Status: ${STATUS_LABELS[filters.state.status] || filters.state.status}`}
            size="small"
            onDelete={handleRemoveStatus}
          />
        )}
        <Chip label={`${totalResults} results`} size="small" variant="soft" color="primary" />
      </Stack>
    </Stack>
  );
}

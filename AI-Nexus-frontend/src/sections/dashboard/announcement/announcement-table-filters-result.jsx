import { Stack, Chip } from '@mui/material';

// ----------------------------------------------------------------------

export function AnnouncementTableFiltersResult({ filters, onResetPage, totalResults, sx, ...other }) {
  const handleRemoveStatus = () => {
    filters.setState({ name: '' });
    onResetPage();
  };

  return (
    <Stack spacing={1.5} sx={{ p: 2 }} {...other}>
      <Stack flexGrow={1} spacing={1} direction="row" flexWrap="wrap" alignItems="center">
        {!!filters.state.name && (
          <Chip
            label={`Name: ${filters.state.name}`}
            size="small"
            onDelete={handleRemoveStatus}
          />
        )}

        <Chip
          label={`Total: ${totalResults} results`}
          size="small"
          variant="soft"
          color="primary"
        />
      </Stack>
    </Stack>
  );
}

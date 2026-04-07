import { Stack, Chip } from '@mui/material';

// ----------------------------------------------------------------------

export function CourseTableFiltersResult({
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

  const handleRemoveLevel = () => {
    filters.setState({ level: '' });
    onResetPage();
  };

  const handleRemoveType = () => {
    filters.setState({ type: '' });
    onResetPage();
  };

  const handleClearAll = () => {
    filters.setState({
      name: '',
      level: '',
      type: '',
    });
    onResetPage();
  };

  return (
    <Stack spacing={1.5} sx={{ p: 2 }} {...other}>
      <Stack flexGrow={1} spacing={1} direction="row" flexWrap="wrap" alignItems="center">
        {!!filters.state.name && (
          <Chip label={`Name: ${filters.state.name}`} size="small" onDelete={handleRemoveName} />
        )}
        {!!filters.state.level && (
          <Chip
            label={`Level: ${filters.state.level}`}
            size="small"
            onDelete={handleRemoveLevel}
          />
        )}
        {!!filters.state.type && (
          <Chip
            label={`Type: ${filters.state.type === 'free' ? 'Free' : 'Paid'}`}
            size="small"
            onDelete={handleRemoveType}
          />
        )}
        <Chip
          label={`Total: ${totalResults} results`}
          size="small"
          variant="soft"
          color="primary"
        />

        <Chip
          label="Clear all"
          size="small"
          color="error"
          variant="soft"
          onClick={handleClearAll}
          onDelete={handleClearAll}
        />
      </Stack>
    </Stack>
  );
}


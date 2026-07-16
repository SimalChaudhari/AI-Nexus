import { useCallback } from 'react';
import Chip from '@mui/material/Chip';
import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

export function CourseTableFiltersResult({
  filters,
  onResetPage,
  totalResults,
  sx,
  ...other
}) {
  const handleRemoveName = useCallback(() => {
    onResetPage();
    filters.setState({ name: '' });
  }, [filters, onResetPage]);

  const handleRemoveLevel = useCallback(() => {
    onResetPage();
    filters.setState({ level: '' });
  }, [filters, onResetPage]);

  const handleRemoveType = useCallback(() => {
    onResetPage();
    filters.setState({ type: '' });
  }, [filters, onResetPage]);

  const handleReset = useCallback(() => {
    onResetPage();
    filters.setState({
      name: '',
      level: '',
      type: '',
    });
  }, [filters, onResetPage]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx} {...other}>
      <FiltersBlock label="Level:" isShow={!!filters.state.level}>
        <Chip {...chipProps} label={filters.state.level} onDelete={handleRemoveLevel} />
      </FiltersBlock>

      <FiltersBlock label="Type:" isShow={!!filters.state.type}>
        <Chip
          {...chipProps}
          label={filters.state.type === 'free' ? 'AI Fluency' : 'Paid'}
          onDelete={handleRemoveType}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!filters.state.name}>
        <Chip {...chipProps} label={filters.state.name} onDelete={handleRemoveName} />
      </FiltersBlock>
    </FiltersResult>
  );
}


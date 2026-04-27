import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

export function CourseCertificatesTableFiltersResult({
  filters,
  onResetPage,
  totalResults,
  sx,
}) {
  const handleRemoveKeyword = useCallback(() => {
    onResetPage();
    filters.setState({ search: '' });
  }, [filters, onResetPage]);

  const handleRemoveUserName = useCallback(() => {
    onResetPage();
    filters.setState({ userName: '' });
  }, [filters, onResetPage]);

  const handleRemoveCourseTitle = useCallback(() => {
    onResetPage();
    filters.setState({ courseTitle: '' });
  }, [filters, onResetPage]);

  const handleReset = useCallback(() => {
    onResetPage();
    filters.setState({ search: '', userName: '', courseTitle: '' });
  }, [filters, onResetPage]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Keyword:" isShow={!!filters.state.search}>
        <Chip {...chipProps} label={filters.state.search} onDelete={handleRemoveKeyword} />
      </FiltersBlock>

      <FiltersBlock label="User:" isShow={!!filters.state.userName}>
        <Chip {...chipProps} label={filters.state.userName} onDelete={handleRemoveUserName} />
      </FiltersBlock>

      <FiltersBlock label="Course:" isShow={!!filters.state.courseTitle}>
        <Chip {...chipProps} label={filters.state.courseTitle} onDelete={handleRemoveCourseTitle} />
      </FiltersBlock>
    </FiltersResult>
  );
}

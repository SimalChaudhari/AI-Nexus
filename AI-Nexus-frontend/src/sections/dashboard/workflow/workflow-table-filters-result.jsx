import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

export function WorkflowTableFiltersResult({ filters, labels = [], tags = [], onResetPage, totalResults, sx }) {
  const handleRemoveKeyword = useCallback(() => {
    onResetPage();
    filters.setState({ name: '' });
  }, [filters, onResetPage]);

  const handleRemoveLabel = useCallback(
    (inputValue) => {
      const newValue = filters.state.labelIds?.filter((item) => item !== inputValue) || [];

      onResetPage();
      filters.setState({ labelIds: newValue });
    },
    [filters, onResetPage]
  );

  const handleRemoveTag = useCallback(
    (inputValue) => {
      const newValue = filters.state.tagIds?.filter((item) => item !== inputValue) || [];

      onResetPage();
      filters.setState({ tagIds: newValue });
    },
    [filters, onResetPage]
  );

  const handleReset = useCallback(() => {
    onResetPage();
    filters.onResetState();
  }, [filters, onResetPage]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Labels:" isShow={!!(filters.state.labelIds && filters.state.labelIds.length)}>
        {filters.state.labelIds?.map((labelId) => {
          const label = labels.find((l) => l.id === labelId);
          return (
            <Chip
              {...chipProps}
              key={labelId}
              label={label?.title || label?.name || labelId}
              onDelete={() => handleRemoveLabel(labelId)}
            />
          );
        })}
      </FiltersBlock>

      <FiltersBlock label="Tags:" isShow={!!(filters.state.tagIds && filters.state.tagIds.length)}>
        {filters.state.tagIds?.map((tagId) => {
          const tag = tags.find((t) => t.id === tagId);
          return (
            <Chip
              {...chipProps}
              key={tagId}
              label={tag?.title || tagId}
              onDelete={() => handleRemoveTag(tagId)}
            />
          );
        })}
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!filters.state.name}>
        <Chip {...chipProps} label={filters.state.name} onDelete={handleRemoveKeyword} />
      </FiltersBlock>
    </FiltersResult>
  );
}


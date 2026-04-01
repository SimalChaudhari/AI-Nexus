const hasValue = (value) => {
  if (typeof value === 'boolean') return true;
  return value !== undefined && value !== null && value !== '';
};

export function buildPaginationParams(params = {}) {
  return Object.entries(params).reduce((accumulator, [key, value]) => {
    if (hasValue(value)) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
}

export function hasPaginationParams(params = {}) {
  return Object.keys(buildPaginationParams(params)).length > 0;
}

export function mapPaginatedResponse(responseData, transformItem, params = {}) {
  const rawItems = responseData?.data || responseData || [];
  const pagination = responseData?.pagination || {};
  const transformedItems = rawItems.map(transformItem);

  if (!hasPaginationParams(params)) {
    return transformedItems;
  }

  return {
    data: transformedItems,
    pagination: {
      page: pagination.page || params.page || 1,
      limit: pagination.limit || params.limit || transformedItems.length || 0,
      totalItems: pagination.totalItems || 0,
      totalPages: pagination.totalPages || 0,
      hasNextPage: pagination.hasNextPage || false,
      hasPreviousPage: pagination.hasPreviousPage || false,
      search: pagination.search ?? null,
      isPinned: pagination.isPinned ?? null,
    },
  };
}

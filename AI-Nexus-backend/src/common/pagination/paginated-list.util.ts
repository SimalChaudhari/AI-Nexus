import { In, ObjectLiteral, Repository } from 'typeorm';

export type PaginatedQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
  isPinned?: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    search: string | null;
    isPinned: boolean | null;
  };
};

type NormalizedPaginatedQuery = {
  page: number;
  limit: number;
  search: string;
  hasSearch: boolean;
  isPinned?: boolean;
};

type GetPaginatedPinnedListOptions<TEntity extends ObjectLiteral, TItem extends { id: string }> = {
  userId?: string;
  queryOptions?: PaginatedQueryOptions;
  repository: Repository<TEntity>;
  entityAlias: string;
  searchColumns: string[];
  pinnedJoinTable: string;
  pinnedJoinAlias: string;
  pinnedEntityIdColumn: string;
  relations: string[];
  enrichEntities: (entities: TEntity[], userId?: string) => Promise<TItem[]>;
  loadPinnedIds: (entityIds: string[], userId: string) => Promise<Set<string>>;
  orderByColumn?: string;
  /** @default 'DESC' */
  orderByDirection?: 'ASC' | 'DESC';
  /** Use LOWER(column) for case-insensitive alphabetical sort (string columns only). */
  orderByCaseInsensitive?: boolean;
};

export function parsePositiveInteger(value: string | undefined, defaultValue: number): number {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return defaultValue;
  }
  return parsedValue;
}

export function parseBooleanQuery(value: string | undefined): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === 'true') {
    return true;
  }
  if (normalizedValue === 'false') {
    return false;
  }

  return undefined;
}

export function normalizePaginatedQuery(
  options: PaginatedQueryOptions = {},
  defaultLimit = 10,
  maxLimit = 100,
): NormalizedPaginatedQuery {
  const page = options.page && Number.isInteger(options.page) && options.page > 0 ? options.page : 1;
  const rawLimit =
    options.limit && Number.isInteger(options.limit) && options.limit > 0 ? options.limit : defaultLimit;

  return {
    page,
    limit: Math.min(rawLimit, maxLimit),
    search: options.search?.trim() || '',
    hasSearch: Boolean(options.search?.trim()),
    isPinned: options.isPinned,
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number,
  search: string | null,
  isPinned: boolean | undefined,
): PaginatedResponse<T> {
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;

  return {
    data,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && totalPages > 0,
      search,
      isPinned: isPinned ?? null,
    },
  };
}

export async function getPaginatedPinnedList<
  TEntity extends ObjectLiteral & { id: string },
  TItem extends { id: string },
>(
  options: GetPaginatedPinnedListOptions<TEntity, TItem>,
): Promise<PaginatedResponse<TItem & { isPinned: boolean }>> {
  const {
    userId,
    queryOptions = {},
    repository,
    entityAlias,
    searchColumns,
    pinnedJoinTable,
    pinnedJoinAlias,
    pinnedEntityIdColumn,
    relations,
    enrichEntities,
    loadPinnedIds,
    orderByColumn = 'createdAt',
    orderByDirection = 'DESC',
    orderByCaseInsensitive = false,
  } = options;

  const normalizedQuery = normalizePaginatedQuery(queryOptions);
  const { page, limit, search, hasSearch, isPinned } = normalizedQuery;

  if (!userId && isPinned === true) {
    return buildPaginatedResponse([], page, limit, 0, hasSearch ? search : null, isPinned);
  }

  const baseQuery = repository.createQueryBuilder(entityAlias);

  if (hasSearch) {
    const searchCondition = searchColumns
      .map((column) => `${entityAlias}.${column} ILIKE :search`)
      .join(' OR ');

    baseQuery.andWhere(`(${searchCondition})`, {
      search: `%${search}%`,
    });
  }

  if (userId) {
    baseQuery.leftJoin(
      pinnedJoinTable,
      pinnedJoinAlias,
      `${pinnedJoinAlias}.${pinnedEntityIdColumn} = ${entityAlias}.id AND ${pinnedJoinAlias}.userId = :userId`,
      { userId },
    );
  }

  if (isPinned === true) {
    baseQuery.andWhere(`${pinnedJoinAlias}.id IS NOT NULL`);
  } else if (isPinned === false && userId) {
    baseQuery.andWhere(`${pinnedJoinAlias}.id IS NULL`);
  }

  const totalItems = await baseQuery.clone().getCount();
  const orderExpr = orderByCaseInsensitive
    ? `LOWER(${entityAlias}.${orderByColumn})`
    : `${entityAlias}.${orderByColumn}`;

  const entityIdRows = await baseQuery
    .clone()
    .select(`${entityAlias}.id`, 'id')
    .orderBy(orderExpr, orderByDirection)
    .skip((page - 1) * limit)
    .take(limit)
    .getRawMany<{ id: string }>();

  const entityIds = entityIdRows.map((entity) => entity.id);
  if (entityIds.length === 0) {
    return buildPaginatedResponse([], page, limit, totalItems, hasSearch ? search : null, isPinned);
  }

  const entities = await repository.find({
    where: { id: In(entityIds) } as any,
    relations: relations as any,
  });

  const entityOrderMap = new Map(entityIds.map((id, index) => [id, index]));
  entities.sort(
    (firstEntity, secondEntity) =>
      (entityOrderMap.get(firstEntity.id) ?? 0) - (entityOrderMap.get(secondEntity.id) ?? 0),
  );

  const enrichedEntities = await enrichEntities(entities, userId);
  const pinnedIds = userId ? await loadPinnedIds(entityIds, userId) : new Set<string>();

  const data = enrichedEntities.map((entity) => ({
    ...entity,
    isPinned: userId ? pinnedIds.has(entity.id) : false,
  }));

  return buildPaginatedResponse(data, page, limit, totalItems, hasSearch ? search : null, isPinned);
}

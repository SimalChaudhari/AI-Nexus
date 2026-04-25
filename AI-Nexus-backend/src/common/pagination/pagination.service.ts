import { Injectable } from '@nestjs/common';
import { In, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

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

export type PaginatedResultWithMeta<T, TMeta extends Record<string, unknown> = {}> = {
  data: T[];
  pagination: PaginatedResponse<T>['pagination'] & TMeta;
};

export type NormalizedPaginatedQuery = {
  page: number;
  limit: number;
  search: string;
  hasSearch: boolean;
  isPinned?: boolean;
};

export type PaginateQueryBuilderOptions<TEntity extends ObjectLiteral, TResult = TEntity> = {
  queryBuilder: SelectQueryBuilder<TEntity>;
  page: number;
  limit: number;
  search?: string | null;
  isPinned?: boolean;
  mapItem?: (entity: TEntity) => TResult;
};

export type GetPaginatedPinnedListOptions<TEntity extends ObjectLiteral, TItem extends { id: string }> = {
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
  orderByDirection?: 'ASC' | 'DESC';
  orderByCaseInsensitive?: boolean;
  prioritizePinnedInAllResults?: boolean;
};

@Injectable()
export class PaginationService {
  parsePositiveInteger(value: string | undefined, defaultValue: number): number {
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return defaultValue;
    }
    return parsedValue;
  }

  parseBooleanQuery(value: string | undefined): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === 'true') return true;
    if (normalizedValue === 'false') return false;
    return undefined;
  }

  parseEnumQuery<TEnum extends Record<string, string>>(
    value: string | undefined,
    enumObject: TEnum,
  ): TEnum[keyof TEnum] | undefined {
    if (!value) return undefined;
    const normalizedValue = value.trim().toLowerCase();
    const enumValues = Object.values(enumObject) as string[];
    return enumValues.find((enumValue) => enumValue.toLowerCase() === normalizedValue) as
      | TEnum[keyof TEnum]
      | undefined;
  }

  normalizePaginatedQuery(
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

  buildPaginatedResponse<T>(
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

  async paginateQueryBuilder<TEntity extends ObjectLiteral, TResult = TEntity>(
    options: PaginateQueryBuilderOptions<TEntity, TResult>,
  ): Promise<PaginatedResponse<TResult>> {
    const { queryBuilder, page, limit, search, isPinned, mapItem } = options;
    const totalItems = await queryBuilder.clone().getCount();
    const rows = await queryBuilder.skip((page - 1) * limit).take(limit).getMany();
    const data = mapItem ? rows.map(mapItem) : (rows as unknown as TResult[]);

    return this.buildPaginatedResponse(
      data,
      page,
      limit,
      totalItems,
      search ? search.trim() || null : null,
      isPinned,
    );
  }

  async getPaginatedPinnedList<TEntity extends ObjectLiteral & { id: string }, TItem extends { id: string }>(
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
      prioritizePinnedInAllResults = false,
    } = options;

    const normalizedQuery = this.normalizePaginatedQuery(queryOptions);
    const { page, limit, search, hasSearch, isPinned } = normalizedQuery;

    if (!userId && isPinned === true) {
      return this.buildPaginatedResponse([], page, limit, 0, hasSearch ? search : null, isPinned);
    }

    const baseQuery = repository.createQueryBuilder(entityAlias);
    if (hasSearch) {
      const searchCondition = searchColumns.map((column) => `${entityAlias}.${column} ILIKE :search`).join(' OR ');
      baseQuery.andWhere(`(${searchCondition})`, { search: `%${search}%` });
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

    const pagedQuery = baseQuery.clone().select(`${entityAlias}.id`, 'id');

    // For personalized lists, optionally show current user's pinned items first in the combined view.
    if (prioritizePinnedInAllResults && userId && isPinned === undefined) {
      pagedQuery.orderBy(`CASE WHEN ${pinnedJoinAlias}.id IS NULL THEN 1 ELSE 0 END`, 'ASC');
      pagedQuery.addOrderBy(orderExpr, orderByDirection);
    } else {
      pagedQuery.orderBy(orderExpr, orderByDirection);
    }

    const entityIdRows = await pagedQuery
      .skip((page - 1) * limit)
      .take(limit)
      .getRawMany<{ id: string }>();

    const entityIds = entityIdRows.map((entity) => entity.id);
    if (entityIds.length === 0) {
      return this.buildPaginatedResponse([], page, limit, totalItems, hasSearch ? search : null, isPinned);
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

    return this.buildPaginatedResponse(data, page, limit, totalItems, hasSearch ? search : null, isPinned);
  }
}

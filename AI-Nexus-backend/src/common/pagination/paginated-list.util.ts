import { ObjectLiteral } from 'typeorm';
import {
  GetPaginatedPinnedListOptions,
  PaginatedQueryOptions,
  PaginatedResponse,
  PaginateQueryBuilderOptions,
  PaginationService,
} from './pagination.service';

const paginationService = new PaginationService();

export type { PaginatedQueryOptions, PaginatedResponse, GetPaginatedPinnedListOptions };

// Backward-compatible wrappers. Prefer injecting PaginationService in new code.
export function parsePositiveInteger(value: string | undefined, defaultValue: number): number {
  return paginationService.parsePositiveInteger(value, defaultValue);
}

export function parseBooleanQuery(value: string | undefined): boolean | undefined {
  return paginationService.parseBooleanQuery(value);
}

export function parseEnumQuery<TEnum extends Record<string, string>>(
  value: string | undefined,
  enumObject: TEnum,
): TEnum[keyof TEnum] | undefined {
  return paginationService.parseEnumQuery(value, enumObject);
}

export function normalizePaginatedQuery(
  options: PaginatedQueryOptions = {},
  defaultLimit = 10,
  maxLimit = 100,
) {
  return paginationService.normalizePaginatedQuery(options, defaultLimit, maxLimit);
}

export function buildPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number,
  search: string | null,
  isPinned: boolean | undefined,
): PaginatedResponse<T> {
  return paginationService.buildPaginatedResponse(data, page, limit, totalItems, search, isPinned);
}

export async function paginateQueryBuilder<TEntity extends ObjectLiteral, TResult = TEntity>(
  options: PaginateQueryBuilderOptions<TEntity, TResult>,
): Promise<PaginatedResponse<TResult>> {
  return paginationService.paginateQueryBuilder(options);
}

export async function getPaginatedPinnedList<
  TEntity extends ObjectLiteral & { id: string },
  TItem extends { id: string },
>(
  options: GetPaginatedPinnedListOptions<TEntity, TItem>,
): Promise<PaginatedResponse<TItem & { isPinned: boolean }>> {
  return paginationService.getPaginatedPinnedList(options);
}

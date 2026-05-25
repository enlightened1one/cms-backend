import {
  PaginatedResult,
  PaginationMeta,
  PaginationOptions,
} from '../interfaces/pagination.interface';

/**
 * Builds the Prisma skip/take parameters from page and limit.
 */
export function buildPaginationParams(options: PaginationOptions): {
  skip: number;
  take: number;
} {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Wraps a data array and total count into a standardised paginated response.
 */
export function paginate<T>(
  data: T[],
  total: number,
  options: PaginationOptions,
): PaginatedResult<T> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const totalPages = Math.ceil(total / limit);

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  return { data, meta };
}

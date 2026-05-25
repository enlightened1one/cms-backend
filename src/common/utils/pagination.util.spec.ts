import { buildPaginationParams, paginate } from './pagination.util';

describe('PaginationUtil', () => {
  describe('buildPaginationParams', () => {
    it('returns correct skip and take for page 1', () => {
      expect(buildPaginationParams({ page: 1, limit: 10 })).toEqual({ skip: 0, take: 10 });
    });

    it('returns correct skip for page 3', () => {
      expect(buildPaginationParams({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
    });

    it('clamps limit to 100 max', () => {
      const result = buildPaginationParams({ page: 1, limit: 999 });
      expect(result.take).toBe(100);
    });

    it('defaults page to 1 when 0 is passed', () => {
      const result = buildPaginationParams({ page: 0, limit: 10 });
      expect(result.skip).toBe(0);
    });
  });

  describe('paginate', () => {
    it('builds correct meta for page 2 of 25 total with limit 10', () => {
      const result = paginate(['a', 'b', 'c'], 25, { page: 2, limit: 10 });
      expect(result.meta).toMatchObject({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('correctly reports no next page on last page', () => {
      const result = paginate([], 5, { page: 1, limit: 10 });
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);
    });
  });
});

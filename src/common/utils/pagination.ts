export interface PaginationParams {
  skip?: number;
  take?: number;
}

export interface NormalizedPagination {
  skip: number;
  take: number;
}

export function normalizePagination({
  skip = 0,
  take = 10,
}: PaginationParams): NormalizedPagination {
  return {
    skip: Math.max(skip, 0),
    take: Math.min(Math.max(take, 1), 100),
  };
}

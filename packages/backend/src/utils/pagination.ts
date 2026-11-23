export function readPagination(params: URLSearchParams, defaultPageSize: number) {
  const page = Number(params.get('page'))
  const pageSize = Number(params.get('pageSize'))
  return {
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
    pageSize: Number.isSafeInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : defaultPageSize,
  }
}

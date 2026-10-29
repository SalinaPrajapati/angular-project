
export function pageWindow(
  current: number,
  totalPages: number,
  size = 5,
): number[] {
  const count = Math.min(size, totalPages);
  const start = Math.min(
    Math.max(current - Math.floor(count / 2), 1),
    totalPages - count + 1,
  );
  return Array.from({ length: Math.max(count, 0) }, (_, i) => start + i);
}

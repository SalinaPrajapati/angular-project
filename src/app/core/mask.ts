/** Hides all but the last four characters, e.g. "123456789" -> "•••••6789". */
export function maskValue(value: string): string {
  return value.length <= 4 ? '••••' : '•'.repeat(Math.min(value.length - 4, 8)) + value.slice(-4);
}

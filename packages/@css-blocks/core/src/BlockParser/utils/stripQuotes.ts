/**
 * Strip matching quotes from the beginning and end of a string
 * @param str String to strip quotes from
 * @return Result
 */
export function stripQuotes(str: string): string {
  return str.replace(/^(["']?)(.+)\1$/, "$2");
}

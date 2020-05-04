import * as path from "path";
import * as url from "url";

/**
 * A regular expression that can be used to test for the header comment in a compiled CSS file.
 */
export const REGEXP_COMMENT_HEADER = /\/\*#css-blocks (?!end)([A-Za-z0-9-]+)\*\//m;

/**
 * A regular expression that can be used to test for the definition URL in a compiled CSS file.
 */
export const REGEXP_COMMENT_DEFINITION_REF = /\/\*#blockDefinitionURL=([\S]+?)\*\//m;

/**
 * A regular expression that can be used to test for the footer comment in a compiled CSS file.
 */
export const REGEXP_COMMENT_FOOTER = /\/\*#css-blocks end\*\//m;

/**
 * Determines if the given URL for a definition is valid.
 *
 * The following are valid:
 * - Path relative to the current file on the filesystem.
 * - Embedded base64 data.
 *
 * The following are invalid:
 * - Absolute paths.
 * - URLs with a protocol other than data.
 *
 * @param urlOrPath - The definition URL to check.
 * @returns True if valid given the above rules, false otherwise.
 */
export function isDefinitionUrlValid(urlOrPath: string): boolean {
  // Try to parse as a URL first.
  const parsedUrl = url.parse(urlOrPath);
  if (parsedUrl.protocol) {
    return parsedUrl.protocol === "data:";
  }

  // If we can't parse as a URL with a protocol, it's a path.
  return !path.isAbsolute(urlOrPath);
}

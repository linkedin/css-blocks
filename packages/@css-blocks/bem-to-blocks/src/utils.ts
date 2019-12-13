import { BemObject } from "./interface";

// regex that matches block__element--modifier pattern
export const R_BEM_REGEX = /^.(?:((?:[a-z0-9]+-)*[a-z0-9]+)(__(?:[a-z0-9]+-)*[a-z0-9]+)?(--(?:[a-z0-9]+-)*[a-z0-9]+)?)$/;
// regex that matches block--modifier__element pattern
export const R_BME_REGEX = /^.(?:((?:[a-z0-9]+-)*[a-z0-9]+)(--(?:[a-z0-9]+-)*[a-z0-9]+)?(__(?:[a-z0-9]+-)*[a-z0-9]+)?)$/;

/**
 * function to find the LCS (longest common substring) from a string array
 */
export function findLcs(arr1: string[]): string {
  const arr = arr1.concat().sort();
  const a1 = arr[0];
  const a2 = arr[arr.length - 1];
  const L = a1.length;
  let i = 0;
  while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}

/**
 * Given a selector string, parses out the block, element, and modifier
 * @param selector - the selector to parse
 * @returns null if selector does not match BEM pattern, else returns an
 *                          an object containing block, element, and modifier strings.
 */
export function parseBemSelector(selector: string): BemObject | null {
  if (R_BEM_REGEX.test(selector)) {
    const [, block, element, modifier] = R_BEM_REGEX.exec(selector) || [undefined, undefined, undefined, undefined];
    if (block || element || modifier) {
      return { block, element, modifier };
    }
  } else if (R_BME_REGEX.test(selector)) {
    const [, block, modifier, element] = R_BME_REGEX.exec(selector) || [undefined, undefined, undefined, undefined];
    if (block || element || modifier) {
      return { block, element, modifier };
    }
  }
  return null;
}

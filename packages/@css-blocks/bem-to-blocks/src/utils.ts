import { BemObject } from "./interface";

// regex that matches block__element--modifier pattern
export const R_BEM_REGEX = /^.(?:((?:[a-z0-9]+-)*[a-z0-9]+)(__(?:[a-z0-9]+-)*[a-z0-9]+)?(--(?:[a-z0-9]+-)*[a-z0-9]+)?)$/;
// regex that matches block--modifier__element pattern
export const R_BME_REGEX = /^.(?:((?:[a-z0-9]+-)*[a-z0-9]+)(--(?:[a-z0-9]+-)*[a-z0-9]+)?(__(?:[a-z0-9]+-)*[a-z0-9]+)?)$/;

/**
 * function to find the LCS (longest common substring) from a string array
 *
 */
export function findLcsMap(arr: string[]): {[key: string]: string} {
  // we split the string assuming BEM conventions of "-" and then group by the
  // first item in each string
  let wordMap: {[key: string]: string[]} = {};
  // since we're assuming BEM, we can assume that the separators on the
  // modifiers are '-'
  let splitArr = arr.map(item => item.split("-"));
  splitArr.forEach(word => {
    // Here, we key on the first item in the split array. Ideally, we should
    // find the longest common separators between all the items and prompt the
    // user for input
    if (wordMap[word[0]]) {
      wordMap[word[0]].push(word.join("-"));
    } else {
      wordMap[word[0]] = new Array(word.join("-"));
    }
  });
  // return only those values who have a count of greater than 1
  let reducedWordMap = {};
  for (let [key, value] of Object.entries(wordMap)) {
    if (value.length > 1) {
      value.forEach(item => {
        // create a reverser mapping of the string to the key
        reducedWordMap[item] = key;
      });
    }
  }
  return reducedWordMap;
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

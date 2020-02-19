/**
 * This behaves like Promise.all() but it doesn't resolve or reject until
 * all the work is done.
 *
 * Note: if multiple promises reject, the error returned is based on the order
 * of the promises passed in (the reason from promise with the lowest index is
 * returned).
 * @template T What each promise returns.
 * @param promises The promises to wait for.
 * @returns An array of results or rejects with the first error that it encounters.
 */
export async function allDone<T>(promises: Array<Promise<T>>): Promise<Array<T>> {
  let results = new Array<T>();
  let firstError = null;
  for (let p of promises) {
    try {
      results.push(await p);
    } catch (e) {
      if (!firstError) firstError = e;
    }
  }
  if (firstError) {
    throw firstError;
  } else {
    return results;
  }
}

import * as crypto from "crypto";
import * as debugGenerator from "debug";
import * as process from "process";

const DEBUG = debugGenerator("css-blocks:caching");

/**
 * Generates a unique identifier from a given input identifier.
 * This generated identifier hash will remain consistent for the tuple
 * (identifier, machine, user).
 *
 * @param  identifier Input Block identifier.
 * @param  significantChars Number of characters from the start of the hash to use.
 * @returns A GUID hash for the given Block identifier, sliced to the number of
 *          significant characters given.
 */
export function gen_guid(identifier: string, signifcantChars: number): string {
  let hash = crypto.createHash("md5")
    .update(process.getuid().toString())
    .update(identifier)
    .digest("hex")
    .slice(0, signifcantChars);
  DEBUG("guid is %s for %s", hash, identifier);
  return hash;
}

import { postcss } from "opticss";

import { Block } from "../BlockTree";
import * as errors from "../errors";
import { sourceRange } from "../SourceLocation";

export type DebugChannel = "comment" | "stderr" | "stdout";

export function parseBlockDebug(atRule: postcss.AtRule, sourceFile: string, scope: Block): { block: Block; channel: DebugChannel } {

  let md = atRule.params.match(/([^\s]+) to (comment|stderr|stdout)/);

  if (!md) {
    throw new errors.InvalidBlockSyntax(
      `Malformed block debug: \`@block-debug ${atRule.params}\``,
      sourceRange(sourceFile, atRule));
  }

  let localName = md[1];
  let channel = <DebugChannel>md[2];
  let block: Block | null = scope.getReferencedBlock(localName);

  if (!block && (localName === "self" || localName === scope.name)) {
    block = scope;
  }

  if (!block) {
    throw new errors.InvalidBlockSyntax(
      `Invalid block debug: No Block named "${localName}" found in scope.`,
      sourceRange(sourceFile, atRule));
  }

  return { block, channel };
}

import {
  AtRule
} from "postcss";
import {
  Block
} from "./Block";
import {
  sourceLocation,
} from "./util/SourceLocation";
import * as errors from "./errors";

export type DebugChannel = 'comment' | 'stderr' | 'stdout';
export default function parseBlockDebug(atRule: AtRule, sourceFile: string, block: Block): { block: Block, channel: DebugChannel } {
  let md = atRule.params.match(/([^\s]+) to (comment|stderr|stdout)/);
  if (!md) {
    throw new errors.InvalidBlockSyntax(
      `Malformed block debug: \`@block-debug ${atRule.params}\``,
      sourceLocation(sourceFile, atRule));
  }
  let localName = md[1];
  let outputTo = <DebugChannel>md[2];
  let ref: Block | null = block.getReferencedBlock(localName);
  if (!ref && (localName === "self" || localName === block.name)) {
    ref = block;
  }
  if (!ref) {
    throw new errors.InvalidBlockSyntax(
      `No block named ${localName} exists in this context.`,
      sourceLocation(sourceFile, atRule));
  }
  return {
    block: ref,
    channel: outputTo
  };
}

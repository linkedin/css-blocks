import { postcss } from "opticss";

import { EXTENDS } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";

/**
 * For each `extends` property found in the passed ruleset, set the block's base
 * to the foreign block. If block is not found, throw.
 * @param block  Block object being processed.
 * @param sourceFile  Source file name, used for error output.
 * @param rule Ruleset to crawl.
 */
export async function extendBlock(rule: postcss.Root, block: Block, sourceFile: string) {
  rule.walkDecls(EXTENDS, (decl) => {
    if (block.base) {
      throw new errors.InvalidBlockSyntax(`A block can only be extended once.`, sourceRange(sourceFile, decl));
    }
    let baseBlock = block.getReferencedBlock(decl.value);
    if (!baseBlock) {
      throw new errors.InvalidBlockSyntax(`No Block named "${decl.value}" found in scope.`, sourceRange(sourceFile, decl));
    }
    block.setBase(baseBlock);
  });
}

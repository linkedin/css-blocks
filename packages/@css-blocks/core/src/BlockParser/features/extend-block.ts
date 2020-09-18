import { postcss } from "opticss";

import { EXTENDS } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";

/**
 * For each `extends` property found in the passed ruleset, set the block's base
 * to the foreign block. If block is not found, throw.
 * @param block  Block object being processed.
 * @param sourceFile  Source file name, used for error output.
 * @param root Ruleset to crawl.
 */
export function extendBlock(configuration: Configuration, root: postcss.Root, block: Block, sourceFile: string): void {
  root.walkDecls(EXTENDS, (decl) => {
    if (block.base) {
      block.addError(new errors.InvalidBlockSyntax(`A block can only be extended once.`, sourceRange(configuration, root, sourceFile, decl)));
    }
    let baseBlock = block.getReferencedBlock(decl.value);
    if (!baseBlock) {
      block.addError(new errors.InvalidBlockSyntax(`No Block named "${decl.value}" found in scope.`, sourceRange(configuration, root, sourceFile, decl)));
    } else {
      block.setBase(baseBlock);
    }
  });
}

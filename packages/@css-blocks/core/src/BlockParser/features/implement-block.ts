import { postcss } from "opticss";

import { IMPLEMENTS } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";

/**
 * For each `implements` property found in the passed ruleset, track the foreign
 * block. If block is not found, throw.
 * @param block  Block object being processed
 * @param sourceFile  Source file name, used for error output.
 * @param rule Ruleset to crawl
 */
export function implementBlock(configuration: Configuration, rule: postcss.Root, block: Block, sourceFile: string): void {
  rule.walkDecls(IMPLEMENTS, (decl) => {
    let refNames = decl.value.split(/,\s*/);
    refNames.forEach((refName) => {
      let refBlock = block.getReferencedBlock(refName);
      if (!refBlock) {
        block.addError(new errors.InvalidBlockSyntax(`No Block named "${refName}" found in scope.`, sourceRange(configuration, block.stylesheet, sourceFile, decl)));
      } else {
        block.addImplementation(refBlock);
      }
    });
  });

  // Validate that all rules from external block this block implements are...implemented
  block.checkImplementations();
}

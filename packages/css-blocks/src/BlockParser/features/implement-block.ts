import * as postcss from 'postcss';
import * as errors from '../../errors';
import { sourceLocation } from "../../SourceLocation";
import { Block } from "../../Block";
import { IMPLEMENTS } from "../../BlockSyntax";

/**
 * For each `implements` property found in the passed ruleset, track the foreign
 * block. If block is not found, throw.
 * @param block  Block object being processed
 * @param sourceFile  Source file name, used for error output.
 * @param rule Ruleset to crawl
 */
export default async function implementsBlock(rule: postcss.Root, block: Block, sourceFile: string) {
  rule.walkDecls(IMPLEMENTS, (decl) => {
    let refNames = decl.value.split(/,\s*/);
    refNames.forEach((refName) => {
      let refBlock = block.getReferencedBlock(refName);
      if (!refBlock) {
        throw new errors.InvalidBlockSyntax(`No block named ${refName} found`, sourceLocation(sourceFile, decl));
      }
      block.addImplementation(refBlock);
    });
  });

  // Validate that all rules from external block this block impelemnets are...implemented
  block.checkImplementations();
}
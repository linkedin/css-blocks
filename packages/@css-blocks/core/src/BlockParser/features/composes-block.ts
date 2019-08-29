import { postcss } from "opticss";
import { isRule } from "opticss/dist/src/util/cssIntrospection";

import { COMPOSES } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";
import { getStyleTargets } from "../block-intermediates";
import { stripQuotes } from "../utils";

/**
 * For each `composes` property found in the passed ruleset, track the foreign
 * block. If block is not found, throw.
 * @param block  Block object being processed
 * @param sourceFile  Source file name, used for error output.
 * @param rule Ruleset to crawl
 */
export async function composeBlock(root: postcss.Root, block: Block, sourceFile: string) {
  root.walkDecls(COMPOSES, (decl) => {
    if (!isRule(decl.parent)) { throw new errors.InvalidBlockSyntax(`The "composes" property may only be used in a rule set.`, sourceRange(sourceFile, decl)); }
    let rule = decl.parent;

    // TODO: Move to Block Syntax as parseBlockRefList().
    let refNames = decl.value.split(/,\s*/).map(stripQuotes);
    for (let refName of refNames) {
      let refStyle = block.lookup(refName);
      if (!refStyle) {
        throw new errors.InvalidBlockSyntax(`No style "${refName}" found.`, sourceRange(sourceFile, decl));
      }
      if (refStyle.block === block) {
        throw new errors.InvalidBlockSyntax(`Styles from the same Block may not be composed together.`, sourceRange(sourceFile, decl));
      }

      const parsedSel = block.getParsedSelectors(rule);
      for (let sel of parsedSel) {
        if (sel.selector.next) {
          throw new errors.InvalidBlockSyntax(`Style composition is not allowed in rule sets with a scope selector.`, sourceRange(sourceFile, decl));
        }
        let foundStyles = getStyleTargets(block, sel.selector);
        for (let blockClass of foundStyles.blockClasses) {
          blockClass.addComposedStyle(refStyle, foundStyles.blockAttrs);
        }
      }
    }
    decl.remove();
  });
}

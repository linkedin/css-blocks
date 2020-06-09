import { postcss } from "opticss";

import { Block } from "../../BlockTree";
import { Configuration } from "../../configuration";
import { CssBlockError } from "../../errors";
import { sourceRange } from "../../SourceLocation";
import { getStyleTargets } from "../block-intermediates";
import { stripQuotes } from "../utils";

/**
 * Traverse a definition file's rules and define a preset block-class for each
 * rule present. This ensures the block uses the same CSS class as defined in
 * the linked Compiled CSS file associated with this definition file.
 *
 * If a given rule does not have a block-class declared, an error is added to
 * the block for the user to correct.
 *
 * This should only be run on definition files! Standard block files aren't
 * allowed to define block-class rules.
 *
 * @param configuration - The current CSS Blocks configuration.
 * @param root - The root of the AST that this block was generated from.
 * @param block - The block that's being generated.
 * @param file - The definition file this block was generated from.
 */
export function addInterfaceIndexes(configuration: Configuration, root: postcss.Root, block: Block, file: string) {
  // For each rule declared in the file...
  root.walkRules(rule => {

    // Find the block-class declaration...
    rule.walkDecls("block-interface-index", decl => {
      const val = stripQuotes(decl.value);

      // The value of block-interface-index should be numeric.
      const parsedIndex = parseInt(val, 10);
      if (isNaN(parsedIndex)) {
        block.addError(
          new CssBlockError(
            "block-interface-index must be a number.",
            sourceRange(configuration, root, file, decl),
          ),
        );
      }

      // Set the index on the related style node.
      const parsedSelectors = block.getParsedSelectors(rule);
      parsedSelectors.forEach(sel => {
        const styleTarget = getStyleTargets(block, sel.key);
        if (styleTarget.blockAttrs.length > 0) {
          styleTarget.blockAttrs[0].index = parsedIndex;
        } else if (styleTarget.blockClasses.length > 0) {
          styleTarget.blockClasses[0].index = parsedIndex;
        } else {
          throw new Error(`Couldn\'t find style node corresponding to selector ${sel}. This shouldn't happen.`);
        }
      });
    });
  });

  // At this point, every style node should have a fixed block-class.
  block.all(true).forEach(styleNode => {
    if (!styleNode.wasIndexReset) {
      block.addError(
        new CssBlockError(
          `Style node ${styleNode.asSource()} doesn't have a preset interface index after parsing definition file. You may need to declare this style node in the definition file.`,
          {
            filename: file,
          },
        ),
      );
    }
  });
}

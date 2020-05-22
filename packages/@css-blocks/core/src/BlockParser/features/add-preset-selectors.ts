import { postcss } from "opticss";

import { CLASS_NAME_IDENT } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import { Configuration } from "../../configuration";
import { CssBlockError } from "../../errors";
import { sourceRange } from "../../SourceLocation";
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
export function addPresetSelectors(configuration: Configuration, root: postcss.Root, block: Block, file: string) {
  // For each rule declared in the file...
  root.walkRules(rule => {
    let foundDecl = false;

    // Find the block-class declaration...
    rule.walkDecls("block-class", decl => {
      foundDecl = true;
      const val = stripQuotes(decl.value);

      // Test that this actually could be a class name.
      if (!CLASS_NAME_IDENT.test(val)) {
        block.addError(
          new CssBlockError(
            `${val} isn't a valid class name.`,
            sourceRange(configuration, root, file, decl),
          ),
        );
      }

      // And add its value to the corresponding BlockClass node.
      rule.selectors.forEach(sel => {
        const node = block.find(sel);
        if (!node) {
          throw new Error(`Couldn\'t find block class corresponding to selector ${sel}. This shouldn't happen.`);
        }
        node.setPresetClassName(val);
      });
    });

    // If we didn't find block-class declared, we should error.
    if (!foundDecl) {
      block.addError(
        new CssBlockError(
          `Definition file rule ${rule.selectors} is missing a 'block-class' declaration`,
          sourceRange(configuration, root, file, rule),
        ),
      );
    }
  });
}

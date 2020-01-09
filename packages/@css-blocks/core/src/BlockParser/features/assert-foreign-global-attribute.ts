import { ParsedSelector, postcss, postcssSelectorParser as selectorParser } from "opticss";

import { ROOT_CLASS } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { selectorSourceRange as range, sourceRange } from "../../SourceLocation";
import { isAttributeNode, toAttrToken } from "../block-intermediates";

/**
 * Verify that the external block referenced by a `rule` selects an Attribute that
 * exists in the external block and is exposed as a global.
 * @param block The current block making the external reference.
 * @param rule The rule referencing the external block.
 * @param obj The parsed node making the external reference.
 */
export async function assertForeignGlobalAttribute(configuration: Configuration, root: postcss.Root, block: Block, file: string) {

  root.walkRules((rule) => {
    let parsedSelectors: ParsedSelector[];
    try {
      parsedSelectors = block.getParsedSelectors(rule);
    } catch (e) {
      block.addError(new errors.InvalidBlockSyntax(e.message, sourceRange(configuration, block.stylesheet, file, rule)));
      parsedSelectors =  [];
    }

    parsedSelectors.forEach((iSel) => {

      iSel.eachCompoundSelector((sel) => {

        // Only test rules that are block references (this is validated in parse-styles and shouldn't happen).
        // If node isn't selecting a block, move on
        let blockName = sel.nodes.find(n => isAttributeNode(n) && n.namespace) as selectorParser.Attribute | undefined;

        if (!blockName || !blockName.namespace) { return; }

        if (blockName.namespace === true) {
          // universal namespace selector was already validated; it won't occur here.
          return;
        }

        for (let node of sel.nodes) {

          if (node.type === selectorParser.PSEUDO && node.value === ROOT_CLASS) { continue; }

          // If selecting something other than an attribute on external attribute, throw.
          if (!isAttributeNode(node)) {
            block.addError(new errors.InvalidBlockSyntax(
              `Illegal global state selector: ${rule.selector}`,
              range(configuration, block.stylesheet, file, rule, node)));
          } else {
            // If referenced block does not exist, throw.
            let otherBlock = block.getReferencedBlock(blockName.namespace);
            if (!otherBlock) {
              block.addError(new errors.InvalidBlockSyntax(
                `No Block named "${blockName.value}" found in scope: ${rule.selector}`,
                range(configuration, block.stylesheet, file, rule, node)));
            } else {
              // If state referenced does not exist on external block, throw
              let otherAttr = otherBlock.rootClass.getAttributeValue(toAttrToken(node));
              if (!otherAttr) {
                block.addError(new errors.InvalidBlockSyntax(
                  `No state ${node.toString()} found in : ${rule.selector}`,
                  range(configuration, block.stylesheet, file, rule, node)));
              }

              // If external state is not set as global, throw.
              else if (!otherAttr.isGlobal) {
                block.addError(new errors.InvalidBlockSyntax(
                  `${node.toString()} is not global: ${rule.selector}`,
                  range(configuration, block.stylesheet, file, rule, node)));
              }
            }
          }
        }
      });
    });
  });

}

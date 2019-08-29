import { postcss, postcssSelectorParser as selectorParser } from "opticss";

import { Block } from "../../BlockTree";
import * as errors from "../../errors";
import { selectorSourceRange as loc } from "../../SourceLocation";
import { isAttributeNode, toAttrToken } from "../block-intermediates";

/**
 * Verify that the external block referenced by a `rule` selects an Attribute that
 * exists in the external block and is exposed as a global.
 * @param block The current block making the external reference.
 * @param rule The rule referencing the external block.
 * @param obj The parsed node making the external reference.
 */
export async function assertForeignGlobalAttribute(root: postcss.Root, block: Block, file: string) {

  root.walkRules((rule) => {

    let parsedSelectors = block.getParsedSelectors(rule);

    parsedSelectors.forEach((iSel) => {

      iSel.eachCompoundSelector((sel) => {

        // Only test rules that are block references (this is validated in parse-styles and shouldn't happen).
        // If node isn't selecting a block, move on
        let blockName = sel.nodes.find(n => n.type === selectorParser.TAG);
        if (!blockName || !blockName.value) { return; }

        for (let node of sel.nodes) {

          if (node.type === selectorParser.TAG) { continue; }

          // If selecting something other than an attribute on external block, throw.
          if (!isAttributeNode(node)) {
            throw new errors.InvalidBlockSyntax(
              `Only global states from other blocks can be used in selectors: ${rule.selector}`,
              loc(file, rule, node));
          }

          // If referenced block does not exist, throw.
          let otherBlock = block.getReferencedBlock(blockName.value);
          if (!otherBlock) {
            throw new errors.InvalidBlockSyntax(
              `No Block named "${blockName.value}" found in scope: ${rule.selector}`,
              loc(file, rule, node));
          }

          // If state referenced does not exist on external block, throw
          let otherAttr = otherBlock.rootClass.getAttributeValue(toAttrToken(node));
          if (!otherAttr) {
            throw new errors.InvalidBlockSyntax(
              `No state ${node.toString()} found in : ${rule.selector}`,
              loc(file, rule, node));
          }

          // If external state is not set as global, throw.
          if (!otherAttr.isGlobal) {
            throw new errors.InvalidBlockSyntax(
              `${node.toString()} is not global: ${rule.selector}`,
              loc(file, rule, node));
          }

        }
      });
    });
  });

}

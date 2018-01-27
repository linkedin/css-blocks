import * as postcss from 'postcss';
import * as errors from '../../errors';
import { selectorSourceLocation as loc } from '../../SourceLocation';
import { Block } from '../../Block';
import selectorParser = require('postcss-selector-parser');
import {
  stateParser,
  BlockType,
  getBlockNode
} from "../block-intermediates";

/**
 * Verify that the external block referenced by `rule` selects on a state that
 * exists in the external block and is exposed as a global.
 * @param block The current block making the external reference.
 * @param rule The rule referencing the external block.
 * @param obj The parsed node making the external reference.
 */
export default async function assertForeignGlobalState(root: postcss.Root, block: Block, file: string) {

  root.walkRules((rule) => {

    let parsedSelectors = block.getParsedSelectors(rule);

    parsedSelectors.forEach((iSel) => {

      iSel.eachCompoundSelector((compoundSel) => {

        let obj = getBlockNode(compoundSel);

        // Only test rules that are block references (this is validated in parse-styles and shouldn't happen).
        // If node isn't selecting a block, move on
        if (!obj || !obj.blockName) { return; }

        // If selecting something other than a state on external block, throw.
        if (obj.blockType !== BlockType.state) {
          throw new errors.InvalidBlockSyntax(
            `Only global states from other blocks can be used in selectors: ${rule.selector}`,
            loc(file, rule, obj.node));
        }

        // If referened block does not exist, throw.
        let otherBlock = block.getReferencedBlock(obj.blockName);
        if (!otherBlock) {
          throw new errors.InvalidBlockSyntax(
            `No block named ${obj.blockName} found: ${rule.selector}`,
            loc(file, rule, obj.node));
        }

        // If state referenced does not exist on external block, throw
        let stateInfo = stateParser(<selectorParser.Attribute>obj.node);
        let otherState = otherBlock.rootClass._getState(stateInfo);
        if (!otherState) {
          throw new errors.InvalidBlockSyntax(
            `No state ${obj.node.toString()} found in : ${rule.selector}`,
            loc(file, rule, obj.node));
        }

        // If external state is not set as global, throw.
        if (!otherState.isGlobal) {
          throw new errors.InvalidBlockSyntax(
            `${obj.node.toString()} is not global: ${rule.selector}`,
            loc(file, rule, obj.node));
        }
      });
    });
  });

}
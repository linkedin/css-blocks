import * as postcss from 'postcss';
import * as errors from '../../errors';
import selectorParser = require('postcss-selector-parser');
import { parseSelector } from "opticss";
import { stateParser } from "../block-intermediates";
import { sourceLocation as loc } from "../../SourceLocation";
import { Block } from "../../Block";
import { BLOCK_GLOBAL } from "../../blockSyntax";

export default async function globalStates(root: postcss.Root, block: Block, file: string): Promise<Block> {
  root.walkAtRules(BLOCK_GLOBAL, (atRule) => {

    let selectors = parseSelector(atRule.params.trim());

    // The syntax for a `@block-global` at-rule is a simple selector for a state.
    // Parse selector allows a much broader syntax so we validate that the parsed
    // result is legal here, if it is, we create the state and mark it global.
    if (selectors.length === 1 && selectors[0].key === selectors[0].selector) {
      let nodes = selectors[0].key.nodes;
      if (nodes.length === 1 && nodes[0].type === selectorParser.ATTRIBUTE) {
        let info = stateParser(<selectorParser.Attribute>selectors[0].key.nodes[0]);
        let state = block.rootClass._ensureState(info);
        state.isGlobal = true;
      } else {
        throw new errors.InvalidBlockSyntax(
          `Illegal global state declaration: ${atRule.toString()}`,
          loc(file, atRule)
        );
      }
    }

    // TODO: Handle complex global selector

  });

  return block;
}
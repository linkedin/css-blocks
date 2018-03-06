import { parseSelector } from "opticss";
import * as postcss from "postcss";
import selectorParser = require("postcss-selector-parser");

import { Block } from "../../Block";
import { BLOCK_GLOBAL } from "../../BlockSyntax";
import { sourceLocation as loc } from "../../SourceLocation";
import * as errors from "../../errors";
import { toAttrToken } from "../block-intermediates";

export async function globalAttribute(root: postcss.Root, block: Block, file: string): Promise<Block> {
  root.walkAtRules(BLOCK_GLOBAL, (atRule) => {

    let selectors = parseSelector(atRule.params.trim());

    // The syntax for a `@block-global` at-rule is a simple selector for an attribute.
    // Parse selector allows a much broader syntax so we validate that the parsed
    // result is legal here, if it is, we create the attr and mark it global.
    if (selectors.length === 1 && selectors[0].key === selectors[0].selector) {
      let firstNode: selectorParser.Node | undefined = selectors[0].key.nodes[0];
      if (firstNode && selectorParser.isAttribute(firstNode)) {
        let attr = block.rootClass
          .ensureValue(toAttrToken(firstNode));
        attr.isGlobal = true;
      } else {
        throw new errors.InvalidBlockSyntax(
          `Illegal global attribute declaration: ${atRule.toString()}`,
          loc(file, atRule),
        );
      }
    }

    // TODO: Handle complex global selector

  });

  return block;
}

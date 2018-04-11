// tslint:disable:no-console
import * as postcss from "postcss";

import { BLOCK_DEBUG, parseBlockDebug } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import { ResolvedConfiguration } from "../../configuration";

/**
 * Process all `@block-debug` statements, output debug statement to console or in comment as requested.
 * @param sourceFile File name of block in question.
 * @param root PostCSS Root for block.
 * @param block Block to resolve references for
 */
export async function processDebugStatements(root: postcss.Root, block: Block, file: string, config: ResolvedConfiguration) {
  root.walkAtRules(BLOCK_DEBUG, (atRule) => {
    let { block: ref, channel } = parseBlockDebug(atRule, file, block);
    let debugStr = ref.debug(config);
    if (channel !== "comment") {
      if (channel === "stderr") {
        console.warn(debugStr.join("\n"));
      } else {
        console.log(debugStr.join("\n"));
      }
    }
  });
}

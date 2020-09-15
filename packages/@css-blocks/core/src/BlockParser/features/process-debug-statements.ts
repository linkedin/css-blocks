// tslint:disable:no-console
import { postcss } from "opticss";

import { BLOCK_DEBUG, parseBlockDebug } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import { ResolvedConfiguration } from "../../configuration";

/**
 * Process all `@block-debug` statements, output debug statement to console or in comment as requested.
 * @param sourceFile File name of block in question.
 * @param root PostCSS Root for block.
 * @param block Block to resolve references for
 */
export function processDebugStatements(root: postcss.Root, block: Block, file: string, config: ResolvedConfiguration): void {
  root.walkAtRules(BLOCK_DEBUG, (atRule) => {
    let { block: ref, channel } = parseBlockDebug(config, root, atRule, file, block);
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

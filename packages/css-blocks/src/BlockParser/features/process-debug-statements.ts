import parseBlockDebug from "../../parseBlockDebug";
import * as postcss from 'postcss';
import { Block } from "../../Block";
import { OptionsReader } from "../../OptionsReader";

/**
 * Process all `@block-debug` statements, output debug statement to console or in comment as requested.
 * @param sourceFile File name of block in question.
 * @param root PostCSS Root for block.
 * @param block Block to resolve references for
 */
export default async function processDebugStatements(root: postcss.Root, block: Block, file: string, opts: OptionsReader) {
  root.walkAtRules("block-debug", (atRule) => {
    let { block: ref, channel } = parseBlockDebug(atRule, file, block);
    let debugStr = ref.debug(opts);
    if (channel !== "comment") {
      if (channel === "stderr") {
        console.warn(debugStr.join("\n"));
      } else {
        console.log(debugStr.join("\n"));
      }
    }
  });
}
import { postcss } from "opticss";

import { BLOCK_EXPORT, CLASS_NAME_IDENT, DEFAULT_EXPORT, RESERVED_BLOCK_NAMES } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";
import { allDone } from "../../util";
import { BlockExport, LocalBlockExport, builders, typeguards } from "../ast";
import { BlockFactory } from "../index";
import { parseBlockNamesAST, stripQuotes } from "../utils";

const FROM_EXPR = /\s+from\s+/;

function parseExport(atRule: postcss.AtRule): LocalBlockExport | BlockExport | null {
  let exports = atRule.params;

  let [exportList = "", fromPath = ""] = exports.split(FROM_EXPR);
  fromPath = stripQuotes(fromPath);
  if (!exportList) {
    return null;
  }
  let {defaultName, names} = parseBlockNamesAST(exportList, !!fromPath);
  names = names || [];
  if (defaultName) {
    names.unshift({name: DEFAULT_EXPORT, asName: defaultName});
  }
  if (fromPath) {
    return builders.blockExport(fromPath, names);
  } else {
    return builders.localBlockExport(names);
  }
}

/**
 * Resolve all block references for a given block.
 * @param block Block to resolve references for
 * @return Promise that resolves when all references have been loaded.
 */
export async function exportBlocks(block: Block, factory: BlockFactory, file: string): Promise<Block> {

  let root: postcss.Root | undefined = block.stylesheet;
  const exportPromises: Promise<void>[] = [];
  const remoteNames: Set<string> = new Set();

  if (!root) {
    // TODO: add a test case that catches this error
    block.addError(new errors.InvalidBlockSyntax(`Error finding PostCSS root for block ${block.name}`));
  } else {
    // Blocks will always export themselves as the default export.
    block.addBlockExport(DEFAULT_EXPORT, block);

    // For each `@block` expression, read in the block file, parse and
    // push to block references Promise array.
    root.walkAtRules(BLOCK_EXPORT, (atRule: postcss.AtRule) => {
      let exports = parseExport(atRule);
      if (!exports) {
        block.addError(new errors.InvalidBlockSyntax(
          `Malformed block export: \`@export ${atRule.params}\``,
          sourceRange(factory.configuration, block.stylesheet, file, atRule),
        ));
      } else {
        block.blockAST!.children.push(exports);

        // Import file, then parse file, then save block reference.
        let srcBlockPromise: Promise<Block> = Promise.resolve(block);
        if (typeguards.isBlockExport(exports)) {
          srcBlockPromise = factory.getBlockRelative(block.identifier, exports.fromPath);
        }

        // Validate our imported block name is a valid CSS identifier.
        const exportPromise = srcBlockPromise.then(
          (srcBlock) => {
            if (typeguards.isBlockExport(exports)) {
              block.blockReferencePaths.set(exports.fromPath, srcBlock);
            }
            for (let {name: localName, asName: remoteName} of exports?.exports!) {
              remoteName = remoteName || localName;
              if (remoteNames.has(remoteName)) {
                block.addError(new errors.InvalidBlockSyntax(
                  `Cannot have duplicate Block export of same name: "${remoteName}".`,
                  sourceRange(factory.configuration, block.stylesheet, file, atRule),
                ));
              } else {
                remoteNames.add(remoteName);
                if (!CLASS_NAME_IDENT.test(localName)) {
                  block.addError(new errors.InvalidBlockSyntax(
                    `Illegal block name in export. "${localName}" is not a legal CSS identifier.`,
                    sourceRange(factory.configuration, block.stylesheet, file, atRule),
                  ));
                }
                else if (!CLASS_NAME_IDENT.test(remoteName)) {
                  block.addError(new errors.InvalidBlockSyntax(
                    `Illegal block name in import. "${remoteName}" is not a legal CSS identifier.`,
                    sourceRange(factory.configuration, block.stylesheet, file, atRule),
                  ));
                }
                else if (localName === DEFAULT_EXPORT && remoteName === DEFAULT_EXPORT) {
                  block.addError(new errors.InvalidBlockSyntax(
                    `Unnecessary re-export of default Block.`,
                    sourceRange(factory.configuration, block.stylesheet, file, atRule),
                  ));
                }

                else if (RESERVED_BLOCK_NAMES.has(remoteName)) {
                  block.addError(new errors.InvalidBlockSyntax(
                    `Cannot export "${localName}" as reserved word "${remoteName}"`,
                    sourceRange(factory.configuration, block.stylesheet, file, atRule),
                  ));
                }

                let referencedBlock = srcBlock.getReferencedBlock(localName);
                if (!referencedBlock) {
                  block.addError(new errors.InvalidBlockSyntax(
                    `Cannot export Block "${localName}". No Block named "${localName}" in "${file}".`,
                    sourceRange(factory.configuration, block.stylesheet, file, atRule),
                  ));
                } else {
                  // Save exported blocks
                  block.addBlockExport(remoteName, referencedBlock);
                }
              }
            }
          },
          (error) => {
            block.addError(new errors.CascadingError(
              `Error in exported block "${(<BlockExport>exports).fromPath}"`,
              error,
              sourceRange(factory.configuration, block.stylesheet, file, atRule),
            ));
          },
        );

        exportPromises.push(exportPromise);
      }

    });
  }

  // After all export promises have resolved, resolve the decorated Block.
  await allDone(exportPromises);
  return block;
}

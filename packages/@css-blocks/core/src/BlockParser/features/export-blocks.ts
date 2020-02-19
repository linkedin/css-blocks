import { postcss } from "opticss";

import { BLOCK_EXPORT, CLASS_NAME_IDENT, DEFAULT_EXPORT, RESERVED_BLOCK_NAMES } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";
import { allDone } from "../../util";
import { BlockFactory } from "../index";
import { parseBlockNames, stripQuotes } from "../utils";

const FROM_EXPR = /\s+from\s+/;

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
      let exports = atRule.params;

      let [exportList = "", blockPath = ""] = exports.split(FROM_EXPR);
      blockPath = stripQuotes(blockPath);

      if (!exportList) {
        block.addError(new errors.InvalidBlockSyntax(
          `Malformed block export: \`@export ${atRule.params}\``,
          sourceRange(factory.configuration, block.stylesheet, file, atRule),
        ));
      }

      // Import file, then parse file, then save block reference.
      let srcBlockPromise: Promise<Block> = Promise.resolve(block);
      if (blockPath) {
        srcBlockPromise = factory.getBlockRelative(block.identifier, blockPath);
      }

      // Validate our imported block name is a valid CSS identifier.
      const blockNames = parseBlockNames(exportList, !!blockPath);
      const exportPromise = srcBlockPromise.then(
        (srcBlock) => {
          for (let remoteName of Object.keys(blockNames)) {
            if (remoteNames.has(remoteName)) {
              block.addError(new errors.InvalidBlockSyntax(
                `Cannot have duplicate Block export of same name: "${remoteName}".`,
                sourceRange(factory.configuration, block.stylesheet, file, atRule),
              ));
            } else {
              let localName = blockNames[remoteName];
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
            `Error in exported block "${blockPath}"`,
            error,
            sourceRange(factory.configuration, block.stylesheet, file, atRule),
          ));
        },
      );

      exportPromises.push(exportPromise);

    });
  }

  // After all export promises have resolved, resolve the decorated Block.
  await allDone(exportPromises);
  return block;
}

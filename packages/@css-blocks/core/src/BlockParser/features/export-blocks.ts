import { ObjectDictionary } from "@opticss/util";
import { postcss } from "opticss";

import { BLOCK_EXPORT, CLASS_NAME_IDENT, DEFAULT_EXPORT } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import * as errors from "../../errors";
import { sourceLocation } from "../../SourceLocation";

import { parseBlockNames } from "../utils/blockNamesParser";

/**
 * Resolve all block references for a given block.
 * @param block Block to resolve references for
 * @return Promise that resolves when all references have been loaded.
 */
export async function exportBlocks(block: Block, file: string): Promise<Block> {

  let root: postcss.Root | undefined = block.stylesheet;
  let namedBlockReferences: Promise<[string, string, postcss.AtRule, Block]>[] = [];

  if (!root) {
    throw new errors.InvalidBlockSyntax(`Error finding PostCSS root for block ${block.name}`);
  }

  // Blocks will always export themselves as the default export.
  block.addBlockExport(DEFAULT_EXPORT, block);

  // For each `@block` expression, read in the block file, parse and
  // push to block references Promise array.
  root.walkAtRules(BLOCK_EXPORT, (atRule: postcss.AtRule) => {
    let exports = atRule.params;

    if (!exports) {
      throw new errors.InvalidBlockSyntax(
        `Malformed block export: \`@export ${atRule.params}\``,
        sourceLocation(file, atRule),
      );
    }

    // Validate our imported block name is a valid CSS identifier.
    let blockNames = parseBlockNames(exports, false);
    for (let remoteName of Object.keys(blockNames)) {
      let localName = blockNames[remoteName];
      if (!CLASS_NAME_IDENT.test(localName)) {
        throw new errors.InvalidBlockSyntax(
          `Illegal block name in export. "${localName}" is not a legal CSS identifier.`,
          sourceLocation(file, atRule),
        );
      }
      if (!CLASS_NAME_IDENT.test(remoteName)) {
        throw new errors.InvalidBlockSyntax(
          `Illegal block name in import. "${remoteName}" is not a legal CSS identifier.`,
          sourceLocation(file, atRule),
        );
      }
      if (localName === DEFAULT_EXPORT && remoteName === DEFAULT_EXPORT) {
        throw new errors.InvalidBlockSyntax(
          `Unnecessary re-export of default Block.`,
          sourceLocation(file, atRule),
        );
      }
      if (remoteName === DEFAULT_EXPORT) {
        throw new errors.InvalidBlockSyntax(
          `Can not export "${localName}" as reserved word "${DEFAULT_EXPORT}"`,
          sourceLocation(file, atRule),
        );
      }

      let referencedBlock = block.getReferencedBlock(localName);
      if (!referencedBlock) {
        throw new errors.InvalidBlockSyntax(
          `Can not export Block "${localName}". No Block named "${localName}" in "${file}".`,
          sourceLocation(file, atRule),
        );
      }

      // Save exported blocks
      block.addBlockExport(remoteName, referencedBlock);

    }

  });

  // When all import promises have resolved, save the block references and resolve.
  return Promise.all(namedBlockReferences).then((results) => {
    let localNames: ObjectDictionary<string> = {};
    results.forEach(([localName, importPath, atRule, otherBlock]) => {
      if (localNames[localName]) {
        throw new errors.InvalidBlockSyntax(
          `Blocks ${localNames[localName]} and ${importPath} cannot both have the name ${localName} in this scope.`,
          sourceLocation(file, atRule),
        );
      } else {
        block.addBlockReference(localName, otherBlock);
        localNames[localName] = importPath;
      }
    });
  }).then(() => {
    return block;
  });
}

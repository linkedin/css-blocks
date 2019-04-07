import { ObjectDictionary } from "@opticss/util";
import { postcss } from "opticss";

import { BLOCK_IMPORT, CLASS_NAME_IDENT, DEFAULT_EXPORT } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import * as errors from "../../errors";
import { sourceLocation } from "../../SourceLocation";

import { BlockFactory } from "../index";
import { parseBlockNames, stripQuotes } from "../utils";

const FROM_EXPR = /\s+from\s+/;

/**
 * Resolve all block references for a given block.
 * @param block Block to resolve references for
 * @return Promise that resolves when all references have been loaded.
 */
export async function importBlocks(block: Block, factory: BlockFactory, file: string): Promise<Block> {

  let root: postcss.Root | undefined = block.stylesheet;
  let namedBlockReferences: Promise<[string, string, postcss.AtRule, Block]>[] = [];

  if (!root) {
    throw new errors.InvalidBlockSyntax(`Error finding PostCSS root for block ${block.name}`);
  }

  // For each `@block` expression, read in the block file, parse and
  // push to block references Promise array.
  root.walkAtRules(BLOCK_IMPORT, (atRule: postcss.AtRule) => {
    // imports: `<blocks-list> from <block-path>`
    // blockList: `<default-block> | <named-blocks> | <default-block> " , " <named-blocks> | <named-blocks> " , " <default-block>`
    // blockPath: `' " ' <any-value> ' " ' | " ' " <any-value> " ' "`
    let imports = atRule.params;
    let [blockList = "", blockPath = ""] = imports.split(FROM_EXPR);
    blockPath = stripQuotes(blockPath);

    if (!blockList || !blockPath) {
      throw new errors.InvalidBlockSyntax(
        `Malformed block reference: \`@block ${atRule.params}\``,
        sourceLocation(file, atRule),
        );
      }

    // Import file, then parse file, then save block reference.
    let blockPromise: Promise<Block> = factory.getBlockRelative(block.identifier, blockPath);

    // Validate our imported block name is a valid CSS identifier.
    let blockNames = parseBlockNames(blockList, true);
    for (let localName of Object.keys(blockNames)) {
      let remoteName = blockNames[localName];
      if (!CLASS_NAME_IDENT.test(localName)) {
        throw new errors.InvalidBlockSyntax(
          `Illegal block name in import. "${localName}" is not a legal CSS identifier.`,
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
          `Default Block from "${blockPath}" must be aliased to a unique local identifier.`,
          sourceLocation(file, atRule),
        );
      }
      if (localName === DEFAULT_EXPORT) {
        throw new errors.InvalidBlockSyntax(
          `Can not import "${remoteName}" as reserved word "${DEFAULT_EXPORT}"`,
          sourceLocation(file, atRule),
        );
      }

      // Once block is parsed, save named block reference
      let namedResult: Promise<[string, string, postcss.AtRule, Block]> = blockPromise.then((block: Block): [string, string, postcss.AtRule, Block] => {
        let referencedBlock = block.getExportedBlock(remoteName);
        if (!referencedBlock) {
          throw new errors.InvalidBlockSyntax(
            `Can not import Block "${remoteName}". No Block named "${remoteName}" exported by "${blockPath}".`,
            sourceLocation(file, atRule),
          );
        }
        return [localName, blockPath, atRule, referencedBlock];
      });
      namedBlockReferences.push(namedResult);
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

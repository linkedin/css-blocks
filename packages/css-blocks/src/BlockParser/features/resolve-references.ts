import * as postcss from "postcss";

import { Block } from "../../Block";
import { BLOCK_REFERENCE, CLASS_NAME_IDENT } from "../../BlockSyntax";
import { sourceLocation } from "../../SourceLocation";
import * as errors from "../../errors";
import { BlockFactory } from "../index";

/**
 * Resolve all block references for a given block.
 * @param block Block to resolve references for
 * @return Promise that resolves when all references have been loaded.
 */
export async function resolveReferences(block: Block, factory: BlockFactory, file: string): Promise<Block> {

  let root: postcss.Root | undefined = block.stylesheet;
  let namedBlockReferences: Promise<[string, string, postcss.AtRule, Block]>[] = [];

  if (!root) {
    throw new errors.InvalidBlockSyntax(`Error finding PostCSS root for block ${block.name}`);
  }

  // For each `@block-reference` expression, read in the block file, parse and
  // push to block references Promise array.
  root.walkAtRules(BLOCK_REFERENCE, (atRule: postcss.AtRule) => {
    let md = atRule.params.match(/^\s*((("|')?[-\w]+\3?)\s+from\s+)\s*("|')([^\4]+)\4\s*$/);
    if (!md) {
      throw new errors.InvalidBlockSyntax(
        `Malformed block reference: \`@block-reference ${atRule.params}\``,
        sourceLocation(file, atRule));
    }
    let importPath = md[5];
    let localName = md[2];

    // Validate our imported block name is a valid CSS identifier.
    if (!CLASS_NAME_IDENT.test(localName)) {
      throw new errors.InvalidBlockSyntax(
        `Illegal block name in import. ${localName} is not a legal CSS identifier.`,
        sourceLocation(file, atRule),
      );
    }

    // Import file, then parse file, then save block reference.

    let blockPromise: Promise<Block> = factory.getBlockRelative(block.identifier, importPath);
    let namedResult: Promise<[string, string, postcss.AtRule, Block]> = blockPromise.then((referencedBlock: Block): [string, string, postcss.AtRule, Block] => {
      return [localName, importPath, atRule, referencedBlock];
    });
    namedBlockReferences.push(namedResult);
  });

  // When all import promises have resolved, save the block references and resolve.
  return Promise.all(namedBlockReferences).then((results) => {
    let localNames: {[name: string]: string} = {};
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

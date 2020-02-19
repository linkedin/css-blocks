import { ObjectDictionary } from "@opticss/util";
import { postcss } from "opticss";

import { BLOCK_IMPORT, CLASS_NAME_IDENT, DEFAULT_EXPORT, isBlockNameReserved } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";
import { BlockFactory } from "../index";
import { parseBlockNames, stripQuotes } from "../utils";

const FROM_EXPR = /\s+from\s+/;

interface ParsedImport {
  blockPath: string;
  atRule: postcss.AtRule;
  names: Array<{localName: string; remoteName: string}>;
}

/**
 * Resolve all block references for a given block.
 * @param block Block to resolve references for
 * @return Promise that resolves when all references have been loaded.
 */
export async function importBlocks(block: Block, factory: BlockFactory, file: string): Promise<Block> {

  let root: postcss.Root | undefined = block.stylesheet;

  if (!root) {
    block.addError(new errors.InvalidBlockSyntax(`Internal Error: Cannot find PostCSS root for block ${block.name}`));
    return block;
  }

  let parsedImports = new Array<ParsedImport>();
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
      block.addError(new errors.InvalidBlockSyntax(
        `Malformed block reference: \`@block ${atRule.params}\``,
        sourceRange(factory.configuration, block.stylesheet, file, atRule),
        ));
    } else {
      let names: ParsedImport["names"] = [];
      let blockNames = parseBlockNames(blockList, true);
      for (let localName of Object.keys(blockNames)) {
        let remoteName = blockNames[localName];
        let hasInvalidNames = validateBlockNames(factory.configuration, block, blockPath, localName, remoteName, file, atRule);
        if (!hasInvalidNames) {
          names.push({ localName, remoteName });
        }
      }
      parsedImports.push({ blockPath, atRule, names });
    }
  });

  let localNames: ObjectDictionary<string> = {};
  for (let parsedImport of parsedImports) {
    let {blockPath, atRule, names} = parsedImport;
    let referencedBlock: Block | null = null;

    // Import the main block file referenced by the import path.
    try {
      referencedBlock = await factory.getBlockRelative(block.identifier, parsedImport.blockPath);
    } catch (err) {
      block.addError(new errors.CascadingError(
        "Error in imported block.",
        err,
        sourceRange(factory.configuration, block.stylesheet, file, atRule),
      ));
    }

    for (let {localName, remoteName} of names) {
      // check for duplicate local names
      if (localNames[localName]) {
        block.addError(new errors.InvalidBlockSyntax(
          `Blocks ${localNames[localName]} and ${blockPath} cannot both have the name ${localName} in this scope.`,
          sourceRange(factory.configuration, block.stylesheet, file, atRule),
        ));
        continue;
      } else {
        localNames[localName] = blockPath;
      }

      // Store a reference to the local block if possible
      if (referencedBlock) {
        let exportedBlock = referencedBlock.getExportedBlock(remoteName);
        if (exportedBlock) {
          block.addBlockReference(localName, exportedBlock);
        } else {
          block.addError(new errors.InvalidBlockSyntax(
            `Cannot import Block "${remoteName}". No Block named "${remoteName}" exported by "${blockPath}".`,
            sourceRange(factory.configuration, block.stylesheet, file, atRule),
          ));
        }
      }
    }
  }
  return block;
}

function validateBlockNames(
  config: BlockFactory["configuration"],
  block: Block,
  blockPath: string,
  localName: string,
  remoteName: string,
  file: string,
  atRule: postcss.AtRule,
): boolean {
  let hasInvalidNames = false;
  // Validate our imported block name is a valid CSS identifier.
  if (!CLASS_NAME_IDENT.test(localName)) {
    hasInvalidNames = true;
    block.addError(new errors.InvalidBlockSyntax(
      `Illegal block name in import. "${localName}" is not a legal CSS identifier.`,
      sourceRange(config, block.stylesheet, file, atRule),
    ));
  }
  if (!CLASS_NAME_IDENT.test(remoteName)) {
    hasInvalidNames = true;
    block.addError(new errors.InvalidBlockSyntax(
      `Illegal block name in import. "${remoteName}" is not a legal CSS identifier.`,
      sourceRange(config, block.stylesheet, file, atRule),
    ));
  }
  if (localName === DEFAULT_EXPORT && remoteName === DEFAULT_EXPORT) {
    hasInvalidNames = true;
    block.addError(new errors.InvalidBlockSyntax(
      `Default Block from "${blockPath}" must be aliased to a unique local identifier.`,
      sourceRange(config, block.stylesheet, file, atRule),
    ));
  }
  if (isBlockNameReserved(localName)) {
    hasInvalidNames = true;
    block.addError(new errors.InvalidBlockSyntax(
      `Cannot import "${remoteName}" as reserved word "${localName}"`,
      sourceRange(config, block.stylesheet, file, atRule),
    ));
  }
  return hasInvalidNames;
}

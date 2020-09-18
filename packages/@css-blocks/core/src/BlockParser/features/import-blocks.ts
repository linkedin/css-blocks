import { ObjectDictionary } from "@opticss/util";
import { postcss } from "opticss";

import { BLOCK_IMPORT, CLASS_NAME_IDENT, DEFAULT_EXPORT, isBlockNameReserved } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";
import { BlockReference, builders } from "../ast";
import { BlockFactory, BlockFactorySync } from "../index";
import { parseBlockNamesAST, stripQuotes } from "../utils";

const FROM_EXPR = /\s+from\s+/;

interface ParsedImport {
  blockPath: string;
  atRule: postcss.AtRule;
  names: Array<{localName: string; remoteName: string}>;
}

// imports: `<blocks-list> from <block-path>`
// blockList: `<default-block> | <named-blocks> | <default-block> " , " <named-blocks> | <named-blocks> " , " <default-block>`
// blockPath: `' " ' <any-value> ' " ' | " ' " <any-value> " ' "`
function parseBlockReference(atRule: postcss.AtRule): BlockReference | null {
  let imports = atRule.params;
  let [blockList = "", blockPath = ""] = imports.split(FROM_EXPR);
  blockPath = stripQuotes(blockPath);

  if (!blockList || !blockPath) {
    return null;
  } else {
    let {defaultName, names} = parseBlockNamesAST(blockList, true);
    return builders.blockReference(blockPath, defaultName, names);
  }
}

/**
 * Resolve all block references for a given block.
 * @param block Block to resolve references for
 * @return Promise that resolves when all references have been loaded.
 */
export async function importBlocks(block: Block, factory: BlockFactory | BlockFactorySync, file: string): Promise<Block> {

  let root: postcss.Root | undefined = block.stylesheet;

  if (!root) {
    block.addError(new errors.InvalidBlockSyntax(`Internal Error: Cannot find PostCSS root for block ${block.name}`));
    return block;
  }

  let parsedImports = parseImports(block, factory, file, root);

  let localNames: ObjectDictionary<string> = {};
  for (let parsedImport of parsedImports) {
    let {atRule} = parsedImport;
    let referencedBlock: Block | null = null;

    // Import the main block file referenced by the import path.
    try {
      referencedBlock = await factory.getBlockRelative(block.identifier, parsedImport.blockPath);
      block.blockReferencePaths.set(parsedImport.blockPath, referencedBlock);
    } catch (err) {
      block.addError(new errors.CascadingError(
        "Error in imported block.",
        err,
        sourceRange(factory.configuration, block.stylesheet, file, atRule),
      ));
    }

    processReferencedBlock(block, factory.configuration, file, referencedBlock, parsedImport, localNames);
  }
  return block;
}

export function importBlocksSync(block: Block, factory: BlockFactorySync, file: string): Block {

  let root: postcss.Root | undefined = block.stylesheet;

  if (!root) {
    block.addError(new errors.InvalidBlockSyntax(`Internal Error: Cannot find PostCSS root for block ${block.name}`));
    return block;
  }

  let parsedImports = parseImports(block, factory, file, root);

  let localNames: ObjectDictionary<string> = {};
  for (let parsedImport of parsedImports) {
    let {atRule} = parsedImport;
    let referencedBlock: Block | null = null;

    // Import the main block file referenced by the import path.
    try {
      referencedBlock = factory.getBlockRelative(block.identifier, parsedImport.blockPath);
      block.blockReferencePaths.set(parsedImport.blockPath, referencedBlock);
    } catch (err) {
      block.addError(new errors.CascadingError(
        "Error in imported block.",
        err,
        sourceRange(factory.configuration, block.stylesheet, file, atRule),
      ));
    }

    processReferencedBlock(block, factory.configuration, file, referencedBlock, parsedImport, localNames);
  }
  return block;
}

function parseImports(block: Block, factory: BlockFactory | BlockFactorySync, file: string, root: postcss.Root): Array<ParsedImport> {
  let parsedImports = new Array<ParsedImport>();
  // For each `@block` expression, read in the block file, parse and
  // push to block references Promise array.
  root.walkAtRules(BLOCK_IMPORT, (atRule: postcss.AtRule) => {
    let blockReference = parseBlockReference(atRule);
    if (!blockReference) {
      block.addError(new errors.InvalidBlockSyntax(
        `Malformed block reference: \`@block ${atRule.params}\``,
        sourceRange(factory.configuration, block.stylesheet, file, atRule),
      ));
    } else {
      block.blockAST!.children.push(blockReference);
      let hasInvalidNames = false;
      let names: ParsedImport["names"] = [];
      if (blockReference.defaultName) {
        hasInvalidNames = validateBlockNames(factory.configuration, block, blockReference.fromPath, blockReference.defaultName, DEFAULT_EXPORT, file, atRule);
        if (!hasInvalidNames) {
          names.push({localName: blockReference.defaultName, remoteName: DEFAULT_EXPORT});
        }
      }
      if (blockReference.references) {
        for (let {name: remoteName, asName: localName} of blockReference.references) {
          if (!localName) localName = remoteName;
          let isInvalid = validateBlockNames(factory.configuration, block, blockReference.fromPath, localName, remoteName, file, atRule);
          if (!isInvalid) {
            names.push({localName, remoteName});
          }
          hasInvalidNames = hasInvalidNames || isInvalid;
        }
      }
      parsedImports.push({ blockPath: blockReference?.fromPath, atRule, names });
    }
  });
  return parsedImports;
}

function processReferencedBlock(block: Block, configuration: Readonly<Configuration>, file: string, referencedBlock: Block | null, parsedImport: ParsedImport, localNames: ObjectDictionary<string>) {

    let {blockPath, atRule, names} = parsedImport;
    for (let {localName, remoteName} of names) {
      // check for duplicate local names
      if (localNames[localName]) {
        block.addError(new errors.InvalidBlockSyntax(
          `Blocks ${localNames[localName]} and ${blockPath} cannot both have the name ${localName} in this scope.`,
          sourceRange(configuration, block.stylesheet, file, atRule),
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
            sourceRange(configuration, block.stylesheet, file, atRule),
          ));
        }
      }
    }
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

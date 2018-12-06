import * as debugGenerator from "debug";
import { postcss } from "opticss";

import { BlockFactory } from "../BlockFactory";
import { Block } from "../BlockTree";
import { Options, ResolvedConfiguration, resolveConfiguration } from "../configuration";
import * as errors from "../errors";
import { FileIdentifier, Syntax } from "../Importer";

import { assertForeignGlobalAttribute } from "./features/assert-foreign-global-attribute";
import { constructBlock } from "./features/construct-block";
import { disallowImportant } from "./features/disallow-important";
import { discoverName } from "./features/discover-name";
import { exportBlocks } from "./features/export-blocks";
import { extendBlock } from "./features/extend-block";
import { globalAttributes } from "./features/global-attributes";
import { implementBlock } from "./features/implement-block";
import { importBlocks } from "./features/import-blocks";
import { processDebugStatements } from "./features/process-debug-statements";

const debug = debugGenerator("css-blocks:BlockParser");

export interface ParsedSource {
  identifier: FileIdentifier;
  timestamp: number;
  defaultName: string;
  originalSource: string;
  originalSyntax: Syntax;
  parseResult: postcss.Result;
  dependencies: string[];
}

/**
 * Parser that, given a PostCSS AST will return a `Block` object. Main public
 * interface is `BlockParser.parse`.
 */
export class BlockParser {
  private config: ResolvedConfiguration;
  private factory: BlockFactory;

  constructor(opts: Options, factory: BlockFactory) {
    this.config = resolveConfiguration(opts);
    this.factory = factory;
  }

  public async parseSource(source: ParsedSource): Promise<Block> {
    let root = source.parseResult.root;

    // This should never happen but it makes the typechecker happy.
    if (!root) { throw new errors.CssBlockError("No postcss root found."); }

    let block = await this.parse(root, source.identifier, source.defaultName);
    source.dependencies.forEach(block.addDependency);
    block.setTimestamp(source.timestamp);
    return block;
  }

  /**
   * Main public interface of `BlockParser`. Given a PostCSS AST, returns a promise
   * for the new `Block` object.
   * @param root  PostCSS AST
   * @param sourceFile  Source file name
   * @param defaultName Name of block
   */
  public async parse(root: postcss.Root, identifier: string, defaultName: string): Promise<Block> {
    let importer = this.config.importer;
    let debugIdent = importer.debugIdentifier(identifier, this.config);
    let sourceFile = importer.filesystemPath(identifier, this.config) || debugIdent;

    // Discover the block's preferred name.
    debug(`Discovering Block name for ${identifier}.`);
    let name = await discoverName(root, defaultName, sourceFile);

    // Create our new Block object and save reference to the raw AST.
    let block = new Block(name, identifier, root);

    debug(`Ensuring no '!important' decls for ${identifier}.`);
    await disallowImportant(root, sourceFile);
    debug(`Importing children for ${identifier}.`);
    await importBlocks(block, this.factory, sourceFile);
    debug(`Discovering exported refs for ${identifier}.`);
    await exportBlocks(block, sourceFile);
    debug(`Marking global attributes for ${identifier}.`);
    await globalAttributes(root, block, sourceFile);
    debug(`Constructing Block Style tree for ${identifier}.`);
    await constructBlock(root, block, debugIdent);
    debug(`Asserting all external global Blocks Styles referenced exist on the foreign Block for ${identifier}.`);
    await assertForeignGlobalAttribute(root, block, debugIdent);
    debug(`Wiring Block extensions for ${identifier}.`);
    await extendBlock(root, block, debugIdent);
    debug(`Validating Block implementations for ${identifier}.`);
    await implementBlock(root, block, debugIdent);
    debug(`Processing Block debug statements for ${identifier}.`);
    await processDebugStatements(root, block, debugIdent, this.config);

    // Return our fully constructed block.
    return block;
  }

}

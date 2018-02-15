import * as postcss from "postcss";

import { Block } from "../Block";
import { IBlockFactory } from "../BlockFactory/IBlockFactory";
import { OptionsReader } from "../OptionsReader";
import * as errors from "../errors";
import { FileIdentifier } from "../importing";
import { PluginOptions } from "../options";
import { Syntax } from "../preprocessing";

import assertForeignGlobalState from "./features/assert-foreign-global-state";
import constructBlock from "./features/construct-block";
import disallowImportant from "./features/disallow-important";
import discoverName from "./features/discover-name";
import extendBlock from "./features/extend-block";
import globalStates from "./features/global-states";
import implementBlock from "./features/implement-block";
import processDebugStatements from "./features/process-debug-statements";
import resolveReferences from "./features/resolve-references";

export {
  stateParser,
  BlockType,
  NodeAndType,
  isStateNode,
  isClassNode,
  getBlockNode,
  StateInfo,
} from "./block-intermediates";

export interface ParsedSource {
  identifier: FileIdentifier;
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
export default class BlockParser {
  private opts: OptionsReader;
  private factory: IBlockFactory;

  constructor(opts: PluginOptions, factory: IBlockFactory) {
    this.opts = new OptionsReader(opts);
    this.factory = factory;
  }

  public parseSource(source: ParsedSource): Promise<Block> {
    let root = source.parseResult.root;

    // This should never happen but it makes the typechecker happy.
    if (!root) { throw new errors.CssBlockError("No postcss root found."); }

    return this.parse(root, source.identifier, source.defaultName).then(block => {
      source.dependencies.forEach(block.addDependency);
      return block;
    });
  }

  /**
   * Main public interface of `BlockParser`. Given a PostCSS AST, returns a promise
   * for the new `Block` object.
   * @param root  PostCSS AST
   * @param sourceFile  Source file name
   * @param defaultName Name of block
   */
  public async parse(root: postcss.Root, identifier: string, name: string): Promise<Block> {
    let importer = this.opts.importer;
    let debugIdent = importer.debugIdentifier(identifier, this.opts);
    let sourceFile = importer.filesystemPath(identifier, this.opts) || debugIdent;

    // Discover the block's preferred name.
    name = await discoverName(root, name, sourceFile);

    // Create our new Block object and save reference to the raw AST.
    let block = new Block(name, identifier);
    block.stylesheet = root;

    // Throw if we encounter any `!important` decls.
    await disallowImportant(root, sourceFile);
    // Discover and parse all block references included by this block.
    await resolveReferences(block, this.factory, sourceFile);
    // Handle any global states defined by this block.
    await globalStates(root, block, sourceFile);
    // Parse all block styles and build block tree.
    await constructBlock(root, block, debugIdent);
    // Verify that external blocks referenced have been imported, have defined the state being selected, and have marked it as a global state.
    await assertForeignGlobalState(root, block, debugIdent);
    // Construct block extentions and validate.
    await extendBlock(root, block, debugIdent);
    // Validate that all required Styles are implemented.
    await implementBlock(root, block, debugIdent);
    // Log any debug statements discovered.
    await processDebugStatements(root, block, debugIdent, this.opts);

    // Return our fully constructed block.
    return block;
  }

}

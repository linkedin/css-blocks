import { postcss } from "opticss";

import { Block } from "../BlockTree";
import { Options, ResolvedConfiguration, resolveConfiguration } from "../configuration";
import * as errors from "../errors";
import { FileIdentifier } from "../importing";

import { assertForeignGlobalAttribute } from "./features/assert-foreign-global-attribute";
import { constructBlock } from "./features/construct-block";
import { disallowImportant } from "./features/disallow-important";
import { discoverName } from "./features/discover-name";
import { extendBlock } from "./features/extend-block";
import { globalAttributes } from "./features/global-attributes";
import { implementBlock } from "./features/implement-block";
import { processDebugStatements } from "./features/process-debug-statements";
import { resolveReferences } from "./features/resolve-references";
import { BlockFactory } from "./index";
import { Syntax } from "./preprocessing";

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
export class BlockParser {
  private config: ResolvedConfiguration;
  private factory: BlockFactory;

  constructor(opts: Options, factory: BlockFactory) {
    this.config = resolveConfiguration(opts);
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
    let importer = this.config.importer;
    let debugIdent = importer.debugIdentifier(identifier, this.config);
    let sourceFile = importer.filesystemPath(identifier, this.config) || debugIdent;

    // Discover the block's preferred name.
    name = await discoverName(root, name, sourceFile);

    // Create our new Block object and save reference to the raw AST.
    let block = new Block(name, identifier, root);

    // Throw if we encounter any `!important` decls.
    await disallowImportant(root, sourceFile);
    // Discover and parse all block references included by this block.
    await resolveReferences(block, this.factory, sourceFile);
    // Handle any global attributes defined by this block.
    await globalAttributes(root, block, sourceFile);
    // Parse all block styles and build block tree.
    await constructBlock(root, block, debugIdent);
    // Verify that external blocks referenced have been imported, have defined the attribute being selected, and have marked it as a global state.
    await assertForeignGlobalAttribute(root, block, debugIdent);
    // Construct block extensions and validate.
    await extendBlock(root, block, debugIdent);
    // Validate that all required Styles are implemented.
    await implementBlock(root, block, debugIdent);
    // Log any debug statements discovered.
    await processDebugStatements(root, block, debugIdent, this.config);

    // Return our fully constructed block.
    return block;
  }

}

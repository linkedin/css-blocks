import * as debugGenerator from "debug";
import { postcss } from "opticss";

import { Block } from "../BlockTree";
import { Options, ResolvedConfiguration, resolveConfiguration } from "../configuration";
import { FileIdentifier } from "../importing";

import { assertBlockClassDeclared } from "./features/assert-block-class-declared";
import { assertForeignGlobalAttribute } from "./features/assert-foreign-global-attribute";
import { composeBlock } from "./features/composes-block";
import { constructBlock } from "./features/construct-block";
import { disallowDefinitionRules } from "./features/disallow-dfn-rules";
import { disallowImportant } from "./features/disallow-important";
import { discoverGuid } from "./features/discover-guid";
import { discoverName } from "./features/discover-name";
import { exportBlocks } from "./features/export-blocks";
import { extendBlock } from "./features/extend-block";
import { globalAttributes } from "./features/global-attributes";
import { implementBlock } from "./features/implement-block";
import { importBlocks } from "./features/import-blocks";
import { processDebugStatements } from "./features/process-debug-statements";
import { BlockFactory } from "./index";
import { Syntax } from "./preprocessing";
import { gen_guid } from "./utils/genGuid";

const debug = debugGenerator("css-blocks:BlockParser");

export interface ParsedSource {
  identifier: FileIdentifier;
  defaultName: string;
  originalSource: string;
  originalSyntax: Syntax;
  parseResult: postcss.Root;
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
    let root = source.parseResult;
    let block = await this.parse(root, source.identifier, source.defaultName);
    for (let dependency of source.dependencies) {
      block.addDependency(dependency);
    }
    return block;
  }

  public async parseDefinitionSource(root: postcss.Root, identifier: string, expectedId: string) {
    return await this.parse(root, identifier, undefined, true, expectedId);
  }

  /**
   * Main public interface of `BlockParser`. Given a PostCSS AST, returns a promise
   * for the new `Block` object.
   * @param root - PostCSS AST
   * @param sourceFile - Source file name
   * @param name - Name of block
   * @param isDfnFile - Whether the block being parsed is a definition file. Definition files are incomplete blocks
   *                    that will need to merge in rules from its Compiled CSS later. They are also expected to declare
   *                    additional properties that regular Blocks don't, such as `block-id` and `block-interface-index`.
   * @param expectedGuid - If a GUID is defined in the file, it's expected to match this value. This argument is only
   *                       relevant to definition files, where the definition file is linked to Compiled CSS and
   *                       both files may declare a GUID.
   */
  public async parse(root: postcss.Root, identifier: string, name?: string, isDfnFile = false, expectedGuid?: string): Promise<Block> {
    let importer = this.config.importer;
    let debugIdent = importer.debugIdentifier(identifier, this.config);
    let sourceFile = importer.filesystemPath(identifier, this.config) || debugIdent;
    let configuration = this.factory.configuration;
    debug(`Begin parse: "${debugIdent}"`);

    // Discover the block's preferred name.
    name = await discoverName(configuration, root, sourceFile, isDfnFile, name);

    // Discover the block's GUID, if it's a definition file.
    const guid = await discoverGuid(configuration, root, sourceFile, isDfnFile, expectedGuid) || gen_guid(identifier, configuration.guidAutogenCharacters);
    this.factory.registerGuid(guid, identifier);

    // Create our new Block object and save reference to the raw AST.
    let block = new Block(name, identifier, guid, root);

    if (isDfnFile) {
      // Rules only checked when parsing definition files...
      debug(" - Assert Block Class Declared");
      await assertBlockClassDeclared(block, configuration, root, sourceFile);
    } else {
      // If not a definition file, it shouldn't have rules that can
      // only be in definition files.
      debug(" - Disallow Definition-Only Declarations");
      await disallowDefinitionRules(block, configuration, root, sourceFile);
    }
    // Throw if we encounter any `!important` decls.
    debug(` - Disallow Important`);
    await disallowImportant(configuration, root, block, sourceFile);
    // Discover and parse all block references included by this block.
    debug(` - Import Blocks`);
    await importBlocks(block, this.factory, sourceFile);
    // Export all exported block references from this block.
    debug(` - Export Blocks`);
    await exportBlocks(block, this.factory, sourceFile);
    // Handle any global attributes defined by this block.
    debug(` - Global Attributes`);
    await globalAttributes(configuration, root, block, sourceFile);
    // Parse all block styles and build block tree.
    debug(` - Construct Block`);
    await constructBlock(configuration, root, block, debugIdent);
    // Verify that external blocks referenced have been imported, have defined the attribute being selected, and have marked it as a global state.
    debug(` - Assert Foreign Globals`);
    await assertForeignGlobalAttribute(configuration, root, block, debugIdent);
    // Construct block extensions and validate.
    debug(` - Extend Block`);
    await extendBlock(configuration, root, block, debugIdent);
    // Validate that all required Styles are implemented.
    debug(` - Implement Block`);
    await implementBlock(configuration, root, block, debugIdent);
    // Register all block compositions.
    await composeBlock(configuration, root, block, debugIdent);
    // Log any debug statements discovered.
    debug(` - Process Debugs`);
    await processDebugStatements(root, block, debugIdent, this.config);

    // Return our fully constructed block.
    debug(` - Complete`);

    return block;
  }

}

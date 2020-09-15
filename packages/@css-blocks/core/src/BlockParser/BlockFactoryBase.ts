import { ObjectDictionary, isString } from "@opticss/util";
import { LegacyRawSourceMap, adaptFromLegacySourceMap, parseSelector, postcss } from "opticss";
import { RawSourceMap } from "source-map";

import { Block } from "../BlockTree";
import { Styles } from "../BlockTree/Styles";
import { Options, ResolvedConfiguration, resolveConfiguration } from "../configuration";
import { CssBlockError } from "../errors";
import { ImportedCompiledCssFile, Importer } from "../importing";
import { upgradeDefinitionFileSyntax } from "../PrecompiledDefinitions/block-syntax-version";

import { ProcessedFile } from "./preprocessing";

/**
 * This factory ensures that instances of a block are re-used when blocks are
 * going to be compiled/optimized together. Multiple instances of the same
 * block will result in analysis and optimization bugs.
 *
 * This also ensures that importers and preprocessors are correctly used when loading a block file.
 */
export class BlockFactoryBase {
  postcssImpl: typeof postcss;
  importer: Importer;
  configuration: ResolvedConfiguration;
  blockNames: ObjectDictionary<string>;
  faultTolerant: boolean;

  private guids = new Set<string>();

  constructor(options: Options, postcssImpl = postcss, faultTolerant = false) {
    this.postcssImpl = postcssImpl;
    this.configuration = resolveConfiguration(options);
    this.importer = this.configuration.importer;
    this.blockNames = {};
    this.faultTolerant = faultTolerant;
  }

  /**
   * Toss out any caches in this BlockFactory. Any future requests for a block
   * or block path will be loaded fresh from persistent storage.
   */
  reset() {
    this.blockNames = {};
    this.guids.clear();
  }

  /**
   * Depending on whether the blockFactory is fault tolerant or not, it either
   * surfaces the errors or swallows them and reexports the block interface
   * @param block the block to check for errors
   */
  protected _surfaceBlockErrors(block: Block): Block {
    if (this.faultTolerant) {
      return block;
    } else {
      return block.assertValid();
    }
  }

  protected _prepareDefinitionASTs(file: ImportedCompiledCssFile) {
    // Update definition data to use latest block syntax.
    file = upgradeDefinitionFileSyntax(file);

    // NOTE: No need to run preprocessor - we assume that Compiled CSS has already been preprocessed.
    // Parse the definition file into an AST
    const definitionAst = this.postcssImpl.parse(file.definitionContents);
    const dfnDebugIdentifier = this.importer.debugIdentifier(file.definitionIdentifier, this.configuration);

    // Parse the CSS contents into an AST
    const cssContentsAst = this.postcssImpl.parse(file.cssContents);
    const cssDebugIdentifier = this.importer.debugIdentifier(file.identifier, this.configuration);

    // Sanity check! Did we actually get contents for both ASTs?
    if (!definitionAst || !definitionAst.nodes) {
      throw new CssBlockError(`Unable to parse definition file into AST!`, {
        filename: dfnDebugIdentifier,
      });
    }

    if (!cssContentsAst || !cssContentsAst.nodes) {
      throw new CssBlockError(`Unable to parse CSS contents into AST!`, {
        filename: cssDebugIdentifier,
      });
    }
    return { definitionAst, cssContentsAst };
  }

  /**
   * Merges the CSS rules from a Compiled CSS file into its associated block. The block
   * will have been created previously from parsing the definition file using BlockParser.
   * @param block - The block that was generated from a definition file.
   * @param cssContentsAst - The parsed AST generated from the CSS file's contents.
   * @param file - The CompiledCSSFile that this block and CSS file was parsed from.
   */
  protected _mergeCssRulesIntoDefinitionBlock(block: Block, cssContentsAst: postcss.Root, file: ImportedCompiledCssFile) {
    const styleNodesMap = block.presetClassesMap(true);
    cssContentsAst.walkRules(rule => {
      const parsedSelectors = parseSelector(rule);

      parsedSelectors.forEach(sel => {
        const keys = sel.key.nodes;
        const keyStyleNodes: Styles[] = [];
        let doProcess = true;

        // Check selector: do not process selectors with class names that
        // aren't from this block. (aka: resolution selectors)
        keys.forEach(key => {
          if (key.type === "class") {
            const foundStyleNode = styleNodesMap[key.value];
            if (!foundStyleNode) {
              doProcess = false;
              return;
            }
            keyStyleNodes.push(foundStyleNode);
          }
        });
        // If this node should be processed, add its declarations to each class
        // in the key selector (the last part of the selector).
        // We add the declarations so that later we can determine any conflicts
        // between the imported CSS and any app CSS that relies on it.
        if (doProcess) {
          keyStyleNodes.forEach(node => {
            node.rulesets.addRuleset(this.configuration, file.identifier, rule);
          });
        }
      });
    });
  }

  /**
   * Register a new block name with the BlockFactory.
   * @param name The new block name to register.
   * @param doNotOverride If true, will not attempt to provide a new block name if the given
   *                      name has already been registered.
   * @return The unique block name that is now registered with the BlockFactory, or null if
   *         the name has already been registered and should not be overridden.
   */
  getUniqueBlockName(name: string, identifier: string, doNotOverride = false): string | null {
    if (!this.blockNames[name]) {
      this.blockNames[name] = identifier;
      return name;
    }
    if (doNotOverride) {
      return null;
    }
    let i = 2;
    while (this.blockNames[`${name}-${i}`]) {
      i++;
    }
    name = `${name}-${i}`;
    this.blockNames[name] = identifier;
    return name;
  }

  /**
   * Registers a new GUID with the BlockFactory.
   * @param guid - The guid to register.
   * @param identifier  - A reference to the file this block was generated from, for error reporting.
   * @return True if registration is successful, false otherwise.
   */
  registerGuid(guid: string): boolean {
    if (this.guids.has(guid)) {
      return false;
    }
    this.guids.add(guid);
    return true;
  }
}

export function sourceMapFromProcessedFile(result: ProcessedFile): RawSourceMap | string | undefined {
  let sourceMap: LegacyRawSourceMap | RawSourceMap | string | undefined = result.sourceMap;
  if (!sourceMap && !isString(result.content) && result.content.map) {
    sourceMap = result.content.map.toJSON();
  }
  if (typeof sourceMap === "object") {
    return adaptFromLegacySourceMap(sourceMap);
  } else {
    return sourceMap;
  }
}

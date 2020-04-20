import { postcss } from "opticss";

import { BlockCompiler } from "../../src/BlockCompiler";
import { BlockFactory } from "../../src/BlockParser";
import { Configuration, OutputMode } from "../../src/configuration";
import { Options, ResolvedConfiguration, resolveConfiguration } from "../../src/configuration";
import * as errors from "../../src/errors";

/**
 * CSS Blocks PostCSS plugin.
 */
class Plugin {
  private config: ResolvedConfiguration;
  private postcss: typeof postcss;

  /**
   * @param  postcssImpl  PostCSS instance to use
   * @param  opts  Optional plugin config options
   */
  constructor(postcssImpl: typeof postcss, opts?: Options) {
    this.config = resolveConfiguration(opts);
    this.postcss = postcssImpl;
  }

  /**
   * Main processing entry point for PostCSS Plugin
   * @param  root  PostCSS AST
   * @param  result  Provides the result of the PostCSS transformations
   */
  public async process(root: postcss.Root, result: postcss.Result) {

    // Fetch the CSS source file path. Throw if not present.
    let sourceFile: string;
    if (result && result.opts && result.opts.from) {
      sourceFile = result.opts.from;
    } else {
      throw new errors.MissingSourcePath();
    }

    // Fetch block name from importer
    let identifier = this.config.importer.identifier(null, sourceFile, this.config);
    let defaultName: string = this.config.importer.defaultName(identifier, this.config);
    let factory = new BlockFactory(this.config, this.postcss);

    await factory.parseRoot(root, sourceFile, defaultName).then((block) => {
      let compiler = new BlockCompiler(postcss, this.config);
      compiler.compile(block, root, new Set());
    });
  }
}

// This is ugly but it's the only thing I have been able to make work.
// I welcome a patch that cleans this up.

type temp = {
  (postcssImpl: typeof postcss): (config?: Partial<Readonly<Configuration>>) => postcss.Plugin<Partial<Readonly<Configuration>>>;
  OutputMode: typeof OutputMode;
  CssBlockError: typeof errors.CssBlockError;
  InvalidBlockSyntax: typeof errors.InvalidBlockSyntax;
  MissingSourcePath: typeof errors.MissingSourcePath;
};

function makeApi(): temp {
  let cssBlocks: temp;
  cssBlocks = <temp>function(postcssImpl: typeof postcss) {
    return (config?: Partial<Readonly<Configuration>>) => {
      let plugin = new Plugin(postcssImpl, config);
      return plugin.process.bind(plugin);
    };
  };
  cssBlocks.OutputMode = OutputMode;
  cssBlocks.CssBlockError = errors.CssBlockError;
  cssBlocks.InvalidBlockSyntax = errors.InvalidBlockSyntax;
  cssBlocks.MissingSourcePath = errors.MissingSourcePath;
  return cssBlocks;
}

export = makeApi();

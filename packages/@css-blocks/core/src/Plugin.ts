import { postcss } from "opticss";

import { BlockCompiler } from "./BlockCompiler";
import { BlockFactory } from "./BlockParser";
import { Options, resolveConfiguration, ResolvedConfiguration } from "./configuration";
import * as errors from "./errors";

/**
 * CSS Blocks PostCSS plugin.
 */
export class Plugin {
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
   * Main processing entrypoint for PostCSS Plugin
   * @param  root  PostCSS AST
   * @param  result  Provides the result of the PostCSS transformations
   */
  public process(root: postcss.Root, result: postcss.Result) {

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

    return factory.parse(root, sourceFile, defaultName).then((block) => {
      let compiler = new BlockCompiler(postcss, this.config);
      compiler.compile(block, root);
    });
  }

}

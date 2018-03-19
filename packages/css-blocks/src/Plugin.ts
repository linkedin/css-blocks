import * as postcss from "postcss";

import { BlockCompiler } from "./BlockCompiler";
import { BlockFactory } from "./BlockParser";
import * as errors from "./errors";
import { normalizeOptions } from "./normalizeOptions";
import { ReadonlyOptions, SparseOptions } from "./options";
export { SparseOptions } from "./options";

/**
 * CSS Blocks PostCSS plugin.
 */
export class Plugin {
  private opts: ReadonlyOptions;
  private postcss: typeof postcss;

  /**
   * @param  postcssImpl  PostCSS instance to use
   * @param  opts  Optional plugin config options
   */
  constructor(postcssImpl: typeof postcss, opts?: SparseOptions) {
    this.opts = normalizeOptions(opts);
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
    let identifier = this.opts.importer.identifier(null, sourceFile, this.opts);
    let defaultName: string = this.opts.importer.defaultName(identifier, this.opts);
    let factory = new BlockFactory(this.opts, this.postcss);

    return factory.parse(root, sourceFile, defaultName).then((block) => {
      let compiler = new BlockCompiler(postcss, this.opts);
      compiler.compile(block, root);
    });
  }

}

import * as postcss from "postcss";
import { PluginOptions, OptionsReader } from "./options";
import { BlockFactory } from "./Block/BlockFactory";
import BlockParser from "./BlockParser";
import BlockCompiler from "./BlockCompiler";
import * as errors from "./errors";
export { PluginOptions } from "./options";

/**
 * CSS Blocks PostCSS plugin.
 */
export class Plugin {
  private opts: OptionsReader;
  private postcss: typeof postcss;

  /**
   * @param	postcssImpl	PostCSS instance to use
   * @param	opts	Optional plugin config options
   */
  constructor(postcssImpl: typeof postcss, opts?: PluginOptions) {
    this.opts = new OptionsReader(opts);
    this.postcss = postcssImpl;
  }

  /**
   * Main processing entrypoint for PostCSS Plugin
   * @param	root	PostCSS AST
   * @param	result	Provides the result of the PostCSS transformations
   */
  public process(root: postcss.Root, result: postcss.Result) {

    // Fetch the CSS source file path. Throw if not present.
    let sourceFile: string;
    if (result && result.opts && result.opts.from) {
      sourceFile = result.opts.from;
    } else {
      throw new errors.MissingSourcePath();
    }

    let factory = this.opts.factory || new BlockFactory(this.opts, this.postcss);
    // Fetch block name from importer
    let identifier = this.opts.importer.identifier(null, sourceFile, this.opts);
    let defaultName: string = this.opts.importer.defaultName(identifier, this.opts);
    let blockParser = new BlockParser(this.postcss, this.opts, factory);

    return blockParser.parse(root, sourceFile, defaultName).then((block) => {
      let compiler = new BlockCompiler(postcss, this.opts);
      compiler.compile(block, root);
    });
  }

}

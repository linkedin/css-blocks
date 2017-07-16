import * as postcss from "postcss";
import { PluginOptions, OptionsReader } from "./options";
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

    // Fetch block name from importer
    let defaultName: string = this.opts.importer.getDefaultName(sourceFile, this.opts);
    let blockParser = new BlockParser(this.postcss, this.opts);

    return blockParser.parse(root, sourceFile, defaultName).then((block) => {
      let compiler = new BlockCompiler(postcss, this.opts);
      compiler.compile(block, root);
    });
  }

}

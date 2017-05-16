import * as postcss from "postcss";
import { PluginOptions, OptionsReader } from "./options";
import { MergedObjectMap } from "./Block";
import BlockParser from "./BlockParser";
import ConflictResolver from "./ConflictResolver";
import * as errors from "./errors";
export { PluginOptions } from "./options";

export class Plugin {
  private opts: OptionsReader;
  private postcss: typeof postcss;

  constructor(postcssImpl: typeof postcss, opts?: PluginOptions) {
    this.opts = new OptionsReader(opts);
    this.postcss = postcssImpl;
  }

  public process(root, result) {
    let sourceFile;
    if (result && result.opts && result.opts.from) {
      sourceFile = result.opts.from;
    } else {
      throw new errors.MissingSourcePath();
    }
    let defaultName: string = this.opts.importer.getDefaultName(sourceFile);
    let resolver = new ConflictResolver(this.opts);
    let blockParser = new BlockParser(this.postcss, this.opts);

    return blockParser.parse(root, sourceFile, defaultName, true).then((block) => {
      resolver.resolve(root, block);
      if (this.opts.interoperableCSS) {
        this.injectExports(root, block);
      }
      blockParser.processDebugStatements(sourceFile, root, block);
    });
  }

  private injectExports(root, block) {
    let exportsRule = this.postcss.rule({selector: ":export"});
    root.prepend(exportsRule);
    let objsMap: MergedObjectMap = block.merged();
    Object.keys(objsMap).forEach((name) => {
      let objs = objsMap[name];
      exportsRule.append(this.postcss.decl({
        prop: objs[0].localName(),
        value: objs.map(obj => obj.cssClass(this.opts)).join(" ")
      }));
    });
  }
}
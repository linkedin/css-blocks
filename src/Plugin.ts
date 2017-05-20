import * as postcss from "postcss";
import { PluginOptions, OptionsReader } from "./options";
import { MergedObjectMap, Block } from "./Block";
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

  public process(root: postcss.Root, result: postcss.Result) {
    let sourceFile: string;
    if (result && result.opts && result.opts.from) {
      sourceFile = result.opts.from;
    } else {
      throw new errors.MissingSourcePath();
    }
    let defaultName: string = this.opts.importer.getDefaultName(sourceFile);
    let resolver = new ConflictResolver(this.opts);
    let blockParser = new BlockParser(this.postcss, this.opts);

    return blockParser.parse(root, sourceFile, defaultName).then((block) => {
      root.walkAtRules("block-reference", (atRule) => {
        atRule.remove();
      });
      root.walkRules(/\.root/, (rule) => {
        rule.walkDecls(/^(extends|implements)$/, (decl) => {
          decl.remove();
        });
      });
      root.walkRules((rule) => {
        let parsedSelectors = block.getParsedSelectors(rule);
        rule.selector = parsedSelectors.map(s => block.rewriteSelectorToString(s, this.opts)).join(",\n");
      });

      resolver.resolve(root, block);
      if (this.opts.interoperableCSS) {
        this.injectExports(root, block);
      }
      blockParser.processDebugStatements(sourceFile, root, block);
    });
  }

  private injectExports(root: postcss.Root, block: Block) {
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
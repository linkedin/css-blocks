import * as postcss from "postcss";
import * as errors from "./errors";
import { PluginOptions } from "./options";
import { OptionsReader } from "./OptionsReader";
import { sourceLocation } from "./SourceLocation";
import { MergedObjectMap, Block } from "./Block";
import ConflictResolver from "./ConflictResolver";
import { StyleAnalysis } from "./TemplateAnalysis/StyleAnalysis";
/**
 * Compiler that, given a Block will return a transformed AST
 * interface is `BlockParser.parse`.
 */
export default class BlockCompiler {
  private opts: OptionsReader;
  private postcss: typeof postcss;

  constructor(postcssImpl: typeof postcss, opts?: PluginOptions) {
    this.opts = new OptionsReader(opts);
    this.postcss = postcssImpl;
  }

  compile(block: Block, root: postcss.Root, analysis?: StyleAnalysis): postcss.Root {
      if (analysis) {
        // console.log("Got an analysis for compilation. I should use it probably.", analysis);
      }
      let resolver = new ConflictResolver(this.opts);
      let filename = this.opts.importer.inspect(block.identifier, this.opts);
      // Process all debug statements for this block.
      this.processDebugStatements(filename, root, block);

      // Clean up CSS Block specific properties.
      root.walkAtRules("block-reference", (atRule) => {
        atRule.remove();
      });
      root.walkRules(/\.root/, (rule) => {
        rule.walkDecls(/^(extends|implements|block-name)$/, (decl) => {
          decl.remove();
        });
        if (rule.nodes === undefined || rule.nodes.length === 0) {
          rule.remove();
        }
      });

      // Resolve inheritance based conflicts
      resolver.resolveInheritance(root, block);
      root.walkRules((rule) => {
        let parsedSelectors = block.getParsedSelectors(rule);
        rule.selector = parsedSelectors.map(s => block.rewriteSelectorToString(s, this.opts)).join(",\n");
      });
      resolver.resolve(root, block);

      if (this.opts.interoperableCSS) {
        this.injectExports(root, block);
      }
      return root;
  }

  /**
   * Process all `@block-debug` statements, output debug statement to console or in comment as requested.
   * @param sourceFile File name of block in question.
   * @param root PostCSS Root for block.
   * @param block Block to resolve references for
   */
  public processDebugStatements(sourceFile: string, root: postcss.Root, block: Block) {
    root.walkAtRules("block-debug", (atRule) => {
      let md = atRule.params.match(/([^\s]+) to (comment|stderr|stdout)/);
      if (!md) {
        throw new errors.InvalidBlockSyntax(
          `Malformed block debug: \`@block-debug ${atRule.params}\``,
          sourceLocation(sourceFile, atRule));
      }
      let localName = md[1];
      let outputTo = md[2];
      let ref: Block | null = block.getReferencedBlock(localName);
      if (!ref && (localName === "self" || localName === block.name)) {
        ref = block;
      }
      if (!ref) {
        throw new errors.InvalidBlockSyntax(
          `No block named ${localName} exists in this context.`,
          sourceLocation(sourceFile, atRule));
      }
      let debugStr = ref.debug(this.opts);
      if (outputTo === "comment") {
        atRule.replaceWith(this.postcss.comment({text: debugStr.join("\n   ")}));
      } else {
        if (outputTo === "stderr") {
          console.warn(debugStr.join("\n"));
        } else {
          console.log(debugStr.join("\n"));
        }
        atRule.remove();
      }
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

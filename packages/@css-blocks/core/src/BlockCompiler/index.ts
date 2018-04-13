import { TemplateTypes } from "@opticss/template-api";
import { postcss } from "opticss";

import { Analyzer } from "../Analyzer";
import {
  BLOCK_DEBUG,
  BLOCK_PROP_NAMES_RE,
  BLOCK_REFERENCE,
  ROOT_CLASS,
  parseBlockDebug,
} from "../BlockSyntax";
import { Block } from "../BlockTree";
import {
  Options,
  ResolvedConfiguration,
  resolveConfiguration,
} from "../configuration";

import { ConflictResolver } from "./ConflictResolver";
/**
 * Compiler that, given a Block will return a transformed AST
 * interface is `BlockParser.parse`.
 */
export class BlockCompiler {
  private config: ResolvedConfiguration;
  private postcss: typeof postcss;

  constructor(postcssImpl: typeof postcss, opts?: Options) {
    this.config = resolveConfiguration(opts);
    this.postcss = postcssImpl;
  }

  compile(block: Block, root: postcss.Root, analyzer?: Analyzer<keyof TemplateTypes>): postcss.Root {

    let resolver = new ConflictResolver(this.config);
    let filename = this.config.importer.debugIdentifier(block.identifier, this.config);

    if (analyzer) { /* Do something smart with the Analyzer here */ }

    // Process all debug statements for this block.
    this.processDebugStatements(filename, root, block);

    // Clean up CSS Block specific properties.
    root.walkAtRules(BLOCK_REFERENCE, (atRule) => {
      atRule.remove();
    });
    root.walkRules(ROOT_CLASS, (rule) => {
      rule.walkDecls(BLOCK_PROP_NAMES_RE, (decl) => {
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
      rule.selector = parsedSelectors.map(s => block.rewriteSelectorToString(s, this.config)).join(",\n");
    });

    resolver.resolve(root, block);

    return root;
  }

  /**
   * Process all `@block-debug` statements, output debug statement to console or in comment as requested.
   * @param sourceFile File name of block in question.
   * @param root PostCSS Root for block.
   * @param block Block to resolve references for
   */
  public processDebugStatements(sourceFile: string, root: postcss.Root, block: Block) {
    root.walkAtRules(BLOCK_DEBUG, (atRule) => {
      let {block: ref, channel} = parseBlockDebug(atRule, sourceFile, block);
      if (channel === "comment") {
        let debugStr = ref.debug(this.config);
        atRule.replaceWith(this.postcss.comment({text: debugStr.join("\n   ")}));
      } else {
        // stderr/stdout are emitted during parse.
        atRule.remove();
      }
    });
  }
}

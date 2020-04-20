import { postcss } from "opticss";

import {
  BLOCK_ALIAS,
  BLOCK_AT_RULES,
  BLOCK_DEBUG,
  BLOCK_PROP_NAMES_RE,
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

  compile(block: Block, root: postcss.Root, reservedClassNames: Set<string>): postcss.Root {
    let resolver = new ConflictResolver(this.config, reservedClassNames);
    let filename = this.config.importer.debugIdentifier(block.identifier, this.config);

    // Process all debug statements for this block.
    this.processDebugStatements(filename, root, block);

    // Clean up CSS Block specific at-rules.
    for (let atRuleName of BLOCK_AT_RULES) {
      root.walkAtRules(atRuleName, (atRule) => atRule.remove());
    }

    root.walkRules(ROOT_CLASS, (rule) => {
      rule.walkDecls(BLOCK_PROP_NAMES_RE, (decl) => {
        decl.remove();
      });
      if (rule.nodes === undefined || rule.nodes.length === 0) {
        rule.remove();
      }
    });

    // Clean up block aliases across all styles (the above only cleans the root).
    root.walkDecls(BLOCK_ALIAS, (decl) => decl.remove());

    // Resolve inheritance based conflicts
    resolver.resolveInheritance(root, block);
    root.walkRules((rule) => {
      let parsedSelectors = block.getParsedSelectors(rule);
      rule.selector = parsedSelectors.map(s => block.rewriteSelectorToString(s, this.config, reservedClassNames)).join(",\n");
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
      let {block: ref, channel} = parseBlockDebug(this.config, root, atRule, sourceFile, block);
      if (channel === "comment") {
        let text = `${ref.debug(this.config).join("\n * ")}\n`;
        atRule.replaceWith(this.postcss.comment({ text }));
      }
    });
  }
}

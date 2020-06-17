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

import { BlockDefinitionCompiler, INLINE_DEFINITION_FILE } from "./BlockDefinitionCompiler";
import { ConflictResolver } from "./ConflictResolver";

export { INLINE_DEFINITION_FILE } from "./BlockDefinitionCompiler";

export interface CompiledBlockAndDefinition {
  definitionPath: string;
  css: postcss.Root;
  definition: postcss.Root;
}

export interface CompiledBlockAndInlineDefinition {
  definitionPath: typeof INLINE_DEFINITION_FILE;
  css: postcss.Root;
}

/**
 * Compiler that, given a Block will return a transformed AST
 * interface is `BlockParser.parse`.
 */
export class BlockCompiler {
  private config: ResolvedConfiguration;
  private postcss: typeof postcss;
  private definitionCompiler?: BlockDefinitionCompiler;

  constructor(postcssImpl: typeof postcss, opts?: Options) {
    this.config = resolveConfiguration(opts);
    this.postcss = postcssImpl;
  }

  setDefinitionCompiler(definitionCompiler: BlockDefinitionCompiler) {
    this.definitionCompiler = definitionCompiler;
  }

  /**
   * Compiles the block and also produces a corresponding block definition file.
   *
   * Note: the definition file is not actually written to any path; it is the
   * responsibility of the caller to write the files to locations that allow
   * definition file to be found at the path specified.
   * @param definitionPath A relative path to the definition file from the block file. Pass the symbol INLINE_DEFINITION_FILE if you want the definition file to be inserted into the definition file.
   */
  compileWithDefinition(block: Block, root: postcss.Root, reservedClassNames: Set<string>, definitionPath: typeof INLINE_DEFINITION_FILE): CompiledBlockAndInlineDefinition;
  compileWithDefinition(block: Block, root: postcss.Root, reservedClassNames: Set<string>, definitionPath: string): CompiledBlockAndDefinition;
  compileWithDefinition(block: Block, root: postcss.Root, reservedClassNames: Set<string>, definitionPath: string | typeof INLINE_DEFINITION_FILE): CompiledBlockAndDefinition | CompiledBlockAndInlineDefinition {
    if (!this.definitionCompiler) {
      throw new Error("No block definition compiler was provided.");
    }
    let css = this.compile(block, root, reservedClassNames);
    let definition = this.definitionCompiler.compile(block, reservedClassNames);
    let result: CompiledBlockAndDefinition | CompiledBlockAndInlineDefinition;

    if (definitionPath === INLINE_DEFINITION_FILE) {
      this.definitionCompiler.insertInlineBlockDefinitionURLComment(css, definition);
      result = {
        definitionPath,
        css,
      };
    } else {
      this.definitionCompiler.insertBlockDefinitionURLComment(css, definitionPath);
      result = {
        definitionPath,
        css,
        definition,
      };
    }

    let startComment = postcss.comment({text: `#css-blocks ${block.guid}`});
    startComment.raws.after = "\n";
    css.prepend(startComment);

    let endComment = postcss.comment({text: `#css-blocks end`});
    endComment.raws.after = "\n";
    css.append(endComment);

    return result;
  }

  /**
   * Compile the block to a postcss AST by walking the postcss AST from parsing
   * and removing/replacing the css blocks' specific syntax with standard CSS.
   */
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

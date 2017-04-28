import * as postcss from "postcss";
import * as path from "path";
import * as selectorParser from "postcss-selector-parser";
import { PluginOptions, OptionsReader } from "./options";
import { Block, StateInfo } from "./Block";
export { PluginOptions } from "./options";
import * as errors from "./errors";

// This fixes an annoying interop issue because of how postcss-selector-parser exports.
const selectorParserFn = require("postcss-selector-parser");

enum BlockTypes {
  block = 1,
  state,
  element
}

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
    try {
      let block = new Block(path.parse(sourceFile).name);
      root.walkRules((rule) => {
        rule.walkDecls((decl) => {
          if (decl.important) {
            throw new errors.InvalidBlockSyntax(
              `!important is not allowed for \`${decl.prop}\` in \`${rule.selector}\``,
              this.selectorSourceLocation(rule, decl));
          }
        });
        let selector =  selectorParserFn().process(rule.selector).res;
        selector.nodes.forEach((sel) => { this.assertValidCombinators(rule, sel); });
        // mutation can't be done inside the walk despite what the docs say
        let replacements: any[] = [];
        selector.walk((s) => {
          if (s.type === selectorParser.PSEUDO && s.value === ":block") {
            replacements.push([s, selectorParser.className({value: block.cssClass(this.opts)})]);
          }
          else if (s.type === selectorParser.PSEUDO && s.value === ":state") {
            let state = block.ensureState(this.stateParser(rule, s));
            replacements.push([s, selectorParser.className({value: state.cssClass(this.opts)})]);
          }
          else if (s.type === selectorParser.CLASS) {
            let element = block.ensureElement(s.value);
            replacements.push([s, selectorParser.className({value: element.cssClass(this.opts)})]);
          }
        });
        replacements.forEach((pair) => {
          let existing = pair[0];
          let replacement = pair[1];
          existing.replaceWith(replacement);
        });
        rule.selector = selector.toString();
      });
    } catch (e) {
      if (e instanceof errors.CssBlockError && e.location && sourceFile) {
        let loc: errors.SourceLocation = e.location;
        loc.filename = sourceFile;
        e.location = loc;
      }
      throw e;
    }
  }

  addSourceLocations(...locations: errors.SourceLocation[]) {
    return locations.reduce((l, o) => {
      if (o.line === 1) {
        return {
          line: l.line,
          column: l.column + o.column - 1
        };
      } else {
        return {
          line: l.line + o.line - 1,
          column: o.column
        };
      }
    });
  }

  selectorSourceLocation(rule, selector): errors.SourceLocation | void {
    if (rule.source && rule.source.start && selector.source && selector.source.start) {
      return this.addSourceLocations(rule.source.start, selector.source.start);
    }
  }

  private stateParser(rule, pseudo): StateInfo {
    if (pseudo.nodes.length === 0) {
      // Empty state name or missing parens
      throw new errors.InvalidBlockSyntax(`:state name is missing`,
                                       this.selectorSourceLocation(rule, pseudo));
    }
    if (pseudo.nodes.length !== 1) {
      // I think this is if they have a comma in their :state like :state(foo, bar)
      throw new errors.InvalidBlockSyntax(`Invalid state declaration: ${pseudo}`,
                                       this.selectorSourceLocation(rule, pseudo));
    }

    switch(pseudo.nodes[0].nodes.length) {
      case 3:
        return {
          group: pseudo.nodes[0].nodes[0].value.trim(),
          name: pseudo.nodes[0].nodes[2].value.trim()
        };
      case 1:
        return {
          name: pseudo.nodes[0].nodes[0].value.trim()
        };
      default:
        // too many state names
        throw new errors.InvalidBlockSyntax(`Invalid state declaration: ${pseudo}`,
                                         this.selectorSourceLocation(rule, pseudo));
    }
  }

  assertValidCombinators(rule, selector) {
    let states = new Set<string>();
    let classes = new Set<string>();
    let combinators = new Set<string>();
    let lastType: BlockTypes | null = null;
    let thisType: BlockTypes | null = null;
    selector.each((s) => {
      if (s.type === selectorParser.PSEUDO && s.value === ":block") {
        thisType = BlockTypes.block;
      } else if (s.type === selectorParser.PSEUDO && s.value === ":state") {
        thisType = BlockTypes.state;
        let info = this.stateParser(rule, s);
        if (info.group) {
          states.add(`${info.group} ${info.name}`);
        } else {
          states.add(info.name);
        }
      } else if (s.type === selectorParser.CLASS) {
        thisType = BlockTypes.element;
        classes.add(s.value);
      } else if (s.type === selectorParser.COMBINATOR) {
        thisType = null;
        combinators.add(s.value);
      }
      if (thisType && lastType && lastType !== thisType) {
        if ((lastType === BlockTypes.block && thisType === BlockTypes.state) ||
            (thisType === BlockTypes.block && lastType === BlockTypes.state)) {
          throw new errors.InvalidBlockSyntax(
            `It's redundant to specify state with block: ${rule.selector}`,
            this.selectorSourceLocation(rule, selector.nodes[0]));
        }
        throw new errors.InvalidBlockSyntax(
          `Cannot have ${BlockTypes[lastType]} and ${BlockTypes[thisType]} on the same DOM element: ${rule.selector}`,
          this.selectorSourceLocation(rule, selector.nodes[0]));
      }
      lastType = thisType;
    });
    if (combinators.size > 0 && states.size > 1) {
      throw new errors.InvalidBlockSyntax(`Distinct states cannot be combined: ${rule.selector}`,
                                         this.selectorSourceLocation(rule, selector.nodes[0]));
    }
    if (classes.size > 1) {
      throw new errors.InvalidBlockSyntax(`Distinct elements cannot be combined: ${rule.selector}`,
                                         this.selectorSourceLocation(rule, selector.nodes[0]));
    }
  }
}

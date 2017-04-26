import * as postcss from "postcss";
import * as path from "path";
import * as selectorParser from "postcss-selector-parser";

// This fixes an annoying interop issue because of how postcss-selector-parser exports.
const selectorParserFn = require("postcss-selector-parser");

function cssBlocks(postcssImpl: typeof postcss) {
  return postcssImpl.plugin("css-blocks", (pluginOptions: cssBlocks.PluginOptions) => {
    let opts = new OptionsReader(pluginOptions);
    return (root, result) => {
      let sourceFile;
      if (result && result.opts && result.opts.from) {
        sourceFile = result.opts.from;
      } else {
        throw new cssBlocks.MissingSourcePath();
      }
      try {
        let block = new Block(path.parse(sourceFile).name);
        root.walkRules((rule) => {
          let selector =  selectorParserFn().process(rule.selector).res;
          selector.nodes.forEach((sel) => { assertValidCombinators(rule, sel); });
          let replacements: any[] = [];
          selector.walkPseudos((pseudo) => {
            if (pseudo.value === ":block") {
              replacements.push([pseudo, selectorParser.className({value: block.cssClass(opts)})]);
            }
            else if (pseudo.value === ":state") {
              // mutation can't be done inside the walk despite what the docs say
              let state = block.ensureState(stateParser(rule, pseudo));
              replacements.push([pseudo, selectorParser.className({value: state.cssClass(opts)})]);
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
        if (e instanceof cssBlocks.CssBlockError && e.location && sourceFile) {
          let loc: cssBlocks.SourceLocation = e.location;
          loc.filename = sourceFile;
          e.location = loc;
        }
        throw e;
      }
    };
  });
}

namespace cssBlocks {
  export enum OutputMode {
    BEM = 1
  }

  export interface PluginOptions {
    readonly outputMode: OutputMode;
  }

  export interface SourceLocation {
    filename?: string;
    line: number;
    column: number;
  }

  export class CssBlockError extends Error {
    origMessage: string;
    _location?: SourceLocation | void;

    constructor(message, location?: SourceLocation | void) {
      super(message);
      this.origMessage = message;
      this.location = location;
    }

    private annotatedMessage() {
      let loc = this.location;
      if (loc) {
        if (loc.filename) {
          return `${this.origMessage} (${loc.filename}:${loc.line}:${loc.column})`;
        } else {
          return `${this.origMessage} (:${loc.line}:${loc.column})`;
        }
      } else {
        return this.origMessage;
      }
    }

    get location(): SourceLocation | void {
      return this._location;
    }

    set location(location: SourceLocation | void) {
      this._location = location;
      super.message = this.annotatedMessage();
    }

  }

  export class MissingSourcePath extends CssBlockError {
    constructor() {
      super("PostCSS `from` option is missing." +
        " The source filename is required for CSS Blocks to work correctly.");
    }
  }

  export class InvalidBlockSyntax extends CssBlockError {
    constructor(message, location: SourceLocation | void) {
      super(message, location);
    }
  }
}

class OptionsReader implements cssBlocks.PluginOptions {
  private _outputMode: cssBlocks.OutputMode;

  constructor(opts: cssBlocks.PluginOptions) {
    this._outputMode = opts.outputMode || cssBlocks.OutputMode.BEM;
  }

  get outputMode() {
    return this._outputMode;
  }
  get outputModeName(): string {
    return cssBlocks.OutputMode[this.outputMode];
  }
}

interface StateMap {
  [stateName: string]: State;
}

interface ExclusiveStateGroupMap {
  [groupName: string]: ExclusiveStateGroup;
}

class Block {
  private _name: string;
  private _exclusiveStateGroups: ExclusiveStateGroupMap = {};
  private _states: StateMap = {};

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  cssClass(opts: OptionsReader) {
    switch(opts.outputMode) {
      case cssBlocks.OutputMode.BEM:
        return this.name;
      default:
        throw "this never happens";
    }
  }

  addState(state: State): void {
    this._states[state.name] = state;
  }

  addExclusiveStateGroup(group: ExclusiveStateGroup): void {
    this._exclusiveStateGroups[group.name] = group;
  }

  ensureState(info: StateInfo): State {
    let state: State;
    let group: ExclusiveStateGroup;
    if (info.group) {
      group = this._exclusiveStateGroups[info.group] || new ExclusiveStateGroup(info.group, this);
      state = new State(info.name, group);
    } else {
      state = this._states[info.name] || new State(info.name, this);
    }
    return state;
  }
}

class ExclusiveStateGroup {
  private _name: string;
  private _block: Block;
  private _states: StateMap = {};

  constructor(name: string, block: Block) {
    this._block = block;
    this._name = name;
  }

  get block() {
    return this._block;
  }

  get name() {
    return this.name;
  }

  addState(state: State): void {
    this._states[state.name] = state;
  }
}

interface StateInfo {
  group?: string;
  name: string;
}

class State {
  private _block: Block;
  private _group: ExclusiveStateGroup | void;
  private _name: string;

  constructor(name: string, blockOrGroup: Block | ExclusiveStateGroup) {
    if (blockOrGroup instanceof Block) {
      this._block = blockOrGroup;
      this._name = name;
      this._block.addState(this);
    } else {
      this._group = blockOrGroup;
      this._block = blockOrGroup.block;
      this._name = name;
      this._group.addState(this);
    }
  }

  get block() {
    return this._block;
  }

  get group() {
    return this._group;
  }

  get name() {
    return this._name;
  }

  cssClass(opts: OptionsReader) {
    switch(opts.outputMode) {
      case cssBlocks.OutputMode.BEM:
        return `${this.block.cssClass(opts)}--${this.name}`;
      default:
        throw "this never happens";
    }
  }

}

function addSourceLocations(...locations: cssBlocks.SourceLocation[]) {
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

function selectorSourceLocation(rule, selector): cssBlocks.SourceLocation | void {
  if (rule.source && rule.source.start && selector.source && selector.source.start) {
    return addSourceLocations(rule.source.start, selector.source.start);
  }
}

function stateParser(rule, pseudo): StateInfo {
  if (pseudo.nodes.length === 0) {
    // Empty state name or missing parens
    throw new cssBlocks.InvalidBlockSyntax(`:state name is missing`,
                                     selectorSourceLocation(rule, pseudo));
  }
  if (pseudo.nodes.length !== 1) {
    // I think this is if they have a comma in their :state like :state(foo, bar)
    throw new cssBlocks.InvalidBlockSyntax(`Invalid state declaration: ${pseudo}`,
                                     selectorSourceLocation(rule, pseudo));
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
      throw new cssBlocks.InvalidBlockSyntax(`Invalid state declaration: ${pseudo}`,
                                       selectorSourceLocation(rule, pseudo));
  }
}

function assertValidCombinators(rule, selector) {
  let states = new Set<string>();
  let combinators = new Set<string>();
  selector.each((s) => {
    if (s.type === selectorParser.PSEUDO && s.value === ":state") {
      let info = stateParser(rule, s);
      if (info.group) {
        states.add(`${info.group} ${info.name}`);
      } else {
        states.add(info.name);
      }
    } else if (s.type === selectorParser.COMBINATOR) {
      combinators.add(s.value);
    }
    return true;
  });
  if (combinators.size > 0 && states.size > 1) {
    throw new cssBlocks.InvalidBlockSyntax(`Distinct states cannot be combined: ${rule.selector}`,
                                       selectorSourceLocation(rule, selector.nodes[0]));
  }
}

export = cssBlocks;

import * as postcss from "postcss";
import * as path from "path";
import * as selectorParser from "postcss-selector-parser";

export namespace api {

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

class OptionsReader implements api.PluginOptions {
  private _outputMode: api.OutputMode;

  constructor(opts: api.PluginOptions) {
    this._outputMode = opts.outputMode || api.OutputMode.BEM;
  }

  get outputMode() {
    return this._outputMode;
  }
  get outputModeName(): string {
    return api.OutputMode[this.outputMode];
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
      case api.OutputMode.BEM:
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

  ensureState(name: string, groupName?: string): State {
    let state: State;
    let group: ExclusiveStateGroup;
    if (groupName) {
      group = this._exclusiveStateGroups[groupName] || new ExclusiveStateGroup(groupName, this);
      state = new State(name, group);
    } else {
      state = this._states[name] || new State(name, this);
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
      case api.OutputMode.BEM:
        return `${this.block.cssClass(opts)}--${this.name}`;
      default:
        throw "this never happens";
    }
  }

}


function addSourceLocations(...locations: api.SourceLocation[]) {
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

function selectorSourceLocation(rule, selector): api.SourceLocation | void {
  if (rule.source && rule.source.start && selector.source && selector.source.start) {
    return addSourceLocations(rule.source.start, selector.source.start);
  }
}

export default function initializer(postcssImpl: typeof postcss) {
  return postcssImpl.plugin("css-blocks", (pluginOptions: api.PluginOptions) => {
    let opts = new OptionsReader(pluginOptions);
    return (root, result) => {
      let sourceFile;
      if (result && result.opts && result.opts.from) {
        sourceFile = result.opts.from;
      } else {
        throw new api.MissingSourcePath();
      }
      try {
        let block = new Block(path.parse(sourceFile).name);
        root.walkRules((rule) => {
          let selector =  selectorParser().process(rule.selector).res;
          selector.walkPseudos((pseudo) => {
            if (pseudo.value === ":block") {
              pseudo.replaceWith(selectorParser.className({value: block.cssClass(opts)}));
            }
            else if (pseudo.value === ":state") {
              let stateName
              try {
                stateName = pseudo.nodes[0].nodes[0].value;
              } catch (e) {
                let errorLocation = selectorSourceLocation(rule, pseudo);
                throw new api.InvalidBlockSyntax(`Invalid :state declaration: ${pseudo}`, errorLocation);
              }
              let state = block.ensureState(stateName);
              pseudo.replaceWith(selectorParser.className({value: state.cssClass(opts)}));
            }
          });
          rule.selector = selector.toString();
        });
      } catch (e) {
        if (e instanceof api.CssBlockError && e.location && sourceFile) {
          let loc: api.SourceLocation = e.location;
          loc.filename = sourceFile;
          e.location = loc;
        }
        throw e;
      }
    }
  });
}

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

  export class CssBlockError extends Error {
  }

  export class MissingSourcePath extends CssBlockError {
    constructor() {
      super("PostCSS `from` option is missing." +
            " The source filename is required for CSS Blocks to work correctly.");
    }
  }

  export class InvalidBlockSyntax extends CssBlockError {
    constructor(message) {
      super(message);
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
              let line, column;
              if (rule.source && rule.source.start && pseudo.source && pseudo.source.start) {
                line = rule.source.start.line + pseudo.source.start.line - 1;
                column = rule.source.start.column + pseudo.source.start.column - 1;
              }
              throw new api.InvalidBlockSyntax(`Invalid :state declaration: ${pseudo} (${sourceFile}:${line}:${column})`);
            }
            let state = block.ensureState(stateName);
            pseudo.replaceWith(selectorParser.className({value: state.cssClass(opts)}));
          }
        });
        rule.selector = selector.toString();
      });
    }
  });
}

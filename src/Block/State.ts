import selectorParser = require("postcss-selector-parser");
import { OptionsReader } from "../options";
import { OutputMode } from "../OutputMode";
import { CompoundSelector } from "../parseSelector";
import { stateParser, isState } from "../BlockParser";
import { Block, BlockClass, BlockObject } from "./index";
import { Base, StateInfo } from "./Base";

export class State extends Base {
  private _group: string | null;
  isGlobal = false;

  constructor(name: string, group: string | null | undefined = null, container: Block | BlockClass) {
    super(name, container);
    this._group = group;
  }

  get blockClass(): BlockClass | null {
    if (this._container instanceof BlockClass) {
      return this._container;
    } else {
      return null;
    }
  }

  get group(): string | null {
    return this._group;
  }

  unqualifiedSource(): string {
    let source = "[state|";
    if (this.group) {
      source = source + `${this.group}=`;
    }
    source = source + this.name + "]";
    return source;
  }

  asSource(): string {
    if (this.blockClass === null) {
      return this.unqualifiedSource();
    } else {
      return this.blockClass.asSource() + this.unqualifiedSource();
    }
  }

  localName(): string {
    let localNames: string[] = [];
    if (this.blockClass) {
      localNames.push(this.blockClass.localName());
    }
    if (this.group) {
      localNames.push(`${this.group}-${this.name}`);
    } else {
      localNames.push(this.name);
    }
    return localNames.join("--");
  }

  cssClass(opts: OptionsReader) {
    switch(opts.outputMode) {
      case OutputMode.BEM:
        let cssClassName: string;
        if (this.blockClass) {
          cssClassName = this.blockClass.cssClass(opts);
        } else {
          cssClassName = this.block.cssClass(opts);
        }
        if (this.group) {
          return `${cssClassName}--${this.group}-${this.name}`;
        } else {
          return `${cssClassName}--${this.name}`;
        }
      default:
        throw "this never happens";
    }
  }

  private sameNameAndGroup(info: StateInfo): boolean {
    if (info.name === this.name) {
      if (this.group && info.group) {
        return this.group === info.group;
      } else {
        return !(this.group || this.group);
      }
    } else {
      return false;
    }
  }

  matches(compoundSel: CompoundSelector): boolean {
    let classVal: null | string = null;
    if (this.blockClass) {
      classVal = this.blockClass.name;
      if (!compoundSel.nodes.some(node => node.type === "class" && node.value === classVal)) {
        return false;
      }
      return compoundSel.nodes.some(node => isState(node) &&
        this.sameNameAndGroup(stateParser(<selectorParser.Attribute>node)));
    } else {
      return compoundSel.nodes.some(node => isState(node) &&
        this.sameNameAndGroup(stateParser(<selectorParser.Attribute>node)));
    }
  }

  get base() {
    let info: StateInfo = {name: this.name};
    if (this.group) {
      info.group = this.group;
    }
    if (this.blockClass) {
      let base = this.block.base;
      while (base) {
        let cls = base.getClass(this.blockClass.name);
        if (cls) {
          let state = cls.states._getState(info);
          if (state) return state;
        }
        base = base.base;
      }
    } else {
      let base = this.block.base;
      while (base) {
        let state = base.states._getState(info);
        if (state) return state;
        base = base.base;
      }
    }
    return undefined;
  }

  /**
   * Return array self and all children.
   * @returns Array of BlockObjects.
   */
  all(): BlockObject[] {
    return [this];
  }

}

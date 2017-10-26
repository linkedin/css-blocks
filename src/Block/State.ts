import selectorParser = require("postcss-selector-parser");
import { AttributeNS, ValueAbsent, ValueConstant, Attr } from "@opticss/template-api";
import { OptionsReader } from "../OptionsReader";
import { OutputMode } from "../OutputMode";
import { CompoundSelector } from "opticss";
import { stateParser, isState } from "../BlockParser";
import { Block, BlockClass } from "./index";
import { BlockObject, StateInfo } from "./BlockObject";

/**
 * States represent a state attribute selector in a particular Block. States may
 * optionally be a member of a group of states, and or designated "global".
 */
export class State extends BlockObject {
  private _sourceAttributes: Attr[];
  private _group: string | null;
  isGlobal = false;

  /**
   * State constructor. Provide a local name for this State, an optional group name,
   * and the parent container.
   * @param name The local name for this state.
   * @param group An optional parent group name.
   * @param container The parent container of this State.
   */
  constructor(name: string, group: string | null | undefined = undefined, container: Block | BlockClass) {
    super(name, container);
    this._group = group || null;
  }

  /**
   * Retrieve the BlockClass that this state belongs to, if applicable.
   * @returns The parent block class, or null.
   */
  get blockClass(): BlockClass | null {
    if (this._container instanceof BlockClass) {
      return this._container;
    } else {
      return null;
    }
  }

  /**
   * Retrieve this state's group name, if applicable.
   * @returns The parent group name, or null.
   */
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

  /**
   * Retrieve this State's selector as it appears in the Block source code.
   * @returns The State's attribute selector
   */
  asSource(): string {
    if (this.blockClass === null) {
      return this.unqualifiedSource();
    } else {
      return this.blockClass.asSource() + this.unqualifiedSource();
    }
  }

  asSourceAttributes(): Attr[] {
    if (!this._sourceAttributes) {
      this._sourceAttributes = [];
      let value: ValueConstant | ValueAbsent;
      let name: string;
      if (this.group) {
        name = this.group;
        value = {constant: this.name};
      } else {
        name = this.name;
        value = {absent: true};
      }
      if (this.blockClass) {
        let classAttr = this.blockClass.asSourceAttributes();
        this._sourceAttributes.push(...classAttr);
      }
      this._sourceAttributes.push(new AttributeNS("state", name, value));
    }
    return this._sourceAttributes;
  }

  /**
   * Retrieve this State's local name, including the optional BlockClass and group designators.
   * @returns The State's local name.
   */
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

  /**
   * Export as new class name.
   * @param opts Option hash configuring output mode.
   * @returns String representing output class.
   */
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

  /**
   * Given a StateInfo object, return whether this State object has the same group and name.
   * @param info StateInfo to compare against
   * @returns True or false.
   */
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

  /**
   * @returns Whether the given selector refers to this state
   */
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

  /**
   * Get the base inherited block object.
   * @returns The base inherited block object.
   */
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

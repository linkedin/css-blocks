import selectorParser = require("postcss-selector-parser");
import { Attribute } from "@opticss/template-api";
import { OptionsReader } from "../OptionsReader";
import { OutputMode } from "../OutputMode";
import { CompoundSelector } from "opticss";
import { isState } from "../BlockParser";
import { BlockObject, StateContainer } from "./BlockObject";
import { Block } from "./index";

/**
 * Represents a Class present in the Block.
 */
export class BlockClass extends BlockObject {
  private _sourceAttribute: Attribute;

  public readonly states: StateContainer;

  /**
   * BlockClass constructor
   * @param name Name for this BlockClass instance
   * @param parent The parent block of this class.
   */
  constructor(name: string, parent: Block) {
    super(name, parent);

    // BlockClases may contain states, provide it a place to put them.
    this.states = new StateContainer(this);
  }

  get base() {
    let base = this.block.base;
    while (base) {
      let cls = base.getClass(this.name);
      if (cls) return cls;
      base = base.base;
    }
    return undefined;
  }

  localName(): string {
    return this.name;
  }

  /**
   * Export as original class name.
   * @returns String representing original class.
   */
  asSource(): string {
    return `.${this.name}`;
  }

  asSourceAttributes(): Attribute[] {
    if (!this._sourceAttribute) {
      this._sourceAttribute = new Attribute("class", {constant: this.name});
    }
    return [this._sourceAttribute];
  }

  /**
   * Export as new class name.
   * @param opts Option hash configuring output mode.
   * @returns String representing output class.
   */
  cssClass(opts: OptionsReader) {
    switch(opts.outputMode) {
      case OutputMode.BEM:
        return `${this.block.name}__${this.name}`;
      default:
        throw "this never happens";
    }
  }

  /**
   * @returns Whether the given selector refers to this class
   */
  matches(compoundSel: CompoundSelector): boolean {
    let srcVal = this.name;
    let found = compoundSel.nodes.some(node => node.type === selectorParser.CLASS && node.value === srcVal);
    if (!found) return false;
    return !compoundSel.nodes.some(node => isStateNode(node));
  }

  /**
   * Return array self and all children.
   * @param shallow Pass false to not include children.
   * @returns Array of BlockObjects.
   */
  all(shallow?: boolean): BlockObject[] {
    let result: BlockObject[] = [this];
    if (!shallow) {
      result = result.concat(this.states.all());
    }
    return result;
  }

}

export function isBlockClass(o: object): o is BlockClass {
  return o instanceof BlockClass;
}

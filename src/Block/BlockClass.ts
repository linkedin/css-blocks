import selectorParser = require("postcss-selector-parser");
import { OptionsReader } from "../options";
import { OutputMode } from "../OutputMode";
import { CompoundSelector } from "../parseSelector";
import { isState } from "../BlockParser";
import { Base, StateContainer } from "./Base";
import { Block, BlockObject } from "./index";

/**
 * Represents a Block Class key selector.
 */
export class BlockClass extends Base {

  public readonly states: StateContainer;

  /**
   * Create the StateContainer unique to this instance.
   */
  constructor(name: string, block: Block) {
    super(name, block);
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

  /**
   * Export as new class name.
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
   * Export as new class name.
   * @returns String representing output class.
   */
  matches(compoundSel: CompoundSelector): boolean {
    let srcVal = this.name;
    let found = compoundSel.nodes.some(node => node.type === selectorParser.CLASS && node.value === srcVal);
    if (!found) return false;
    return !compoundSel.nodes.some(node => isState(node));
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

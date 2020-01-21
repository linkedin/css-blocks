import { parseBemSelector } from "./utils";

export interface BemObject {
  block?: string;
  element?: string;
  modifier?: string;
}

export interface SelectorBemObject {
  selector: string;
  bemObj: BemObject;
}

interface BlockClassName {
  class?: string;
  state?: string;
  subState?: string;
}

export class BemSelector {
  block: string;
  element?: string;
  modifier?: string;
  constructor(selector: string, bemObject?: BemObject) {
    if (!bemObject) {
      bemObject = parseBemSelector(selector) || undefined;
    }
    if (bemObject && bemObject.block) {
      this.block = bemObject.block;
      // strip the syntax elements
      this.element = bemObject.element ? bemObject.element.replace(/^__/, "") : undefined;
      this.modifier = bemObject.modifier ? bemObject.modifier.replace(/^--/, "") : undefined;
    } else {
      throw new Error(`${selector} does not follow BEM`);
    }
  }
}

export class BlockClassSelector {
  class?: string;
  state?: string;
  subState?: string;

  constructor(options?: BlockClassName) {
    this.class = options && options.class || undefined;
    this.state = options && options.state || undefined;
    this.subState = options && options.subState || undefined;
  }

  toString(): String {
    let blockClassName: string;
    if (this.class) {
      blockClassName = `${this.class}`;
    } else {
      blockClassName = `:scope`;
    }
    if (this.subState) {
      blockClassName = `${blockClassName}[${this.state}=${this.subState}]`;
    }
    else if (this.state) {
      blockClassName = `${blockClassName}[${this.state}]`;
    }
    return blockClassName;
  }
}

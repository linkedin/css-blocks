
import selectorParser = require("postcss-selector-parser");

function isPseudoelement(node: any) {
  return node.type === selectorParser.PSEUDO &&
    (
      node.value.startsWith("::") ||
      node.value === ":before" ||
      node.value === ":after"
    );
}

export interface CombinatorAndSelector<SelectorType> {
  combinator: selectorParser.Combinator;
  selector: SelectorType;
}

export interface CombinatorAndCompoundSelector extends CombinatorAndSelector<CompoundSelector> {
}

export class CombinedSelector<T> {
  next?: CombinatorAndSelector<T>;
  setNext(combinator: selectorParser.Combinator, selector: T) {
    this.next = {
      combinator: combinator,
      selector: selector
    };
  }
}

export class CompoundSelector extends CombinedSelector<CompoundSelector> {
  nodes: selectorParser.Node[];
  pseudoelement: selectorParser.Pseudo;
  next?: CombinatorAndCompoundSelector;

  constructor() {
    super();
    this.nodes = [];
  }
  get lastSibling() {
    let lastSibling: CompoundSelector = this;
    while (lastSibling.next) {
      lastSibling = lastSibling.next.selector;
    }
    return lastSibling;
  }
  addNode(node: selectorParser.Node) {
    this.nodes.push(node);
  }
  setPseudoelement(pseudo: selectorParser.Pseudo) {
    this.pseudoelement = pseudo;
  }
  insertBefore(other: CompoundSelector, combinator: selectorParser.Combinator, reference: CompoundSelector): boolean {
    if (this.next && this.next.selector === reference) {
      let otherEnd = other.lastSibling;
      otherEnd.next = {
        combinator: combinator,
        selector: this.next.selector
      };
      this.next.selector = other;
      return true;
    } else if (this.next) {
      return this.next.selector.insertBefore(other, combinator, reference);
    } else {
      return false;
    }
  }
  append(combinator: selectorParser.Combinator, selector: CompoundSelector): CompoundSelector {
    this.lastSibling.next = {
      combinator: combinator,
      selector: selector
    };
    return this;
  }
  mergeNodes(other: CompoundSelector): CompoundSelector {
    let pseudos: selectorParser.Node[] = [];
    let nodes: selectorParser.Node[] = [];
    let filterNodes = function(node: selectorParser.Node) {
      if (node.type === selectorParser.PSEUDO) {
        pseudos.push(node);
      } else {
        nodes.push(node);
      }
    };
    this.nodes.forEach(filterNodes);
    other.nodes.forEach(filterNodes);
    this.nodes = nodes.concat(pseudos);
    if (this.pseudoelement && other.pseudoelement && this.pseudoelement.value !== other.pseudoelement.value) {
      throw new Error("Cannot merge two compound selectors with different pseudoelements");
    }
    this.pseudoelement = other.pseudoelement;
    return this;
  }
  removeLast(): CombinatorAndCompoundSelector | undefined {
    let selector: CompoundSelector = this;
    while (selector.next) {
      if (selector.next.selector.next === undefined) {
        let last: CombinatorAndCompoundSelector = selector.next;
        selector.next = undefined;
        return last;
      } else if (selector.next) {
        selector = selector.next.selector;
      }
    }
    return undefined;
  }
  clone(): CompoundSelector {
    let firstCopy = new CompoundSelector();
    let copy: CompoundSelector | undefined = firstCopy;
    let current: CompoundSelector | undefined = this;
    do {
      copy.pseudoelement = current.pseudoelement;
      copy.nodes = current.nodes.slice();
      if (current.next) {
        copy.next = {
          combinator: current.next.combinator,
          selector: current.next.selector.clone()
        };
      }
      copy = copy.next && copy.next.selector;
      current = current.next && current.next.selector;
    } while (copy && current);
    return firstCopy;
  }
  toString(): string {
    let s = this.nodes.join('');
   if (this.pseudoelement) {
      s += this.pseudoelement.toString();
    }
    if (this.next) {
      s += this.next.combinator.toString();
      s += this.next.selector.toString();
    }
    return s;
  }
}

export class ParsedSelector {
  selector: CompoundSelector;
  constructor(selector: CompoundSelector) {
    this.selector = selector;
  }
  isContext(selector: CompoundSelector) {
    let k = this.selector;
    while (k.next !== undefined) {
      if (k === selector) return true;
      k = k.next.selector;
    }
    return false;
  }
  get key(): CompoundSelector {
    return this.selector.lastSibling;
  }
  get length(): number {
    let count = 0;
    let selector: CompoundSelector | undefined = this.selector;
    while (selector) {
      count++;
      selector = selector.next && selector.next.selector;
    }
    return count;
  }
  clone(): ParsedSelector {
    return new ParsedSelector(this.selector.clone());
  }
  toString() {
    return this.selector.toString();
  }
}

export type Selectorish = string | selectorParser.Root | selectorParser.Selector | selectorParser.Node[] | selectorParser.Node[][];

function toNodes(selector: Selectorish): selectorParser.Node[][] {
  let selNode: selectorParser.Selector | null = null;
  if (Array.isArray(selector)) {
    if (Array.isArray(selector[0])) {
      return <selectorParser.Node[][]>selector;
    } else {
      return [<selectorParser.Node[]>selector];
    }
  }
  if (typeof selector === "string") {
    selNode = <selectorParser.Selector>selectorParser().process(selector).res.nodes[0];
  } else {
    if ((<selectorParser.Node>selector).type === selectorParser.ROOT) {
      selNode = <selectorParser.Selector>(<selectorParser.Root>selector).nodes[0];
    } else {
      selNode = <selectorParser.Selector>selector;
    }
  }
  if (selNode.nodes[0] && selNode.nodes[0].type === selectorParser.SELECTOR) {
    let nodes: selectorParser.Node[][] = [];
    selNode.each((n) => {
      nodes.push((<selectorParser.Selector>n).nodes);
    });
    return nodes;
  } else {
    return [selNode.nodes];
  }

}

export function parseCompoundSelectors(selector: Selectorish): CompoundSelector[] {
  let selNodes = toNodes(selector);
  let compoundSels: CompoundSelector[] = [];
  selNodes.forEach((nodes) => {
    let firstCompoundSel = new CompoundSelector();
    let compoundSel = firstCompoundSel;
    nodes.forEach((n) => {
      if (n.type === selectorParser.COMBINATOR) {
        let lastCompoundSel = compoundSel;
        compoundSel = new CompoundSelector();
        lastCompoundSel.setNext(<selectorParser.Combinator>n, compoundSel);
      } else if (isPseudoelement(n)) {
        compoundSel.pseudoelement = <selectorParser.Pseudo>n;
      } else {
        compoundSel.addNode(n);
      }
    });
    if (firstCompoundSel.nodes.length > 0) {
      compoundSels.push(firstCompoundSel);
    }
  });
  return compoundSels;
}

export default function parseSelector(selector: Selectorish): ParsedSelector[] {
  let compoundSels = parseCompoundSelectors(selector);
  return compoundSels.map(cs => new ParsedSelector(cs));
}
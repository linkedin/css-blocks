import selectorParser = require("postcss-selector-parser");

export interface CombinatorAndCompoundSelector extends CombinatorAndSelector<CompoundSelector> {}

export interface CombinatorAndSelector<SelectorType> {
  combinator: selectorParser.Combinator;
  selector: SelectorType;
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

/**
 * Core structure in `CompoundSelector` linked lists. Keeps reference to the next
 * `CompoundSelector` in the chan, and the combinator that connects them.
 */
export default class CompoundSelector extends CombinedSelector<CompoundSelector> {
  nodes: selectorParser.Node[];
  pseudoelement?: selectorParser.Pseudo;
  next?: CombinatorAndCompoundSelector;

  constructor() {
    super();
    this.nodes = [];
  }

  /**
   * Crawl the linked list and return last sibling.
   * @return The last `CompoundSelector` in list
   */
  get lastSibling() {
    let lastSibling: CompoundSelector = this;
    while (lastSibling.next) {
      lastSibling = lastSibling.next.selector;
    }
    return lastSibling;
  }

  /**
   * Add a node to `CompoundSelector`.
   * @param Simple selector node to add.
   */
  addNode(node: selectorParser.Node) {
    this.nodes.push(node);
  }

  /**
   * Set pseudo element type on this `CompoundSelector`.
   * @param The `selectorParser.Pseudo` to assign.
   */
  setPseudoelement(pseudo: selectorParser.Pseudo) {
    this.pseudoelement = pseudo;
  }

  /**
   * Insert a new `CompoundSelector` before another in the linked list.
   * @param other The `CompoundSelector` to insert.
   * @param combinator The combinator connecting these two selectors.
   * @param reference The `CompoundSelector` to insert this selector before.
   */
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

  /**
   * Append a new `CompoundSelector` to the linked list.
   * @param combinator The combinator connecting the new selectors.
   * @param selector The `CompoundSelector` to append.
   * @return This `CompoundSelector`.
   */
  append(combinator: selectorParser.Combinator, selector: CompoundSelector): CompoundSelector {
    this.lastSibling.next = {
      combinator: combinator,
      selector: selector
    };
    return this;
  }

  /**
   * Merge this `CompoundSelector` with another.
   * @param other The `CompoundSelector` to merge with this one.
   * @return This `CompoundSelector`.
   */
  mergeNodes(other: CompoundSelector): CompoundSelector {
    let foundNodes = new Set<string>();
    let pseudos: selectorParser.Node[] = [];
    let nodes: selectorParser.Node[] = [];
    let filterNodes = function(node: selectorParser.Node) {
      let nodeStr = node.toString();
      if (!foundNodes.has(nodeStr)) {
        foundNodes.add(nodeStr);
        if (node.type === selectorParser.PSEUDO) {
          pseudos.push(node);
        } else {
          nodes.push(node);
        }
      }
    };
    this.nodes.forEach(filterNodes);
    other.nodes.forEach(filterNodes);
    pseudos.sort((a,b) => a.value.localeCompare(b.value));
    this.nodes = nodes.concat(pseudos);
    if (this.pseudoelement && other.pseudoelement && this.pseudoelement.value !== other.pseudoelement.value) {
      throw new Error("Cannot merge two compound selectors with different pseudoelements");
    }
    this.pseudoelement = other.pseudoelement;
    return this;
  }

  /**
   * Remove the last `CompoundSelector` in this linked list.
   * @return The removed `CompoundSelector`, or undefined.
   */
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

  /**
   * Clone the `CompoundSelector` linked list starting at this node.
   * @return The cloned `CompoundSelector` linked list.
   */
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

  /**
   * Stringify this `CompoundSelector` list back into CSS.
   * @return The selector string.
   */
  toString(): string {
    let s = this.nodes.map(n => n.clone({spaces: {before: '', after: ''}})).join('');
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

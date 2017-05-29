
import selectorParser = require("postcss-selector-parser");

/**
 * If node is pseudo element, return true.
 * @param node Node to check if is a pseudo element
 * @return True or false if a pseudo element
 */
function isPseudoelement(node: any) {
  return node && node.type === selectorParser.PSEUDO &&
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

export interface CombinatorAndCompoundSelector extends CombinatorAndSelector<CompoundSelector> {}

// QUESTION: This isn't used anywhere but to extend `CompoundSelector`. Can we merge the two and get rid of this?
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
export class CompoundSelector extends CombinedSelector<CompoundSelector> {
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

/**
 * `ParsedSelector` serves as a container object for a `CompoundSelector` linked
 * list and provides a number of convenience methods for interacting with it.
 * QUESTION: Nearly every method on this container object is present on `CompoundSelector`.
 *           can we safely get rid of this?
 */
export class ParsedSelector {
  selector: CompoundSelector;

  /**
   * @param Root `CompoundSelector` of linked list to track.
   */
  constructor(selector: CompoundSelector) {
    this.selector = selector;
  }

  /**
   * Checks if a given `CompoundSelector` is a context selector for this `ParsedSelector`.
   * @return True or false depending on if is context selector.
   */
  isContext(selector: CompoundSelector) {
    let k = this.selector;
    while (k.next !== undefined) {
      if (k === selector) return true;
      k = k.next.selector;
    }
    return false;
  }

  /**
   * Returns the key selector (last compound selector) of this selector.
   * @return Key selector.
   */
  get key(): CompoundSelector {
    return this.selector.lastSibling;
  }

  /**
   * Returns the number of `CompoundSelector` present in this `ParsedSelector`
   * @return CompoundSelector count.
   */
  get length(): number {
    let count = 0;
    let selector: CompoundSelector | undefined = this.selector;
    while (selector) {
      count++;
      selector = selector.next && selector.next.selector;
    }
    return count;
  }

  /**
   * Returns a deep clone of this `ParsedSelector` and the linked list it tracks.
   * @return new `ParsedSelector` clone.
   */
  clone(): ParsedSelector {
    return new ParsedSelector(this.selector.clone());
  }

  /**
   * Stringify this `CompoundSelector` list back into CSS.
   * @return The selector string.
   */
  toString() {
    return this.selector.toString();
  }
}

/**
 * All valid selector-like inputs to the `parseSelector` helper methods.
 */
 export type Selectorish = string | selectorParser.Root | selectorParser.Selector | selectorParser.Selector[] | selectorParser.Node[] | selectorParser.Node[][];

/**
 * Coerce a `selectorParser.Root` object to `selectorParser.Node[][]`.
 * QUESTION: I broke this out of the `toNodes` function, that okay?
 *
 * @param root  `selectorParser.Root` object
 * @return Array of `selectorParser.Node` arrays.
 */
function coerceRootToNodeList(root: selectorParser.Root): selectorParser.Node[][] {
  return root.nodes.map<selectorParser.Node[]>(n => (<selectorParser.Container>n).nodes);
}

/**
 * Converts a selector like object to an array of `selectorParser.Node` arrays.
 *
 * @param selector  Selector like object: including `string`, `selectorParser.Root`, `selectorParser.Selector`, or `selectorParser.Node`
 * @return Array of `selectorParser.Node` arrays.
 */
function toNodes(selector: Selectorish): selectorParser.Node[][] {

  // QUESTION: Does `toNodes` properly handle `selectorParser.Selector[]` input?

  // If input is already an array of Nodes, return.
  if (Array.isArray(selector)) {
    if (Array.isArray(selector[0])) {
      return <selectorParser.Node[][]>selector;
    } else {
      return [<selectorParser.Node[]>selector];
    }
  }

  // If input is a string, parse and coerce new `selectorParser.Root` to proper output and return.
  if (typeof selector === "string") {
    let res: selectorParser.Root =  selectorParser().process(selector).res;
    return coerceRootToNodeList(res);
  }

  // If input is `selectorParser.Root`, coerce to proper output and return.
  if ((<selectorParser.Node>selector).type === selectorParser.ROOT) {
    return coerceRootToNodeList(selector);
  }

  // Otherwise, is a `selectorParser.Selector`. Unwrap nodes and return .
  return [selector.nodes];
}

// QUESTION: This function returns an array of `CompoundSelector`s, which is then
//           immidately converted into an array of `ParsedSelector`s. (See `parseSelector`)
//           This is the only place where `ParsedSelector` or `parseCompoundSelectors`
//           are used. Why not merge the two classes / functions?

/**
 * Converts a selector like object, return an array of `CompoundSelector` objects.
 *
 * @param selector  Selector like object: including `string`, `selectorParser.Root`, `selectorParser.Selector`, or `selectorParser.Node`
 * @return Array of `CompoundSelector` objects.
 */
export function parseCompoundSelectors(selector: Selectorish): CompoundSelector[] {
  let compoundSels: CompoundSelector[] = [];

  // For each selector in this rule, convert to a `CompoundSelector` linked list.
  toNodes(selector).forEach((nodes) => {
    let firstCompoundSel = new CompoundSelector();
    let compoundSel = firstCompoundSel;
    nodes.forEach((n) => {

      // If a combinator is encountered, start a new `CompoundSelector` and link to the previous.
      if (n.type === selectorParser.COMBINATOR) {
        let lastCompoundSel = compoundSel;
        compoundSel = new CompoundSelector();
        lastCompoundSel.setNext(<selectorParser.Combinator>n, compoundSel);
      }

      // Normalize :before and :after to always use double colins and save.
      else if (isPseudoelement(n)) {
        compoundSel.pseudoelement = <selectorParser.Pseudo>n;
        if (!compoundSel.pseudoelement.value.startsWith("::")) {
          compoundSel.pseudoelement.value = ":" + compoundSel.pseudoelement.value;
        }
      }

      // Otherwise add to compound selector.
      else {
        compoundSel.addNode(n);
      }
    });

    // Save in running list of compound selectors if not empty
    if (firstCompoundSel.nodes.length > 0) {
      compoundSels.push(firstCompoundSel);
    }
  });

  return compoundSels;
}

/**
 * Given a selector like object, return an array of `ParsedSelector` objects.
 * Passed `selector` may be any valid selector as a string, or `postcss-selector-parser`
 * object.
 *
 * @param selector  Selector like object: including `string`, `selectorParser.Root`, `selectorParser.Selector`, or `selectorParser.Node`
 * @return Array of `ParsedSelector` objects.
 */
export default function parseSelector(selector: Selectorish): ParsedSelector[] {
  let compoundSels = parseCompoundSelectors(selector);
  return compoundSels.map(cs => new ParsedSelector(cs));
}

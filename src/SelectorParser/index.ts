import * as selectorParser from "postcss-selector-parser";

import ParsedSelector from "./ParsedSelector";
import CompoundSelector from "./CompoundSelector";

export {
  ParsedSelector as ParsedSelector,
  CompoundSelector as CompoundSelector
};

/**
 * All valid selector-like inputs to the `parseSelector` helper methods.
 */
export type Selectorish = string | selectorParser.Root | selectorParser.Node[] | selectorParser.Node[][];

/**
 * If node is pseudo element, return true.
 * @param node Node to check if is a pseudo element
 * @return True or false if a pseudo element
 */
function isPseudoelement(node: selectorParser.Node) {
  return node && node.type === selectorParser.PSEUDO &&
    (
      node.value.startsWith("::") ||
      node.value === ":before" ||
      node.value === ":after"
    );
}

/**
 * Coerce a `selectorParser.Root` object to `selectorParser.Node[][]`.
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

/**
 * Given a selector like object, return an array of `ParsedSelector` objects.
 * Passed `selector` may be any valid selector as a string, or `postcss-selector-parser`
 * object.
 *
 * @param selector  Selector like object: including `string`, `selectorParser.Root`, `selectorParser.Selector`, or `selectorParser.Node`
 * @return Array of `ParsedSelector` objects.
 */
export default function parseSelector(selector: Selectorish): ParsedSelector[] {
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

      // Normalize :before and :after to always use double colons and save.
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

  return compoundSels.map(cs => new ParsedSelector(cs));
}

import {
  CompoundSelector,
  ParsedSelector,
  parseSelector,
  postcssSelectorParser as selectorParser,
} from "opticss";

import { isAttributeNode, isClassNode, isRootNode, toAttrToken } from "../BlockParser";
import { Block, Style } from "../BlockTree";
import { ResolvedConfiguration } from "../configuration";

function nodeAsStyle(block: Block, node: selectorParser.Node): [Style, number] | null {
  if (selectorParser.isTag(node)) {
    let otherBlock = block.getReferencedBlock(node.value);
    if (otherBlock) {
      let next = node.next();
      if (next && isClassNode(next)) {
        let klass = otherBlock.getClass(next.value);
        if (klass) {
          let another = next.next();
          if (another && isAttributeNode(another)) {
            let attr = klass.getAttributeValue(toAttrToken(another));
            if (attr) {
              return [attr, 2];
            } else {
              return null; // this is invalid and should never happen.
            }
          } else {
            // we don't allow scoped classes not part of a state
            return null; // this is invalid and should never happen.
          }
        } else {
          return null;
        }
      } else if (next && isAttributeNode(next)) {
        let attr = otherBlock.rootClass.getAttributeValue(toAttrToken(next));
        if (attr) {
          return [attr, 1];
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  } else if (selectorParser.isClassName(node) || isRootNode(node)) {
    let klass = block.getClass(node.value);
    if (klass === null) { return null; }
    let next = node.next();
    if (next && isAttributeNode(next)) {
      let attr = klass.getAttributeValue(toAttrToken(next));
      if (attr === null) {
        return null;
      } else {
        return [attr, 1];
      }
    } else {
      return [klass, 0];
    }
  } else if (isAttributeNode(node)) {
    let attr = block.rootClass.ensureAttributeValue(toAttrToken(node));
    if (attr) {
      return [attr, 0];
    } else {
      return null;
    }
  }
  return null;
}

function rewriteSelectorNodes(block: Block, nodes: selectorParser.Node[], config: ResolvedConfiguration): selectorParser.Node[] {
  let newNodes: selectorParser.Node[] = [];
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    let result = nodeAsStyle(block, node);
    if (result === null) {
      newNodes.push(node);
    } else {
      newNodes.push(selectorParser.className({ value: result[0].cssClass(config) }));
      i += result[1];
    }
  }
  return newNodes;
}

function rewriteSelectorToString(block: Block, selector: ParsedSelector, config: ResolvedConfiguration): string {
  let firstNewSelector = new CompoundSelector();
  let newSelector = firstNewSelector;
  let newCurrentSelector = newSelector;
  let currentSelector: CompoundSelector | undefined = selector.selector;
  do {
    newCurrentSelector.nodes = rewriteSelectorNodes(block, currentSelector.nodes, config);
    newCurrentSelector.pseudoelement = currentSelector.pseudoelement;
    if (currentSelector.next !== undefined) {
      let tempSel = newCurrentSelector;
      newCurrentSelector = new CompoundSelector();
      tempSel.setNext(currentSelector.next.combinator, newCurrentSelector);
      currentSelector = currentSelector.next.selector;
    } else {
      currentSelector = undefined;
    }
  } while (currentSelector !== undefined);
  return firstNewSelector.toString();
}

export function rewriteSelector(block: Block, selector: ParsedSelector, config: ResolvedConfiguration): ParsedSelector {
  // generating a string and re-parsing ensures the internal structure is consistent
  // otherwise the parent/next/prev relationships will be wonky with the new nodes.
  let s = rewriteSelectorToString(block, selector, config);
  return parseSelector(s)[0];
}

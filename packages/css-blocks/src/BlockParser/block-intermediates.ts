import { CompoundSelector } from "opticss";
import selectorParser = require("postcss-selector-parser");

/**
 * Holds state values to be passed to the StateContainer.
 */
export interface StateInfo {
  group?: string;
  name: string;
}

export enum BlockType {
  root = 1,
  state,
  class,
  classState,
}

export interface NodeAndType {
  blockType: BlockType;
  node: selectorParser.Node;
}

export interface BlockNodeAndType extends NodeAndType {
  blockName?: string;
}

/**
 * CSS Blocks state parser.
 * @param  attr The css attribute selector that represents this state.
 * @return A `StateInfo` object that represents the state.
 */
export function stateParser(attr: selectorParser.Attribute): StateInfo {
  let info: StateInfo = {
    name: attr.attribute,
  };
  if (attr.value) {
    info.group = info.name;
    info.name = attr.value.replace(/^(["'])(.+(?=\1$))\1$/, "$2"); // Strip quotes from value
  }
  return info;
}

/**
 * Internal method used to generate human readable error messages when parsing.
 * @param t The block type we're generating a human readable name for.
 * @param options Options for output, currently just to specify plurality.
 * @return A human readable descriptor for the given `BlockType`.
 */
export function blockTypeName(t: BlockType, options?: { plural: boolean }): string {
  let isPlural = options && options.plural;
  switch (t) {
    case BlockType.root: return isPlural ? "block roots" : "block root";
    case BlockType.state: return isPlural ? "root-level states" : "root-level state";
    case BlockType.class: return isPlural ? "classes" : "class";
    case BlockType.classState: return isPlural ? "class states" : "class state";
    default: return "¯\\_(ツ)_/¯";
  }
}

/**
 * Test if the provided node representation is a root level object, aka: operating
 * on the root element.
 * @param object The CompoundSelector's descriptor object.
 */
export function isRootLevelObject(object: NodeAndType): boolean {
  return object.blockType === BlockType.root || object.blockType === BlockType.state;
}

/**
 * Test if the provided node representation is a class level object, aka: operating
 * on an element contained by the root, not the root itself.
 * @param object The CompoundSelector's descriptor object.
 */
export function isClassLevelObject(object: NodeAndType): boolean {
  return object.blockType === BlockType.class || object.blockType === BlockType.classState;
}

/**
 * Check if given selector node is targeting the root block node
 */
export function isRootNode(node: selectorParser.Node): node is selectorParser.ClassName {
  return node.type === selectorParser.CLASS && node.value === "root";
}

/**
 * Check if given selector node is a class selector
 * @param  node The selector to test.
 * @return True if class selector, false if not.
 */
export function isClassNode(node: selectorParser.Node): node is selectorParser.ClassName {
  return node.type === selectorParser.CLASS;
}

/**
 * Check if given selector node is a state selector
 * @param  node The selector to test.
 * @return True if state selector, false if not.
 */
export function isStateNode(node: selectorParser.Node): node is selectorParser.Attribute {
  return node.type === selectorParser.ATTRIBUTE && (node).namespace === "state";
}

/**
 * Similar to assertBlockObject except it doesn't check for well-formedness
 * and doesn't ensure that you get a block object when not a legal selector.
 * @param sel The `CompoundSelector` to search.
 * @return Returns the block's name, type and node.
 */
export function getBlockNode(sel: CompoundSelector): BlockNodeAndType | null {
  let blockName = sel.nodes.find(n => n.type === selectorParser.TAG);
  let n = sel.nodes.find(n => isRootNode(n));
  if (n) {
    return {
      blockName: blockName && blockName.value,
      blockType: BlockType.root,
      node: n,
    };
  }
  n = sel.nodes.find(n => isStateNode(n));
  if (n) {
    let prev = n.prev();
    if (prev && isClassNode(prev)) {
      return {
        blockName: blockName && blockName.value,
        blockType: BlockType.classState,
        node: n,
      };
    } else {
      return {
        blockName: blockName && blockName.value,
        blockType: BlockType.state,
        node: n,
      };
    }
  }
  n = sel.nodes.find(n => isClassNode(n));
  if (n) {
    return {
      blockName: blockName && blockName.value,
      blockType: BlockType.class,
      node: n,
    };
  } else {
    return null;
  }
}

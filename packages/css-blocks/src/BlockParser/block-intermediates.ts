import { assertNever, firstOfType } from "@opticss/util";
import { CompoundSelector } from "opticss";
import selectorParser = require("postcss-selector-parser");

import { ROOT_CLASS } from "../BlockSyntax";

export enum BlockType {
  root = 1,
  state,
  class,
  classState,
}

export type NodeAndType = {
  blockType: BlockType.state | BlockType.classState;
  node: selectorParser.Attribute;
} | {
  blockType: BlockType.root | BlockType.class;
  node: selectorParser.ClassName | selectorParser.Pseudo;
};

export type BlockNodeAndType = NodeAndType & {
  blockName?: string;
};

/** Extract a state's name from an attribute selector */
export function stateName(attr: selectorParser.Attribute) {
  return attr.attribute;
}

/** Extract a state's value (aka subState) from an attribute selector */
export function stateValue(attr: selectorParser.Attribute): string | undefined {
  if (attr.value) {
    return attr.value.replace(/^(["'])(.+(?=\1$))\1$/, "$2");
  } else {
    return;
  }
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
    default: return assertNever(t);
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
export function isRootNode(node: selectorParser.Node): node is selectorParser.Pseudo {
  return node.type === selectorParser.PSEUDO && node.value === ROOT_CLASS;
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
  let r = firstOfType(sel.nodes, isRootNode);
  if (r) {
    return {
      blockName: blockName && blockName.value,
      blockType: BlockType.root,
      node: r,
    };
  }
  let s = firstOfType(sel.nodes, isStateNode);
  if (s) {
    let prev = s.prev();
    if (prev && isClassNode(prev)) {
      return {
        blockName: blockName && blockName.value,
        blockType: BlockType.classState,
        node: s,
      };
    } else {
      return {
        blockName: blockName && blockName.value,
        blockType: BlockType.state,
        node: s,
      };
    }
  }
  let c = firstOfType(sel.nodes, isClassNode);
  if (c) {
    return {
      blockName: blockName && blockName.value,
      blockType: BlockType.class,
      node: c,
    };
  } else {
    return null;
  }
}

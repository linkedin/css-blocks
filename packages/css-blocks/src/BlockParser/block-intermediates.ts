import { assertNever, firstOfType } from "@opticss/util";
import { CompoundSelector } from "opticss";
import selectorParser = require("postcss-selector-parser");

import { AttrToken, ROOT_CLASS, STATE_NAMESPACE, ATTR_PRESENT } from "../BlockSyntax";

export enum BlockType {
  root = 1,
  attribute,
  class,
  classAttribute,
}

export type NodeAndType = {
  blockType: BlockType.attribute | BlockType.classAttribute;
  node: selectorParser.Attribute;
} | {
  blockType: BlockType.root | BlockType.class;
  node: selectorParser.ClassName | selectorParser.Pseudo;
};

export type BlockNodeAndType = NodeAndType & {
  blockName?: string;
};

/** Extract an Attribute's value from a `selectorParser` attribute selector */
function attrValue(attr: selectorParser.Attribute): string {
  if (attr.value) {
    return attr.value.replace(/^(["'])(.+(?=\1$))\1$/, "$2");
  } else {
    return ATTR_PRESENT;
  }
}

/** Extract an Attribute's name from an attribute selector */
export function toAttrToken(attr: selectorParser.Attribute): AttrToken {
  return {
    type: "attribute",
    namespace: attr.namespaceString,
    name: attr.attribute,
    value: attrValue(attr),
    quoted: !!attr.quoted,
  };
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
    case BlockType.attribute: return isPlural ? "root-level states" : "root-level state";
    case BlockType.class: return isPlural ? "classes" : "class";
    case BlockType.classAttribute: return isPlural ? "class states" : "class state";
    default: return assertNever(t);
  }
}

/**
 * Test if the provided node representation is a root level object, aka: operating
 * on the root element.
 * @param object The CompoundSelector's descriptor object.
 */
export function isRootLevelObject(object: NodeAndType): boolean {
  return object.blockType === BlockType.root || object.blockType === BlockType.attribute;
}

/**
 * Test if the provided node representation is a class level object, aka: operating
 * on an element contained by the root, not the root itself.
 * @param object The CompoundSelector's descriptor object.
 */
export function isClassLevelObject(object: NodeAndType): boolean {
  return object.blockType === BlockType.class || object.blockType === BlockType.classAttribute;
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
 * Check if given selector node is an attribute selector
 * @param  node The selector to test.
 * @return True if attribute selector, false if not.
 */
export function isAttributeNode(node: selectorParser.Node): node is selectorParser.Attribute {
  return node.type === selectorParser.ATTRIBUTE && node.namespace === STATE_NAMESPACE;
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
  let s = firstOfType(sel.nodes, isAttributeNode);
  if (s) {
    let prev = s.prev();
    if (prev && isClassNode(prev)) {
      return {
        blockName: blockName && blockName.value,
        blockType: BlockType.classAttribute,
        node: s,
      };
    } else {
      return {
        blockName: blockName && blockName.value,
        blockType: BlockType.attribute,
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

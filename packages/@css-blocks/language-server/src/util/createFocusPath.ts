import { AST } from "@glimmer/syntax";
import { Position, SourceLocation } from "estree";

import { containsPosition } from "./estTreeUtils";

export interface FocusPath {
  parent: FocusPath | null;
  data: AST.Node | null;
}

/**
 * Returns a linked list where the root node is the item found at the corresponding
 * position with links back to all of its parent nodes.
 */
export function createFocusPath(node: AST.Node, position: Position, seen = new Set(), astPathNode: FocusPath = { parent: null, data: null }): FocusPath | null {
  seen.add(node);

  let range: SourceLocation = node.loc;

  if (range) {
    if (containsPosition(range, position)) {
      astPathNode.parent = {
        data: astPathNode.data,
        parent: astPathNode.parent,
      };
      astPathNode.data = node;
    } else {
      return null;
    }
  }

  // NOTE: in the case that the passed node does not have a loc it, could be
  // either an object or array that contains child nodes, so we need to iterate
  // through them.
  for (let key of Object.keys(node)) {
    let value = node[key];
    if (!value || typeof value !== "object" || seen.has(value)) {
      continue;
    }

    createFocusPath(value, position, seen, astPathNode);
  }

  return astPathNode;
}

import { assertNever } from "@opticss/util";

export type TopLevelNode = BlockReference | LocalBlockExport | BlockExport;
export type Node = Root | TopLevelNode;

export type TopLevelDefinitionNode = BlockReference | LocalBlockExport | BlockExport;
export type DefinitionNode = DefinitionRoot | TopLevelDefinitionNode;

const NODE_TYPES = new Set<Node["type"]>();
const DEFINITION_NODE_TYPES = new Set<DefinitionNode["type"]>();

export interface Name {
  name: string;
  asName?: undefined;
}

export interface Rename {
  name: string;
  asName: string;
}

export interface Root {
  type: "Root";
  children: Array<TopLevelNode>;
}
NODE_TYPES.add("Root");

export interface DefinitionRoot {
  type: "DefinitionRoot";
  children: Array<TopLevelDefinitionNode>;
}
DEFINITION_NODE_TYPES.add("DefinitionRoot");

export interface BlockReference {
  type: "BlockReference";
  references?: Array<Name | Rename>;
  defaultName?: string;
  fromPath: string;
}
NODE_TYPES.add("BlockReference");
DEFINITION_NODE_TYPES.add("BlockReference");

/* The statement that exports a block that was previously imported via `@block` */
export interface LocalBlockExport {
  type: "LocalBlockExport";
  exports: Array<Name | Rename>;
}
NODE_TYPES.add("LocalBlockExport");
DEFINITION_NODE_TYPES.add("LocalBlockExport");

/* The statement that exports a block that was previously imported via `@block` */
export interface BlockExport {
  type: "BlockExport";
  exports: Array<Name | Rename>;
  fromPath: string;
}
NODE_TYPES.add("BlockExport");
DEFINITION_NODE_TYPES.add("BlockExport");

export namespace typeguards {
  export function isNode(node: unknown): node is Node {
    return typeof node === "object"
           && node !== null
           && typeof (<Node>node).type === "string"
           && NODE_TYPES.has((<Node>node).type);
  }
  export function isDefinitionNode(node: unknown): node is DefinitionNode {
    return typeof node === "object"
           && node !== null
           && typeof (<Node>node).type === "string"
           && DEFINITION_NODE_TYPES.has((<DefinitionNode>node).type);
  }
  export function isRoot(node: unknown): node is Root {
    return typeguards.isNode(node) && node.type === "Root";
  }
  export function isDefinitionRoot(node: unknown): node is DefinitionRoot {
    return typeguards.isDefinitionNode(node) && node.type === "DefinitionRoot";
  }
  export function isBlockReference(node: unknown): node is BlockReference {
    return typeguards.isNode(node) && node.type === "BlockReference";
  }
  export function isBlockExport(node: unknown): node is BlockExport {
    return typeguards.isNode(node) && node.type === "BlockExport";
  }
  export function isLocalBlockExport(node: unknown): node is LocalBlockExport {
    return typeguards.isNode(node) && node.type === "LocalBlockExport";
  }
}

export namespace builders {
  export function root(): Root {
    return {
      type: "Root",
      children: [],
    };
  }

  export function definitionRoot(): DefinitionRoot {
    return {
      type: "DefinitionRoot",
      children: [],
    };
  }

  export function blockReference(fromPath: string, defaultName: string | undefined, references: Array<Name | Rename> | undefined): BlockReference {
    return {
      type: "BlockReference",
      fromPath,
      defaultName,
      references,
    };
  }

  export function localBlockExport(exports: Array<Name | Rename>): LocalBlockExport {
    return {
      type: "LocalBlockExport",
      exports,
    };
  }

  export function blockExport(fromPath: string, exports: Array<Name | Rename>): BlockExport {
    return {
      type: "BlockExport",
      fromPath,
      exports,
    };
  }
}

export interface Visitor {
  Root?(root: Root): void;
  BlockReference?(blockReference: BlockReference): void;
  LocalBlockExport?(localBlockExport: LocalBlockExport): void;
  BlockExport?(blockExport: BlockExport): void;
}

export interface DefinitionVisitor {
  DefinitionRoot?(root: DefinitionRoot): void;
  BlockReference?(blockReference: BlockReference): void;
  LocalBlockExport?(localBlockExport: LocalBlockExport): void;
  BlockExport?(blockExport: BlockExport): void;
}

export function visit(visitor: Visitor, node: Node) {
  if (typeguards.isRoot(node)) {
    if (visitor.Root) visitor.Root(node);
    for (let child of node.children) {
      visit(visitor, child);
    }
  } else if (typeguards.isBlockReference(node)) {
    if (visitor.BlockReference) visitor.BlockReference(node);
  } else if (typeguards.isBlockExport(node)) {
    if (visitor.BlockExport) visitor.BlockExport(node);
  } else if (typeguards.isLocalBlockExport(node)) {
    if (visitor.LocalBlockExport) visitor.LocalBlockExport(node);
  } else {
    assertNever(node);
  }
}

export function visitDefinition(visitor: DefinitionVisitor, node: DefinitionNode) {
  if (typeguards.isDefinitionRoot(node)) {
    if (visitor.DefinitionRoot) visitor.DefinitionRoot(node);
    for (let child of node.children) {
      visit(visitor, child);
    }
  } else if (typeguards.isBlockReference(node)) {
    if (visitor.BlockReference) visitor.BlockReference(node);
  } else if (typeguards.isBlockExport(node)) {
    if (visitor.BlockExport) visitor.BlockExport(node);
  } else if (typeguards.isLocalBlockExport(node)) {
    if (visitor.LocalBlockExport) visitor.LocalBlockExport(node);
  } else {
    assertNever(node);
  }
}

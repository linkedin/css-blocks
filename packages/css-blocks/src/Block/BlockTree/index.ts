import { AnyNode, Inheritable } from "./Inheritable";
export { Ruleset } from "./RulesetContainer";
import { Style } from "./Style";

export { Style, isStyle } from "./Style";

// Its days like these that I wish JavaScript had multiple inheritance.
export abstract class Source<
  Self extends Source<Self, Child>,
  Child extends Inheritable<Child, Self, Self, AnyNode>
> extends Inheritable<Self, Self, null, Child> {
  constructor(name: string) {
    super(name, null);
  }
}

export abstract class Node<
  Self extends Node<Self, Root, Parent, Child>,
  Root extends Source<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode, Self>,
  Child extends Inheritable<Child, Root, Self, AnyNode | null>
> extends Inheritable<Self, Root, Parent, Child> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
}

export abstract class Sink<
  Self extends Inheritable<Self, Root, Parent, null>,
  Root extends Source<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode, Self>
> extends Inheritable<Self, Root, Parent, null> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
}

export abstract class NodeStyle<
  Self extends Style<Self, Root, Parent, Child>,
  Root extends Source<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode | null, Self>,
  Child extends Inheritable<Child, Root, Self, AnyNode | null>
> extends Style<Self, Root, Parent, Child> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
}

export abstract class SinkStyle<
  Self extends Style<Self, Root, Parent, null>,
  Root extends Source<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode, Self>
> extends Style<Self, Root, Parent, null> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
}

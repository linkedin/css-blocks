import { AnyNode, Inheritable } from "./Inheritable";
import { Style } from "./Style";

// Its days like these that I wish JavaScript had multiple inheritance.
export abstract class SourceNode<
  Self extends SourceNode<Self, Child>,
  Child extends Inheritable<Child, Self, Self, AnyNode>
> extends Inheritable<Self, Self, null, Child> {
  constructor(name: string) { super(name, null); }
}

export abstract class Node<
  Self extends Node<Self, Root, Parent, Child>,
  Root extends SourceNode<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode, Self>,
  Child extends Inheritable<Child, Root, Self, AnyNode | null>
> extends Inheritable<Self, Root, Parent, Child> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
}

export abstract class SinkNode<
  Self extends Inheritable<Self, Root, Parent, null>,
  Root extends SourceNode<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode, Self>
> extends Inheritable<Self, Root, Parent, null> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
}

export abstract class StyleSource<
  Self extends StyleSource<Self, Child>,
  Child extends Inheritable<Child, Self, Self, AnyNode>
> extends Inheritable<Self, Self, null, Child> {
  constructor(name: string) { super(name, null); }
}

export abstract class StyleNode<
  Self extends Style<Self, Root, Parent, Child>,
  Root extends SourceNode<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode | null, Self>,
  Child extends Inheritable<Child, Root, Self, AnyNode | null>
> extends Style<Self, Root, Parent, Child> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
}

export abstract class StyleSink<
  Self extends Style<Self, Root, Parent, null>,
  Root extends SourceNode<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode, Self>
> extends Style<Self, Root, Parent, null> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
}

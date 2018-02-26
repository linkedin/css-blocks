import { AnyNode, Inheritable } from "./Inheritable";
import { Style } from "./Style";

// Its days like these that I wish JavaScript had multiple inheritance.
export abstract class SourceNode<
  Self extends SourceNode<Self, Child>,
  Child extends Inheritable<Child, Self, Self, AnyNode>
> extends Inheritable<Self, Self, null, Child> {
  constructor(name: string) { super(name, null); }
  get block(): Self { return this.root; }
}

export abstract class Node<
  Self extends Node<Self, Root, Parent, Child>,
  Root extends SourceNode<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode | null, Self>,
  Child extends Inheritable<Child, Root, Self, AnyNode | null>
> extends Inheritable<Self, Root, Parent, Child> {
  constructor(name: string, parent: Parent) { super(name, parent); }
  get block(): Root { return this.root; }
}

export abstract class SinkNode<
  Self extends Inheritable<Self, Root, Parent, null>,
  Root extends SourceNode<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode | null, Self>
> extends Inheritable<Self, Root, Parent, null> {
  constructor(name: string, parent: Parent) { super(name, parent); }
  get block(): Root { return this.root; }
  newChild(): null { return null; }
}

export abstract class SourceStyle<
  Self extends SourceStyle<Self, Child>,
  Child extends Inheritable<Child, Self, Self, AnyNode>
> extends Inheritable<Self, Self, null, Child> {
  constructor(name: string) { super(name, null); }
  get block(): Self { return this.root; }
}

export abstract class StyleNode<
  Self extends Style<Self, Root, Parent, Child>,
  Root extends SourceNode<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode | null, Self>,
  Child extends Inheritable<Child, Root, Self, AnyNode | null>
> extends Style<Self, Root, Parent, Child> {
  constructor(name: string, parent: Parent) { super(name, parent); }
  get block(): Root { return this.root; }
}

export abstract class SinkStyle<
  Self extends Style<Self, Root, Parent, null>,
  Root extends SourceNode<Root, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode | null, Self>
> extends Style<Self, Root, Parent, null> {
  constructor(name: string, parent: Parent) { super(name, parent); }
  get block(): Root { return this.root; }
  newChild() { return null; }
}

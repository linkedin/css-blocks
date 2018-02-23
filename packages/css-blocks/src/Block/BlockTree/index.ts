import { Inheritable } from "./Inheritable";
import { Style } from "./Style";

export { Ruleset } from "./RulesetContainer";
export { Style, isStyle } from "./Style";

// Its days like these that I wish JavaScript had multiple inheritance.
export abstract class Source<
  Self extends Source<Self, Child>,
  Child extends Inheritable<Child, Self, Self, any>
> extends Inheritable<Self, Self, null, Child> {
  constructor(name: string) { super(name); }
  public parent: null;
  public block: Self;
  protected _children: Map<string, Child>;
  protected _root: Self;
}

export abstract class Node<
  Self extends Node<Self, Root, Parent, Child>,
  Root extends Source<Root, any>,
  Parent extends Inheritable<Parent, Root, any, Self>,
  Child extends Inheritable<Child, Root, Self, any>
> extends Inheritable<Self, Root, Parent, Child> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
  public parent: Parent;
  public block: Root;
  protected _children: Map<string, Child>;
  protected _root: Root;
}

export abstract class Sink<
  Self extends Inheritable<Self, Root, Parent, null>,
  Root extends Source<Root, any>,
  Parent extends Inheritable<Parent, Root, any, Self>
> extends Inheritable<Self, Root, Parent, null> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
  public parent: Parent;
  public block: Root;
  protected _children: Map<string, null>;
  protected _root: Root;
}

export abstract class NodeStyle<
  Self extends Style<Self, Root, Parent, Child>,
  Root extends Source<Root, any>,
  Parent extends Inheritable<Parent, Root, any, Self>,
  Child extends Inheritable<Child, Root, Self, any>
> extends Style<Self, Root, Parent, Child> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
  public parent: Parent;
  public block: Root;
  protected _children: Map<string, Child>;
  protected _root: Root;
}

export abstract class SinkStyle<
  Self extends Style<Self, Root, Parent, null>,
  Root extends Source<Root, any>,
  Parent extends Inheritable<Parent, Root, any, Self>
> extends Style<Self, Root, Parent, null> {
  constructor(name: string, parent: Parent, root: Root) { super(name, parent, root); }
  public parent: Parent;
  public block: Root;
  protected _children: Map<string, null>;
  protected _root: Root;
}

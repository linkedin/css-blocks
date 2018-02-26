/**
 * The `BlockTree` module delivers a collection of abstract utility classes that allow consumers to
 * define their own type-safe, single-typed-children, tree nodes.
 *
 * This being a CSS library, there are two (2) different types of node classes to inherit from:
 *  - `Container` nodes and deliver the core `Inheritable` interface and are intended to contain
 *     similar groups of BlockObjects like States or Classes.
 *  - `Style` nodes represent individual BlockObjects like States or Classes. The inherit from the
 *     `Style` class, and have all the same core `Inheritable` interfaces, plus functionality for
 *     tracking ruleset concerns via a `RulesetContainer`, and selector traits associated with the
 *     BlockObject.
 *
 * Both the `Container` and `Style` node types deliver Source, Sink and basic Node variants. Classes
 * extending these abstracts must supply the type interfaces required for the node type it is extending.
 * These types are:
 *
 *  - Source: <Self, Child>
 *  - Node:   <Self, Root, Parent, Child>
 *  - Sink:   <Self, Root, Parent>
 *
 * By requiring these explicit types to be provided, the core `Inheritable` class can ensure type safety
 * while constructing / traversing the tree.
 *
 * @module Block/BlockTree
 */
import { SourceLocation } from "../../SourceLocation";
import { InvalidBlockSyntax } from "../../errors";

import { AnyNode, Inheritable } from "./Inheritable";
import { Style } from "./Style";
export { Ruleset } from "./RulesetContainer";

/**
 * Class representing a source container node.
 * @extends Inheritable
 */
export abstract class SourceContainer<
  Self extends SourceContainer<Self, Child>,
  Child extends Inheritable<Child, Self, Self, AnyNode>
> extends Inheritable<Self, Self, null, Child> {
  constructor(name: string) { super(name, null); }
  get block(): Self { return this.root; }
}

/**
 * Class representing a container node.
 * @extends Inheritable
 */
export abstract class Container<
  Self extends Container<Self, Root, Parent, Child>,
  Root extends Inheritable<Root, Root, null, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode | null, Self>,
  Child extends Inheritable<Child, Root, Self, AnyNode | null>
> extends Inheritable<Self, Root, Parent, Child> {
  constructor(name: string, parent: Parent) { super(name, parent); }
}

/**
 * Class representing a sink container node.
 * @extends Inheritable
 */
export abstract class SinkContainer<
  Self extends SinkContainer<Self, Root, Parent>,
  Root extends Inheritable<Root, Root, null, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode | null, Self>
> extends Inheritable<Self, Root, Parent, null> {
  constructor(name: string, parent: Parent) { super(name, parent); }
  newChild(): null { return null; }
  lookup(path: string, errLoc?: SourceLocation): AnyNode | undefined {
    if (path === "") { return this; }
    if (errLoc) {
      throw new InvalidBlockSyntax(`No Style "${path}" found on Node "${this.name}".`, errLoc);
    }
    return undefined;
  }
}

// Its days like these that I wish JavaScript had multiple inheritance.

/**
 * Class representing a source style node.
 * @extends Style
 */
export abstract class SourceStyle<
  Self extends SourceStyle<Self, Child>,
  Child extends Inheritable<Child, Self, Self, AnyNode>
> extends Style<Self, Self, null, Child> {
  constructor(name: string) { super(name, null); }
}

/**
 * Class representing a style node.
 * @extends Style
 */
export abstract class StyleNode<
  Self extends StyleNode<Self, Root, Parent, Child>,
  Root extends Inheritable<Root, Root, null, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode | null, Self>,
  Child extends Inheritable<Child, Root, Self, AnyNode | null>
> extends Style<Self, Root, Parent, Child> {
  constructor(name: string, parent: Parent) { super(name, parent); }
}

/**
 * Class representing a sink style node.
 * @extends Style
 */
export abstract class SinkStyle<
  Self extends Style<Self, Root, Parent, null>,
  Root extends Inheritable<Root, Root, null, AnyNode>,
  Parent extends Inheritable<Parent, Root, AnyNode | null, Self>
> extends Style<Self, Root, Parent, null> {
  constructor(name: string, parent: Parent) { super(name, parent); }
  newChild() { return null; }
  lookup(path: string, errLoc?: SourceLocation): AnyNode | undefined {
    if (path === "") { return this; }
    if (errLoc) {
      throw new InvalidBlockSyntax(`No Style "${path}" found on Node "${this.name}".`, errLoc);
    }
    return undefined;
  }
}

/**
 * The `Inheritable` module delivers the core data structure for making type safe,
 * single-typed-children, tree nodes.
 *
 * This abstract class, in order to support tree nodes of *any* kind, makes creative
 * use of the `any` type in a few places – but don't be fooled! These typing holes
 * are *required* to be plugged by any by any implementing class by virtue of the type
 * generics they are forced to provide when extending. By the time this abstract class
 * is exposed to the outside world, all typing holes have been plugged and we are left
 * with a fully typed tree structure.
 *
 * @module Block/BlockTree/Inheritable
 */
import { ObjectDictionary } from "@opticss/util";

import { SourceLocation } from "../../SourceLocation";

/* tslint:disable:prefer-whatever-to-any */
export type AnyNode = Inheritable<any, any, any, any>;

export abstract class Inheritable<
  Self extends Inheritable<Self, Root, Parent, Child>,
  Root extends Inheritable<any, Root, null, AnyNode> | Self,
  Parent extends Inheritable<any, Root, AnyNode | null, Self> | null,
  Child extends Inheritable<any, Root, Self, AnyNode | null> | null
> {
/* tslint:enable:prefer-whatever-to-any */

  protected _name: string;
  protected _base: Self | undefined;
  protected _root: Root | Self;
  protected _parent: Parent;
  protected _children: Map<string, Child> = new Map();

  /**
   * Given a parent that is a base class of this style, retrieve this style's
   * base style from it, if it exists. This method does not traverse into base styles.
   */
  protected abstract newChild(name: string): Child;

  /**
   * Inheritable constructor
   * @param name Name for this Inheritable instance.
   * @param parent The parent Inheritable of this node.
   */
  constructor(name: string, parent: Parent) {
    this._name = name;
    this._parent = parent;
    this._root = parent ? parent.root : this.asSelf(); // `Root` is only set to `Self` for `Source` nodes.
  }

  public get name(): string { return this._name; }
  public get parent(): Parent { return this._parent; }

  /**
   * Get the style that this style inherits from, if any.
   *
   * This walks down the declared styles of the parent's inheritance chain,
   * and attempts to find a matching directly declared style on each.
   *
   * The result is cached because it never changes and is decidable as soon
   * as the style is instantiated.
   */
  public get base(): Self | undefined {
    if (this._base !== undefined || !this.parent) {
      return this._base || undefined;
    }
    let baseParent: Parent | undefined = this.parent.base;
    while (baseParent) {
      let cls = baseParent ? baseParent.getChild(this.name) : undefined;
      if (cls) {
        this._base = cls;
        return cls;
      }
      baseParent = baseParent.base;
    }
    return this._base = undefined;
  }

  /**
   * Traverse parents and return the base block object.
   * @returns The base node in this tree.
   */
  public get root(): Root {
    // This is a safe cast because we know root will only be set to `Self` for `Source` nodes.
    return this._root as Root;
  }

  /**
   * The `block` property is an alias for `root`. This isn't the dryest place to put
   * this line, but every extension re-declared this interface itself and I wanted it
   * in one place.
   * @returns The base node in this tree.
   */
  public get block(): Root { return this.root; }

  public abstract lookup(path: string, errLoc?: SourceLocation): AnyNode | undefined;

  /**
   * Sets the base node that this node inherits from. Must be of same type.
   * @prop base The new base node.
   */
  public setBase(base: Self) {
    this._base = base;
  }

  /**
   * Compute all block objects that are implied by this block object through
   * inheritance. Does not include this object or the styles it implies through
   * other relationships to this object.
   *
   * If nothing is inherited, this returns an empty array.
   * @returns The array of nodes this node inherits from.
   */
  public resolveInheritance(): Self[] {
    let inherited: Self[] = [];
    let base: Self | undefined = this.base;
    while (base) {
      inherited.unshift(base);
      base = base.base;
    }
    return inherited;
  }

  /**
   * Resolves the child with the given name from this node's inheritance
   * chain. Returns undefined if the child is not found.
   * @param name The name of the child to resolve.
   * @returns The child node, or `null`
   */
  protected resolveChild(name: string): Child | null {
    let state: Child | null = this.getChild(name);
    let container: Self | undefined = this.base;
    while (!state && container) {
      state = container.getChild(name);
      container = container.base;
    }
    return state || null;
  }

  /**
   * Retrieve a child node from this object at `key`.
   * @param key string  The key to fetch the child object from.
   * @returns The child node.
   */
  protected getChild(key: string): Child | null {
    return this._children.get(key) || null;
  }

  /**
   * Set a child node on this object at `key`.
   * @param key string  The key to set the child object to.
   * @returns The child node.
   */
  protected setChild(key: string, value: Child): Child {
    this._children.set(key, value);
    return value;
  }

  /**
   * Ensure a child node exists on this object at `key`. If it does not, create it.
   * If `key` is not provided, use the child name as the key.
   * @param name string  The name of this object to ensure.
   * @param key string  The key at which this child object should be (optional)
   * @returns The child node.
   */
  protected ensureChild(name: string, key?: string): Child {
    key = key !== undefined ? key : name;
    if (!this._children.has(name)) {
      this.setChild(key, this.newChild(name));
    }
    return this._children.get(key) as Child;
  }

  /**
   * Returns an array of all children nodes in the order they were added.
   * @returns The children array.
   */
  protected children(): Child[] {
    return [...this._children.values()];
  }

  /**
   * Returns a map of all children nodes at the keys they are stored..
   * @returns The children map.
   */
  protected childrenMap(): Map<string, Child> {
    return new Map(this._children);
  }

  /**
   * Returns a hash of all children nodes at the keys they are stored..
   * TODO: Cache this maybe? Convert entire model to only use hash?...
   * @returns The children hash.
   */
  protected childrenHash(): ObjectDictionary<Child> {
    let out = {};
    for (let [key, value] of this._children.entries()) {
      out[key] = value;
    }
    return out;
  }

  // TypeScript can't figure out that `this` is the `Self` so this private
  // method casts it in a few places where it's needed.
  private asSelf(): Self {
    return <Self><object>this;
  }

}

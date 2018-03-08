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
import { ParsedSelector, parseSelector, SelectorFactory } from "opticss";
import * as postcss from "postcss";

/* tslint:disable:prefer-whatever-to-any */
export type AnyNode = Inheritable<any, any, any, any, any>;

export abstract class Inheritable<
  Self extends Inheritable<Self, Root, Parent, Child, Token>,
  Root extends Inheritable<any, Root, never, AnyNode, any> | Self,
  Parent extends Inheritable<any, Root, AnyNode | null, Self, any> | null,
  Child extends Inheritable<any, Root, Self, AnyNode | never, any> | never,
  Token extends any = string,
> implements SelectorFactory {

  protected abstract get ChildConstructor(): { new(token: any, parent: Self): Child } | never;

/* tslint:enable:prefer-whatever-to-any */

  private readonly parsedRuleSelectors: WeakMap<postcss.Rule, ParsedSelector[]> | null;

  protected _token: Token;
  protected _base: Self | undefined;
  protected _root: Root | Self;
  protected _parent: Parent | null;
  protected _children: Map<string, Child> = new Map();

  /**
   * Inheritable constructor
   * @param name Name for this Inheritable instance.
   * @param parent The parent Inheritable of this node.
   */
  constructor(name: Token, parent?: Parent) {
    this._token = name;
    this._parent = parent || null;
    // `Root` is only set to `Self` for `Source` nodes.
    this._root = parent ? parent.root : this.asSelf();
    // `parsedRuleSelectors cache is only created if this is a root node.
    this.parsedRuleSelectors = this.isRootNode ? new WeakMap() : null;
  }

  protected tokenToUid(token: Token): string { return String(token); }

  protected newChild(token: Child["token"]): Child {
    return new this.ChildConstructor(token, this.asSelf());
  }

  private childToUid(token: Child["token"]): string {
    return this.ChildConstructor.prototype.tokenToUid(token);
  }

  /** @returns The token object used to create this node. */
  public get token(): Token { return this._token; }

  /** @returns The unique name of this node. */
  protected get uid(): string { return this.tokenToUid(this._token); }

  /** @returns The parent node in this tree. */
  protected get parent(): Parent { return this._parent as Parent; }

  /** @returns The root node in this tree. */
  protected get root(): Root { return this._root as Root; }

  /** @returns A boolean indicating if this is the root node in the Inheritable tree or not. */
  private get isRootNode(): boolean { return this._root === this.asSelf(); }

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
      let cls = baseParent ? baseParent.getChild(this.token) : undefined;
      if (cls) {
        this._base = cls;
        return cls;
      }
      baseParent = baseParent.base;
    }
    return this._base = undefined;
  }

  /**
   * The `block` property is an alias for `root`. This isn't the dryest place to put
   * this line, but every extension re-declared this interface itself and I wanted it
   * in one place.
   * @returns The base node in this tree.
   */
  public get block(): Root { return this.root; }

  /**
   * Compute all block objects that are implied by this block object through
   * inheritance. Does not include this object or the styles it implies through
   * other relationships to this object.
   *
   * The values are returned in inheritance order, with the first value
   * returned (if any) having no base, and the the last value returned (if any)
   * being the base of this object.
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
   * chain. Returns null if the child is not found.
   * @param name The name of the child to resolve.
   * @returns The child node, or `null`
   */
  protected resolveChild(token: Child["token"]): Child | null {
    let child: Child | null = this.getChild(token);
    let container: Self | undefined = this.base;
    while (!child && container) {
      child = container.getChild(token);
      container = container.base;
    }
    return child || null;
  }

  /**
   * Retrieve a child node from this object at `key`.
   * @param key string  The key to fetch the child object from.
   * @returns The child node.
   */
  protected getChild(token: Child["token"]): Child | null {
    return this._children.get(this.childToUid(token)) || null;
  }

  /**
   * Set a child node on this object at `key`.
   * @param key string  The key to set the child object to.
   * @returns The child node.
   */
  protected setChild(token: Child["token"], value: Child): Child {
    this._children.set(this.childToUid(token), value);
    return value;
  }

  /**
   * Ensure a child node exists on this object at `key`. If it does not, create it.
   * If `key` is not provided, use the child name as the key.
   * @param name string  The name of this object to ensure.
   * @param key string  The key at which this child object should be (optional)
   * @returns The child node.
   */
  protected ensureChild(token: Child["token"], key?: string): Child {
    key = key !== undefined ? key : this.childToUid(token);
    if (!this._children.has(key)) {
      this._children.set(key, this.newChild(token));
    }
    return this._children.get(key)!;
  }

  /**
   * Returns an array of all children nodes in the order they were added for Self.
   * @returns The children array.
   */
  protected children(): Child[] {
    return [...this._children.values()];
  }

  /**
   * Returns an array of all children nodes in the order they were added for
   * self and all inherited children.
   * @returns The children array.
   */
  protected resolveChildren(): Child[] {
    return [...this.resolveChildrenMap().values()];
  }

  /**
   * Returns a map of all children nodes at the keys they are stored..
   * @returns The children map.
   */
  protected childrenMap(): Map<string, Child> {
    return new Map(this._children);
  }

  /**
   * Returns a map of all children nodes at the keys they are stored..
   * @returns The children map.
   */
  protected resolveChildrenMap(): Map<string, Child> {
    let inheritance = [...this.resolveInheritance(), this.asSelf()];
    let out = new Map();
    for (let o of inheritance) {
      for (let [key, value] of o._children.entries()) {
        out.set(key, value);
      }
    }
    return out;
  }

  /**
   * Returns a hash of all children nodes at the keys they are stored..
   * TODO: Cache this maybe? Convert entire model to only use hash?...
   * @returns The children hash.
   */
  protected childrenHash(): ObjectDictionary<Child> {
    let out = {};
    for (let [key, value] of this._children) {
      out[key] = value;
    }
    return out;
  }

  /**
   * Returns a map of all children nodes at the keys they are stored..
   * @returns The children map.
   */
  protected resolveChildrenHash(): ObjectDictionary<Child> {
    let out = {};
    for (let [key, value] of this.resolveChildrenMap()) {
      out[key] = value;
    }
    return out;
  }

  /**
   * Every Block tree maintains its own local cache of parsed selectors.
   * From any sub-inheritable, or from the root inheritable itself,
   * given a PostCSS Rule, ensure it is present in the root Block's parsed rule
   * selectors cache, and return the ParsedSelector array.
   * @param rule  PostCSS Rule
   * @return ParsedSelector array
   */
  public getParsedSelectors(rule: postcss.Rule): ParsedSelector[] {
    if (!this.isRootNode) {
      return this.root.getParsedSelectors(rule);
    }

    let selectors = this.parsedRuleSelectors!.get(rule);
    if (!selectors) {
      selectors = parseSelector(rule);
      this.parsedRuleSelectors!.set(rule, selectors);
    }
    return selectors;
  }

  /**
   * TypeScript can't figure out that `this` is the `Self` so this private
   * method casts it in a few places where it's needed.
   */
  private asSelf(): Self {
    return <Self><object>this;
  }

}

import { ObjectDictionary } from "@opticss/util";
import { Style, Block, isBlock, isBlockClass, isState } from './index';

import { BlockPath } from "../BlockSyntax";
import { CssBlockError } from "../errors";

export abstract class Inheritable<
  Self extends Inheritable<Self, Parent, Child>,
  Parent extends Inheritable<any, any, Self> | null = null,
  Child extends Inheritable<any, Self, any> | null = null
> {

  protected _name: string;
  protected _base: Self | undefined;
  public _block: Block;
  protected _baseName: string;
  protected _parent: Parent | undefined;
  protected _children: Map<string, Child> = new Map;

  /**
   * Given a parent that is a base class of this style, retrieve this style's
   * base style from it, if it exists. This method does not traverse into base styles.
   */
  protected abstract newChild(name: string): Child;

  // TODO: Currently only ever returns itself if is a style. Need to get it to look other things up.
  public lookup(path: string | BlockPath): Style | undefined {
    path = new BlockPath(path);
    if (isBlockClass(this) || isState(this)) return this;
    return undefined;
  }

  /**
   * Inheritable constructor
   * @param name Name for this Inheritable instance.
   * @param parent The parent Inheritable of this node.
   */
  constructor(name: string, parent?: Parent,) {
    this._name = name;
    this._parent = parent;
  }

  public get name(): string { return this._name; }
  public get baseName(): string | undefined { return this._baseName; }
  public get parent(): Parent | undefined { return this._parent; }

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
   * traverse parents and return the base block object.
   * @returns The base block in this container tree.
   */
  public get block(): Block {
    if (isBlock(this)) { return this._block = this; }
    if (this._block !== undefined) { return this._block; }
    if (this.parent) { return this._block = this.parent.block; }
    throw new CssBlockError("Tried to access `block` on an orphaned `Style`");
  }

  setBase(baseName: string, base: Self) {
    this._baseName = baseName;
    this._base = base;
  }

  /**
   * Compute all block objects that are implied by this block object through
   * inheritance. Does not include this object or the styles it implies through
   * other relationships to this object.
   *
   * If nothing is inherited, this returns an empty set.
   */
  resolveInheritance(): Self[] {
    let inherited = new Array<Self>();
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
   */
  resolveChild(name: string): Child | null {
    let state: Child | null = this.getChild(name);
    let container: Self | undefined = this.base;
    while (!state && container) {
      state = container.getChild(name);
      container = container.base;
    }
    return state || null;
  }

  /**
   * Given a parent that is a base class of this style, retrieve this style's
   * base style from it, if it exists. This method does not traverse into base styles.
   */
  protected getChild(key: string): Child | null {
    return this._children.get(key) || null;
  }

  protected setChild(key: string, value: Child): Child {
    this._children.set(key, value);
    return value;
  }

  protected ensureChild(name: string): Child {
    if (!this._children.has(name)) {
      this.setChild(name, this.newChild(name));
    }
    return this._children.get(name) as Child;
  }

  protected children(): Child[]{
    return [...this._children.values()];
  }

  // TODO: Cache this maybe? Convert entire model to only use hash?...
  protected childrenHash(): ObjectDictionary<Child> {
    let out = {};
    for (let [key, value] of this._children.entries() ) {
      out[key] = value;
    }
    return out;
  }

}

export abstract class Source<
  Self extends Inheritable<Self, null, Child>,
  Child extends Inheritable<Child, Self, any>
> extends Inheritable<Self, null, Child> {
  public parent: null;
  protected _children: Map<string, Child>;
}

export abstract class Node<
  Self extends Inheritable<Self, Parent, Child>,
  Parent extends Inheritable<Parent, any, Self>,
  Child extends Inheritable<Child, Self, any>
> extends Inheritable<Self, Parent, Child> {
  public parent: Parent;
  protected _children: Map<string, Child>;
}

export abstract class Sink<
  Self extends Inheritable<Self, Parent, null>,
  Parent extends Inheritable<any, any, Self>
> extends Inheritable<Self, Parent, null> {
  public parent: Parent;
  protected _children: Map<string, null>;
}

import { ObjectDictionary } from "@opticss/util";
import { whatever } from "@opticss/util";

/* tslint:disable:prefer-whatever-to-any */
export type AnyNode = Inheritable<any, any, any, any>;

export abstract class Inheritable<
  Self extends Inheritable<Self, Root, Parent, Child>,
  Root extends Inheritable<any, Root, null, any> | Self,
  Parent extends Inheritable<any, Root, any, Self> | null,
  Child extends Inheritable<any, Root, Self, any> | null
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

  // // TODO: Currently only ever returns itself if is a style. Need to get it to look other things up.
  // public lookup(path: string | BlockPath): Self | Child | Descendants | undefined {
  //   path = new BlockPath(path);
  //   let res: Self | Child | Descendants | null = this.asSelf();
  //   for (let part of path.tokens()) {
  //     res = res.resolveChild(part);
  //     if (!res) { break; }
  //   }
  //   return res ? res : undefined;
  // }

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
   * traverse parents and return the base block object.
   * @returns The base block in this container tree.
   */
  public get root(): Root {
    // This is a safe cast because we know root will only be set to `Self` for `Source` nodes.
    return this._root as Root;
  }

  public setBase(base: Self) {
    this._base = base;
  }

  /**
   * Compute all block objects that are implied by this block object through
   * inheritance. Does not include this object or the styles it implies through
   * other relationships to this object.
   *
   * If nothing is inherited, this returns an empty array.
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
   */
  public resolveChild(name: string): Child | null {
    let state: Child | null = this.getChild(name);
    let container: Self | undefined = this.base;
    while (!state && container) {
      state = container.getChild(name);
      container = container.base;
    }
    return state || null;
  }

  // /**
  //  * Find the closest common ancestor Block between two Styles
  //  * TODO: I think there is a more efficient way to do this.
  //  * @param relative  Style to compare ancestry with.
  //  * @returns The Style's common Block ancestor, or null.
  //  */
  // commonAncestor(relative: Style<Child>): Style<Child> | null {
  //   let blockChain = new Set(...this.block.rootClass.resolveInheritance()); // lol
  //   blockChain.add(this.block.rootClass);
  //   let common = [relative.block.rootClass, ...relative.block.rootClass.resolveInheritance()].filter(b => blockChain.has(b));
  //   return common.length ? common[0] as Style<Child> : null;
  // }

  /**
   * Given a parent that is a base class of this style, retrieve this style's
   * base style from it, if it exists. This method does not traverse into base styles.
   */
  public getChild(key: string): Child | null {
    return this._children.get(key) || null;
  }

  public setChild(key: string, value: Child): Child {
    this._children.set(key, value);
    return value;
  }

  public ensureChild(name: string, key?: string): Child {
    key = key !== undefined ? key : name;
    if (!this._children.has(name)) {
      this.setChild(key, this.newChild(name));
    }
    return this._children.get(key) as Child;
  }

  public children(): Child[] {
    return [...this._children.values()];
  }

  public childrenMap(): Map<string, Child> {
    return new Map(this._children);
  }

  // TODO: Cache this maybe? Convert entire model to only use hash?...
  public childrenHash(): ObjectDictionary<Child> {
    let out = {};
    for (let [key, value] of this._children.entries()) {
      out[key] = value;
    }
    return out;
  }

  // TypeScript can't figure out that `this` is the `Self` so this private
  // method casts it in a few places where it's needed.
  private asSelf(): Self {
    return <Self><whatever>this;
  }

}

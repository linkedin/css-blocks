import { Attr } from "@opticss/element-analysis";

import { RulesetContainer } from './RulesetContainer';
import { OptionsReader } from "../OptionsReader";
import { unionInto } from '../util/unionInto';
import { Inheritable } from "./Inheritable";

/**
 * Abstract class that serves as the base for all Styles. Contains basic
 * properties and abstract methods that extenders must implement.
 */
export abstract class Style<
  Self extends Style<any, any, any>,
  Parent extends Inheritable<Parent, any, Self>,
  Child extends Inheritable<any, Self, any> | null = null
> extends Inheritable<Self, Parent, Child> {

  public readonly rulesets: RulesetContainer;

  /** cache of resolveStyles() */
  private _resolvedStyles: Set<Self> | undefined;

  /**
   * Save name, parent container, and create the PropertyContainer for this data object.
   */
  constructor(name: string, parent: Parent) {
    super(name, parent);
    this.rulesets = new RulesetContainer();
  }

  /**
   * Return the local identifier for this `Style`.
   * @returns The local name.
   */
  public abstract localName(): string;

  /**
   * Return an attribute for analysis using the authored source syntax.
   */
  public abstract asSourceAttributes(): Attr[];

  /**
   * Return the source selector this `Style` was read from.
   * @returns The source selector.
   */
  public abstract asSource(): string;

  /**
   * Return the css selector for this `Style`.
   * @param opts Option hash configuring output mode.
   * @returns The CSS class.
   */
  public abstract cssClass(opts: OptionsReader): string;

  /**
   * Returns all the classes needed to represent this block object
   * including inherited classes.
   * @returns this object's css class and all inherited classes.
   */
  cssClasses(opts: OptionsReader): string[] {
    let classes: string[] = [];
    for (let style of this.resolveStyles()) {
      classes.push(style.cssClass(opts));
    }
    return classes;
  }

  /**
   * Return all Block Objects that are implied by this object.
   * This takes inheritance, state/class correlations, and any
   * other declared links between styles into account.
   *
   * This block object is included in the returned result so the
   * resolved value's size is always 1 or greater.
   */
  public resolveStyles(): Set<Self> {
    if (this._resolvedStyles) {
      return new Set(this._resolvedStyles);
    }

    let inheritedStyles = this.resolveInheritance();
    this._resolvedStyles = new Set(inheritedStyles);
    this._resolvedStyles.add(this.asStyle());

    for (let s of inheritedStyles) {
      let implied = s.impliedStyles();
      if (!implied) continue;
      for (let i of implied) {
        unionInto(this._resolvedStyles, i.resolveStyles());
      }
    }

    return new Set(this._resolvedStyles);
  }

  /**
   * Returns the styles that are directly implied by this style.
   * Does not include the styles that this style inherits implied.
   * Does not include the styles that this style implies inherits.
   *
   * returns undefined if no styles are implied.
   */
  impliedStyles(): Set<Self> | undefined {
    return undefined;
  }

  /**
   * Compute all block objects that are implied by this block object through
   * inheritance. Does not include this object or the styles it implies through
   * other relationships to this object.
   *
   * If nothing is inherited, this returns an empty set.
   */
  resolveInheritance(): Self[] {
    let inherited: Self[] = [];
    let base: Self | undefined = this.base;
    while (base) {
      inherited.unshift(base);
      base = base.base;
    }
    return inherited;
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
   * Debug utility to help log Styles
   * @param opts  Options for rendering cssClass.
   * @returns A debug string.
   */
  asDebug(opts: OptionsReader) {
    return `${this.asSource()} => ${this.cssClasses(opts).map(n => `.${n}`).join(" ")}`;
  }

  // TypeScript can't figure out that `this` is the `StyleType` so this private
  // method casts it in a few places where it's needed.
  private asStyle(): Self {
    return <Self><any>this;
  }
}

export abstract class NodeStyle<
  Self extends Style<Self, Parent, Child>,
  Parent extends Inheritable<Parent, any, Self>,
  Child extends Inheritable<Child, Self, any>
> extends Style<Self, Parent, Child> {
  public parent: Parent;
  protected _children: Map<string, Child>;
}

export abstract class SinkStyle <
  Self extends Style<Self, Parent, null>,
  Parent extends Inheritable<Parent, any, Self>
> extends Style<Self, Parent, null> {
  public parent: Parent;
  protected _children: Map<string, null>;
}

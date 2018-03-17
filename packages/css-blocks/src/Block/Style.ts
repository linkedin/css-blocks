import { Attr } from "@opticss/element-analysis";

import { ReadonlyOptions } from "../options";
import { unionInto } from "../util/unionInto";

import { AnyNode, Inheritable } from "./Inheritable";
import { RulesetContainer } from "./RulesetContainer";

export { RulesetContainer, Resolution, Ruleset } from "./RulesetContainer";

/**
 * Abstract class that serves as the base for all Styles. Contains basic
 * properties and abstract methods that extenders must implement.
 */
/* tslint:disable:prefer-whatever-to-any */

export abstract class Style<
  Self extends Style<Self, Root, Parent, Child, Token>,
  Root extends Inheritable<any, Root, never, AnyNode, any> | Self,
  Parent extends Inheritable<any, Root, AnyNode | null, Self, any> | null,
  Child extends Inheritable<any, Root, Self, AnyNode | never, any> | never,
  Token extends any = string,
> extends Inheritable<Self, Root, Parent, Child> {
/* tslint:enable:prefer-whatever-to-any */

  /** cache of resolveStyles() */
  private _resolvedStyles: Set<Self> | undefined;

  // tslint:disable-next-line:prefer-whatever-to-any
  public abstract readonly rulesets: RulesetContainer<any>;

  /**
   * Save name, parent container, and create the PropertyContainer for this data object.
   */
  constructor(name: string, parent?: Parent) {
    super(name, parent);
  }

  /**
   * Return the css selector for this `Style`.
   * @param opts Option hash configuring output mode.
   * @returns The CSS class.
   */
  public abstract cssClass(opts: ReadonlyOptions): string;

  /**
   * Return the source selector this `Style` was read from.
   * @returns The source selector.
   */
  public abstract asSource(): string;

  /**
   * Return an attribute for analysis using the authored source syntax.
   */
  public abstract asSourceAttributes(): Attr[];

  /**
   * Returns all the classes needed to represent this block object
   * including inherited classes.
   * @returns this object's css class and all inherited classes.
   */
  cssClasses(opts: ReadonlyOptions): string[] {
    let classes: string[] = [];
    for (let style of this.resolveStyles()) {
      classes.push(style.cssClass(opts));
    }
    return classes;
  }

  /**
   * Return all Block Objects that are implied by this object.
   * This takes inheritance, attr/class correlations, and any
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
   * Returns the styles that are implied by this style.
   * TODO: Placeholder for when we implement class composition. (https://github.com/css-blocks/css-blocks/issues/72)
   *
   * @returns The Style objects, or undefined if no styles are implied.
   */
  impliedStyles(): Set<Self> | undefined {
    return undefined;
  }

  /**
   * Debug utility to help log Styles
   * @param opts  Options for rendering cssClass.
   * @returns A debug string.
   */
  asDebug(opts: ReadonlyOptions) {
    return `${this.asSource()} => ${this.cssClasses(opts).map(n => `.${n}`).join(" ")}`;
  }

  // TypeScript can't figure out that `this` is the `StyleType` so this private
  // method casts it in a few places where it's needed.
  private asStyle(): Self {
    return <Self><object>this;
  }
}

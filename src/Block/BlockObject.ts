import { unionInto } from '../util/unionInto';
import * as postcss from 'postcss';
import { OptionsReader } from "../OptionsReader";
import { CompoundSelector } from "opticss";
import { Attr, Attribute } from "@opticss/template-api";
import { State, Block, BlockClass } from "./index";

type Properties = Set<string>;

/**
 * Cache and interface methods for block properties.
 */
export class PropertyContainer {
  private props: Properties = new Set();
  private pseudoProps = new Map<string,Properties>();

  /**
   * Track a single property.
   * @param	property	The property we're tracking
   * @param	pseudo	The pseudo element this rule is styling, if applicable.
   */
  addProperty(property: string, pseudo?: string) {
    let props: Properties;
    if (pseudo) {
      props = this.pseudoProps.get(pseudo) || new Set();
      this.pseudoProps.set(pseudo, props);
    } else {
      props = this.props;
    }
    props.add(property);
  }

  /**
   * Track all properties from a ruleset in this block's PropertyContainer.
   * @param	rule	PostCSS ruleset
   * @param	block	External block
   */
  addProperties(rule: postcss.Rule, block: Block, filter?: (prop: string) => boolean) {
    let selectors = block.getParsedSelectors(rule);
    selectors.forEach((selector) => {
      let key = selector.key;
      let pseudo: string | undefined;
      if (key.pseudoelement) {
        pseudo = key.pseudoelement.toString();
      }
      rule.walkDecls((decl) => {
        if (!filter || filter && filter(decl.prop)) {
          this.addProperty(decl.prop, pseudo);
        }
      });
    });
  }

  /**
   * Retreive properties from all rulesets in this block.
   * @param	pseudo	Optional pseudo element to get properties from
   * @returns A set of property names.
   */
  getProperties(pseudo?: string): Set<string> {
    let props: Properties;
    if (pseudo) {
      props = this.pseudoProps.get(pseudo) || new Set();
      this.pseudoProps.set(pseudo, props);
      return props;
    } else {
      return this.props;
    }
  }

  /**
   * Retrieve the pseudo elements which were found to have properties.
   * @returns A set of property names.
   */
  getPseudos(): Set<string> {
    return new Set(this.pseudoProps.keys());
  }
}

/**
 * A Map of State objects
 */
type StateMap = ObjectDictionary<State>;

/**
 * A Map of State maps, holds groups of States
 */
type GroupMap = ObjectDictionary<StateMap>;

/**
 * Holds state values to be passed to the StateContainer.
 */
export interface StateInfo {
  group?: string;
  name: string;
}

/**
 * Cache and interface methods for block states and state groups.
 */
export class StateContainer {
  private _states: StateMap = {};
  private _groups: GroupMap = {};
  private _parent: Block | BlockClass;

  /**
   * Save a reference to our parent element on instantiation. Only Blocks and
   * BlockClasses can contain States.
   */
  constructor(parent: Block | BlockClass){
    this._parent = parent;
  }

  /**
   * Parent accessor.
   * @returns The parent object that contains these States
   */
  get parent(): Block | BlockClass {
    return this._parent;
  }

  /**
   * Insert a state into this container
   * @param state The State object to insert.
   * @param group Optional group name for this state object.
   * @returns The State that was just added
   */
  addState(state: State): State {
    let group: string | null = state.group;
    if (group) {
      this._groups[group] = (this._groups[group] || {});
      return this._groups[group][state.name] = state;
    } else {
      return this._states[state.name] = state;
    }
  }

  /**
   * Group getter. Returns a list of State objects in the requested group.
   * @param group State group for lookup or a boolean state name if substate is not provided.
   * @param substate Optional substate to filter states by.
   * @returns An array of all States that were requested.
   */
  getGroup(groupName: string, substate?: string|undefined): State[] {
    let group = this._groups[groupName];
    if ( group ) {
      if (substate && group[substate]) {
        return [group[substate]];
      }
      else if (substate) {
        return [];
      }
      else {
        return objectValues(group);
      }
    }
    else if (substate) {
      return [];
    }
    else if (this._states[groupName]) {
      return [this._states[groupName]];
    } else {
      return [];
    }
  }

  /**
   * like getGroup but includes the states from all super blocks for the group.
   * @param group State group for lookup
   * @param substate Optional substate to filter states by.
   * @returns A map of resolved state names to their states for all States that were requested.
   */
  resolveGroup(groupName: string, substate?: string|undefined): {[name: string]: State} | undefined {
    let resolution: {[name: string]: State} = {};
    this.getGroup(groupName, substate).forEach(state => {
      resolution[state.name] = state;
    });
    if (substate && resolution[substate]) {
      return resolution;
    }
    let base = this._parent.base;
    if (base) {
      let baseResolution = base.states.resolveGroup(groupName, substate);
      if (baseResolution) {
        resolution = Object.assign(baseResolution, resolution); // overwrite any base definitions with their overrides.
      }
    }
    if (Object.keys(resolution).length === 0) {
      return undefined;
    } else {
      return resolution;
    }
  }

  getGroups(): string[] {
    return Object.keys(this._groups);
  }

  getStates(group?: string): Array<State> | undefined {
    if (group) {
      let groupValue = this._groups[group];
      if (groupValue) {
        return objectValues(groupValue);
      } else {
        return undefined;
      }
    } else {
      return objectValues(this._states);
    }
  }

  /**
   * State getter
   * @param name The State's name to lookup.
   * @param group  Optional state group for lookup
   * @returns The State that was requested, or undefined
   */
  getState(name: string, group?: string): State | undefined {
    return group ? this._groups[group] && this._groups[group][name] : this._states[name];
  }

  /**
   * Legacy State getter
   * @param info The StateInfo type to lookup, contains `name` and `group`
   * @returns The State that was requested, or undefined
   */
  _getState(info: StateInfo): State | undefined {
    return info.group ? this._groups[info.group] && this._groups[info.group][info.name] : this._states[info.name];
  }

  /**
   * Ensure that a `State` with the given `name` and `group` is registered with this Block.
   * @param name The State's name to ensure.
   * @param group  Optional state group for lookup/registration
   * @return The `State` object on this `Block`
   */
  ensureState(name: string, group?: string): State {
    let state = this.getState(name, group);
    if (state) {
      return state;
    } else {
      let state = new State(name, group, this.parent);
      return this.addState(state);
    }
  }

  /**
   * Legacy state ensurer. Ensure that a `State` with the given `StateInfo` is
   * registered with this Block.
   * @param info  `StateInfo` to verify exists on this `Block`
   * @return The `State` object on this `Block`
   */
  _ensureState(info: StateInfo): State {
    // Could assert that the stateinfo group name matched but yolo.
    if (this.getState(info.name, info.group)) {
      return <State>this.getState(info.name, info.group);
    } else {
      let state = new State(info.name, info.group, this.parent);
      return this.addState(state);
    }
  }

  /**
   * Debug utility to help test StateContainer.
   * @param options  Options to pass to States' asDebug method.
   * @return Array of debug strings for these states
   */
  debug(opts: OptionsReader): string[] {
    let result: string[] = [];
    this.all().forEach((state) => {
      result.push(state.asDebug(opts));
    });
    return result;
  }

  /**
   * Returns all states contained in this Container
   * @return Array of all State objects
   */
  all(): State[] {
    let result: State[] = [];
    for (let group of objectValues(this._groups)) {
      result.push(...objectValues(group));
    }
    result.push(...objectValues(this._states));
    return result;
  }
}

/**
 * Interface used when exporting a BlockObject using `asExport`.
 */
export interface Export {
  identifier: string;
  value: string;
}

/**
 * Valid parent types for a BlockObject
 */
export type BlockParent = Block | BlockClass | undefined;

/**
 * Abstract class that serves as the base for all BlockObjects. Contains basic
 * properties and abstract methods that extenders must implement.
 */
export abstract class BlockObject {
  protected _name: string;
  protected _container: BlockParent;
  protected _compiledAttribute: any;

  public readonly propertyConcerns: PropertyContainer;

  /**
   * Save name, parent container, and create the PropertyContainer for this data object.
   */
  constructor(name: string, container?: BlockParent){
    this._name = name;
    this._container = container;
    this.propertyConcerns = new PropertyContainer();
  }

  /**
   * Readonly name of this object.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Block parent container.
   */
  get parent(): BlockParent {
    return this._container;
  }

  /**
   * Get the inherited block object for this block object of the same name and type.
   * @returns The base inherited block object.
   */
  public abstract get base(): BlockObject | undefined;

  /**
   * Return the local identifier for this `BlockObject`.
   * @returns The local name.
   */
  public abstract localName(): string;

  /**
   * Return an attribute for analysis using the authored source syntax.
   */
  public abstract asSourceAttributes(): Attr[];

  /**
   * Return the source selector this `BlockObject` was read from.
   * @returns The source selector.
   */
  public abstract asSource(): string;

  /**
   * Return the css selector for this `BlockObject`.
   * @param opts Option hash configuring output mode.
   * @returns The CSS class.
   */
  public abstract cssClass(opts: OptionsReader): string;

  /**
   * Return true or false if the given `CompoundSelector`.
   * @param opts An options hash with an `outputMode` property of type `OutputMode` to switch output type.
   * @returns The CSS class.
   */
  public abstract matches(compoundSel: CompoundSelector): boolean;

  /**
   * Returns the list of all `BlockObjects` that are ancestors of this block.
   */
  public abstract all(): BlockObject[];

  /**
   * Crawl up the container tree and return the base block object.
   * @returns The base block in this container tree.
   */
  get block(): Block {
    let tmp: BlockObject | undefined = this;
    while (tmp.parent) {
      tmp = tmp.parent;
    }
    return <Block>tmp;
  }

  /**
   * Returns all the classes needed to represent this block object
   * including inherited classes.
   * @returns this object's css class and all inherited classes.
   */
  cssClasses(opts: OptionsReader): string[] {
    let classes = new Array<string>();
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
  public resolveStyles(): Set<BlockObject> {
    let styles = this.resolveInheritance();
    styles.add(this);
    return styles;
  }

  /**
   * Compute all block objects that are implied by this block object through
   * inheritance. Does not include this object or the styles it implies through
   * other relationships to this object but it does include all resolved styles
   * for inherited objects.
   *
   * If nothing is inherited, this returns an empty set.
   */
  resolveInheritance(): Set<BlockObject> {
    let inherited = new Set<BlockObject>();
    inherited.add(this);
    if (this.base) {
      unionInto(inherited, this.base.resolveStyles());
    }
    return inherited;
  }

  asCompiledAttributes(opts: OptionsReader): Attribute[] {
    if (!this._compiledAttribute) {
      let classNames = this.cssClasses(opts);
      let classValue = (classNames.length > 1) ?
        {allOf: classNames.map(c => ({constant: c}))} :
        {constant: classNames[0]};
      this._compiledAttribute = new Attribute("class", classValue);
    }
    return [this._compiledAttribute];
  }

  /**
   * Standard export method for a given block.
   * @param opts  Options for rendering cssClass.
   * @returns The Export object representing this BlockObject.
   */
  asExport(opts: OptionsReader): Export {
    return {
      identifier: this.localName(),
      value: this.cssClass(opts)
    };
  }

  /**
   * Debug utility to help log BlockObjects
   * @param opts  Options for rendering cssClass.
   * @returns A debug string.
   */
  asDebug(opts: OptionsReader) {
    return `${this.asSource()} => ${this.cssClasses(opts).map(n => `.${n}`).join(" ")}`;
  }

}

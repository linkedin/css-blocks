import * as postcss from "postcss";
import { OptionsReader } from "../options";
import { CompoundSelector } from "../parseSelector";
import { State, Block, BlockClass } from "./index";

// `Object.values` does not exist in node<=7.0.0, load a polyfill if needed.
if (!(<any>Object).values) {
  require('object.values').shim();
}

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
interface StateMap {
  [stateName: string]: State;
}

/**
 * A Map of State maps, holds groups of States
 */
interface GroupMap {
  [groupName: string]: StateMap;
}

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
   * @param group State group for lookup
   * @param substate Optional substate to filter states by.
   * @returns An array of all States that were requested.
   */
  getGroup(groupName: string, substate?: string|undefined): State[] {
    let group: StateMap = this._groups[groupName];
    if ( group ) {
      return substate ? [group[substate]] : (<any>Object).values(group);
    }
    else {
      return substate ? [] : [this._states[groupName]];
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
  all(): BlockObject[] {
    let result: BlockObject[] = [];
    Object.keys(this._groups).forEach((group) => {
      result = result.concat((<any>Object).values(this._groups[group]));
    });
    result = result.concat((<any>Object).values(this._states));
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
   * Readonly Block name.
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
    let classes = [this.cssClass(opts)];
    let base = this.base;
    while (base) {
      classes.push(base.cssClass(opts));
      base = base.base;
    }
    return classes;
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

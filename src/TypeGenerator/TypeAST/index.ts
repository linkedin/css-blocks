
function toCamelCase(input: string) {
  input = input.replace(/-(.)/g, function(match, group1) {
      return match && group1.toUpperCase();
  });
  return input.replace(/^(.)/g, function(match, group1) {
      return match && group1.toUpperCase();
  });
}

/**
 * The `ObjType` object represents typing information for CSS Block `Root` and
 * `BlockClass` objects. They may contain states (`FuncType`) and other
 * classes (`ObjType`).
 */
export default class ObjType {

  // Private Maps to store namespace and existing object info.
  private identsNamespace: Map<string, number>;
  private states: Map<string, FuncType> = new Map;
  private klasses: Map<string, ObjType> = new Map;

  name: string;
  children: Map<string, ObjType | FuncType> = new Map;

  // Map of property name to valid types list
  properties: { [name: string]: string[] } = {};

  // Map of method name to list argument types.
  methods: { [name: string]: Set<string>[] } = {};

  /**
   * The `ObjType` object receives a name for its class, and an identifer namespace.
   * The identifer namespace is propagates down the AST to globally unique names
   * in the types file.
   * @param name Requested name for this Class type.
   * @param idents? Optional identifer namespace.
   */
  constructor( name: string, idents?: Map<string, number> ) {

    this.identsNamespace = idents || new Map;

    name = this.name = idents ? `${toCamelCase(name)}Class` : toCamelCase(name);

    // Ensure unique type identifier names.
    let i = 0;
    if ( this.identsNamespace.has(name) ) {
      i = this.identsNamespace.get(name) as number;
      this.name += i;
    }
    this.identsNamespace.set(name, ++i);

  }

  private _childCount = 0;
  childCount(){
    return this._childCount;
  }

  /**
   * Add a tracked property to the `ObjType` definition.
   * @param name Name of this property.
   * @return The new or modified `ObjType` instance.
   */
   addProp(name: string): ObjType {
    this._childCount++;
    let type = this.klasses.get(name);

    if ( !type ) {
      type = new ObjType(name, this.identsNamespace);
      this.klasses.set(name, type);
      if ( !this.properties[name] ){ this.properties[name] = []; }
      this.properties[name].push(type.name);
      this.children.set(type.name, type);
    }

    // If there is a method of the same name, remove it from the methods container
    // and add it to the property types list.
    let func = this.states.get(name);
    if ( func && this.methods[name] ) {
      this.properties[name].push(func.name);
      this.children.set(func.name, func);
      delete this.methods[name];
    }

    return type;
  }

  /**
   * Add a tracked method to this `ObjType` definition.
   * @param name Name of this method.
   * @param argType Optional argument type. Shortcut for `FuncType.addArg`.
   * @param argIndex Optional argument index. Shortcut for `FuncType.addArg`.
   * @return The new or modified `FuncType` instance.
   */
  addMethod(name: string, argType?: string, argIndex = 0): FuncType {
    this._childCount++;
    let type: FuncType | undefined = this.states.get(name);
    if ( !type ) {
      type = new FuncType(name, this.identsNamespace);
      this.states.set(name, type);
      this.methods[name] = type.args;
    }
    if ( argType ) {
      type.addArg(argIndex, argType);
    }
    if ( this.properties[name] ) {
      this.properties[name].push(type.name);
      this.children.set(type.name, type);
      delete this.methods[name];
    }
    return type;
  }

  /**
   * Simplify the Types data structure. If a property object has no children, theres
   * no reason to generate a declaration. Because we use a non-recursive generation
   * scheme, we can only know all this information at the end.
   */
  prune() {
    for ( let key in this.properties ) {
      let types = this.properties[key];
      types.forEach((type, idx) => {
        let obj = this.children.get(type);
        if ( obj && !obj.childCount() ) {
          types.splice(idx, 1);
          this.children.delete(type);
        }
      });
    }
  }

  toString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  toJSON(): any {
    let children: { [key: string]: any } = {};
    this.children.forEach( (child) => {
      children[child.name] = child.toJSON();
    });
    let methods: { [key: string]: any } = {};
    for ( let key in this.methods ) {
      methods[key] = this.methods[key].map((set) => { return Array.from(set); });
    }
    return {
      name: this.name,
      children,
      properties: this.properties,
      methods
    };
  }

}

/**
 * In css-blocks, `FuncType` represents `State` objects and may contain allowed
 * argument inputs, typically strings, aka "substate" values. The data structure
 * is able to handle methods that take n number of arguments of mixed types,
 * css-blocks will typically only use the first argument slot.
 */
export class FuncType {
  private identsNamespace: Map<string, number>;

  name: string;
  args: Set<string>[] = [];

  /**
   * The `FuncType` represents `State` objects and receives a name for its class,
   * and an identifer namespace. The identifer namespace is propagated
   * down the AST to globally unique names in the types file.
   * @param name Requested name for this Class type.
   * @param idents? Optional identifer namespace.
   */
  constructor ( name: string, idents?: Map<string, number> ){
    this.identsNamespace = idents || new Map;
    name = this.name = `${toCamelCase(name)}State`;

    // Ensure unique type identifier names.
    let i = 0;
    if ( this.identsNamespace.has(name) ) {
      let i = this.identsNamespace.get(name);
      this.name += i;
    }
    this.identsNamespace.set(name, ++i);

  }

  /**
   * In css-blocks every state has a single child: its substate. Interface
   * is required to `finish()` a tree.
   * @returns 1
   */
  childCount() {
    return 1;
  }

  /**
   * Add unique possible arguments to this method.
   * @param idx The index of argument this value may be passed in to.
   * @param type The string representation of allowed type.
   */
  addArg(idx: number, type: string) {
    if ( !this.args[idx] ) { this.args[idx] = new Set; }
    if ( this.args[idx].has(type) ) { return; }
    this.args[idx].add(type);
  }

  toString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  toJSON(): any {
    return {
      name: this.name,
      args: this.args.map((set) => Array.from(set))
    };
  }
}

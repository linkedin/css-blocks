
function toCamelCase(input: string) {
  input = input.replace(/-(.)/g, function(match, group1) {
      return match && group1.toUpperCase();
  });
  return input.replace(/^(.)/g, function(match, group1) {
      return match && group1.toUpperCase();
  });
}

export default class ObjType {

  private identsNamespace: Map<string, number>;
  private states: Map<string, FuncType> = new Map;
  private klasses: Map<string, ObjType> = new Map;

  name: string;
  children: Map<string, ObjType | FuncType> = new Map;
  isProp = true;
  isFunc = false;

  // Map of property name to valid types list
  properties: { [name: string]: string[] } = {};

  // Map of method name to list argument types.
  methods: { [name: string]: string[][] } = {};

  constructor( name: string, idents?: Map<string, number> ) {

    this.identsNamespace = idents || new Map;

    name = this.name = idents ? `${toCamelCase(name)}Class` : toCamelCase(name);

    // Ensure unique type identifier names.
    let i = 0;
    if ( this.identsNamespace.has(name) ) {
      let i = this.identsNamespace.get(name);
      this.name += i;
    }
    this.identsNamespace.set(name, ++i);

  }

  private _childCount = 0;
  childCount(){
    return this._childCount;
  }

  // Add this tracked property to this ObjType definition
  addClass(name: string) {
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

  // Add this tracked property to this ObjType definition
  addState(name: string, argType?: string, argIndex = 0,) {
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
  }

  // Simplify class call expressions. If a property object has no children, theres
  // no reason to generate a declaration. With a non-recursive generation scheme,
  // we can only know this at the end.
  finish() {
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
    return {
      name: this.name,
      children,
      properties: this.properties,
      methods: this.methods
    };
  }

}

export class FuncType {
  private identsNamespace: Map<string, number>;

  name: string;
  args: string[][] = [];
  children: Set<ObjType | FuncType>;
  isProp = false;
  isFunc = true;

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

  childCount() {
    return 1;
  }

  addArg(idx: number, type: string) {
    if ( !this.args[idx] ) { this.args[idx] = []; }
    if ( !!~this.args[idx].indexOf(type) ) { return; }
    this.args[idx].push(type);
  }

  toString() {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  toJSON(): any {
    return {
      name: this.name,
      args: this.args
    };
  }
}

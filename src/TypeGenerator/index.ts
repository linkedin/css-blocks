import { Block, State, BlockClass, BlockObject } from "../Block";

import TypeAST from "./TypeAST";
import formatTypescript from "./formatters/typescript";
import formatFlow from "./formatters/flow";

export default class TypeGenerator {

  private ast = new TypeAST('block');

  /**
   * Returns this Block's types in Typescript format.
   * @returns A string of Typescript declarations.
   */
  typescript(): string {
    return formatTypescript(this.ast);
  }

  /**
   * Returns this Block's types in Flow format.
   * @returns A string of Flow declarations.
   */
  flow(): string {
    return formatFlow(this.ast);
  }

  /**
   * Given a block, parse its States and Block objects into a TypesAST.
   */
  constructor( block: Block ) {

    // All blocks have a root class.
    this.ast.addProp('root');

    // Add all own and inherited states and substates.
    block.states.all().forEach((state: State) => {
      let name = state.group ? state.group : state.name;
      let substate = state.group ? state.name : undefined;
      this.ast.addMethod(name, substate);
    });

    // Add all own and inherited classes and all own and inherited class states.
    block.all().forEach( (klass: BlockObject) => {
      if ( !(klass instanceof BlockClass) ) { return; }
      let obj = this.ast.addProp(klass.name);
      klass.states.all().forEach((state: State) => {
        let name = state.group ? state.group : state.name;
        let substate = state.group ? state.name : undefined;
        obj.addMethod(name, substate);
      });
    });

    // Finish up the AST with its final pass optimization.
    this.ast.prune();

  }

}

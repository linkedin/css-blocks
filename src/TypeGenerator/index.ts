import { Block, State, BlockClass, BlockObject } from "../Block";

import TypeAST from "./TypeAST";
import formatTypescript from "./formatters/typescript";
import formatFlow from "./formatters/flow";

export default class TypeGenerator {

  private ast = new TypeAST('block');

  typescript(): string {
    return formatTypescript(this.ast);
  }

  flow(): string {
    return formatFlow(this.ast);
  }

  constructor( block: Block ) {

    this.ast.addClass('root');

    block.states.all().forEach((state: State) => {
      let name = state.group ? state.group : state.name;
      let substate = state.group ? state.name : undefined;
      this.ast.addState(name, substate);
    });

    block.all().forEach( (klass: BlockObject) => {
      if ( !(klass instanceof BlockClass) ) { return; }
      let obj = this.ast.addClass(klass.name);
      klass.states.all().forEach((state: State) => {
        let name = state.group ? state.group : state.name;
        let substate = state.group ? state.name : undefined;
        obj.addState(name, substate);
      });
    });

    this.ast.finish();

  }

}

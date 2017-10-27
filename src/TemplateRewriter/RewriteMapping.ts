import { inspect } from 'util';
import { BlockObject } from '../Block/BlockObject';
import { assertNever } from "@opticss/util";
import {
  BooleanExpression,
  isAndExpression,
  isBooleanExpression,
  isNotExpression,
  isOrExpression,
  RewriteMapping as OptimizedMapping,
  SimpleAttribute,
  SimpleTagname,
  isSimpleTagname
} from "@opticss/template-api";

export class RewriteMapping {
  /**
   * output attributes that are always on the element independent of any dynamic changes.
   */
  staticClasses: string[];

  /**
   * The numbers in the boolean expressions represents indexes into the inputAttributes array.
   */
  dynamicClasses: Map<string, BooleanExpression<BlockObject>>;

  constructor(staticClasses?: string[], dynamicClasses?: Map<string, BooleanExpression<BlockObject>>) {
    this.staticClasses = staticClasses || [];
    this.dynamicClasses = dynamicClasses || new Map<string, BooleanExpression<BlockObject>>();
  }

  static fromOptimizer(
    classRewrite: OptimizedMapping,
    classMap: Map<string, BlockObject>
  ): RewriteMapping {
    let staticClasses = classRewrite.staticAttributes.class;
    let styleRewrite = new RewriteMapping(staticClasses || []);
    let dynamicClasses = classRewrite.dynamicAttributes.class;
    if (dynamicClasses) {
      for (let className of Object.keys(dynamicClasses)) {
        let expression = dynamicClasses[className];
        if (expression) {
          styleRewrite.dynamicClasses.set(
            className,
            processExpression(expression, classRewrite.inputs, classMap));
        }
      }
    }
    return styleRewrite;
  }
}

function processExpression(
  expression: BooleanExpression<number>,
  inputs: Array<SimpleTagname | SimpleAttribute>,
  classMap: Map<string, BlockObject>
): BooleanExpression<BlockObject> {
  if (isAndExpression(expression)) {
    return {and: expression.and.map(e =>  isBooleanExpression(e) ? processExpression(e, inputs, classMap) : processExpressionLiteral(e, inputs, classMap))};
  } else if (isOrExpression(expression)) {
    return {or: expression.or.map(e =>  isBooleanExpression(e) ? processExpression(e, inputs, classMap) : processExpressionLiteral(e, inputs, classMap))};
  } else if (isNotExpression(expression)) {
    return {not: isBooleanExpression(expression.not) ? processExpression(expression.not, inputs, classMap) : processExpressionLiteral(expression.not, inputs, classMap)};
  } else {
    return assertNever(expression);
  }
}

function processExpressionLiteral(
  expression: number,
  inputs: Array<SimpleTagname | SimpleAttribute>,
  classMap: Map<string, BlockObject>
): BlockObject {
  let input = inputs[expression];
  if (isSimpleTagname(input)) {
    throw new Error("i really just can't handle tag names rn thx");
  } else {
    if (input.name !== "class") {
      throw new Error(`expected a class but got ${inspect(input)}, you should have known better.`);
    }
    if (!classMap.has(input.value)) {
      throw new Error(`wth. no class ${input.value} exists on this element.`);
    }
    return classMap.get(input.value)!;
  }
}
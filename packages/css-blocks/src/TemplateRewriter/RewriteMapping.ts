import {
  BooleanExpression,
  isAndExpression,
  isBooleanExpression,
  isNotExpression,
  isOrExpression,
  isSimpleTagname,
  RewriteMapping as OptimizedMapping,
  SimpleAttribute,
  SimpleTagname
} from "@opticss/template-api";
import { assertNever, Maybe, maybe, objectValues} from "@opticss/util";
import { inspect } from 'util';

import { Style } from '../Block';

import { ClassRewrite, IndexedClassRewrite } from './ClassRewrite';

export class IndexedClassMapping implements IndexedClassRewrite<Style> {
  inputs: Style[];
  staticClasses: string[];
  private map: { [k: string]: BooleanExpression<number> | undefined };
  private _inputMap: Map<Style, number>;
  constructor(inputs: Style[], staticClasses: string[], map: {[k: string]: BooleanExpression<number> | undefined}) {
    this.inputs = inputs;
    this.staticClasses = staticClasses;
    this._inputMap = new Map<Style, number>();
    inputs.forEach((i, n) => this._inputMap.set(i, n));
    this.map = map;
  }
  dynamicClass(name: string): BooleanExpression<number> | undefined {
    return this.map[name];
  }
  get dynamicClasses(): string[] {
    return Object.keys(this.map);
  }

  public indexOf(input: Style): Maybe<number> {
    let index = this._inputMap.get(input);
    return maybe(index, "internal error: style not found");
  }

  static fromOptimizer(
    classRewrite: OptimizedMapping,
    classMap: Map<string, Style>
  ): IndexedClassMapping {
    // TODO: move this renumbering to opticss?
    let indexSet = new Set<number>();
    let dynClasses = classRewrite.dynamicAttributes.class!;
    objectValues(dynClasses).forEach(expr => indexesUsed(indexSet, expr!));
    let usedIndexes = [...indexSet].sort((a, b) => a < b ? -1 : 1);
    let adjustments = new Array<number>();
    usedIndexes.reduce(([missing, last], n) => {
      missing = missing + (n - last - 1);
      adjustments[n] = missing;
      return [missing, n];
    },                 [0, -1]);

    function renumberer(i: number | BooleanExpression<number>, n: number, arr: number[]) {
      if (typeof i === "number") {
        arr[n] = i - adjustments[i];
      } else {
        renumber(renumberer, i);
      }
    }

    let inputs = classRewrite.inputs.filter((_,n) => indexSet.has(n)).map((_,n, inputs) => processExpressionLiteral(n, inputs, classMap));
    objectValues(classRewrite.dynamicAttributes.class!).forEach(expr => renumber(renumberer, expr!));
    return new IndexedClassMapping(
      inputs,
      classRewrite.staticAttributes.class!,
      classRewrite.dynamicAttributes.class!
    );
  }

}

export class RewriteMapping implements ClassRewrite<Style> {
  /**
   * output attributes that are always on the element independent of any dynamic changes.
   */
  staticClasses: string[];

  /**
   * The numbers in the boolean expressions represents indexes into the inputAttributes array.
   */
  private _dynamicClasses: Map<string, BooleanExpression<Style>>;

  constructor(staticClasses?: string[], dynamicClasses?: Map<string, BooleanExpression<Style>>) {
    this.staticClasses = staticClasses || [];
    this._dynamicClasses = dynamicClasses || new Map<string, BooleanExpression<Style>>();
  }

  get dynamicClasses(): Array<string> {
    return [...this._dynamicClasses.keys()];
  }

  dynamicClass(name: string): BooleanExpression<Style> {
    return this._dynamicClasses.get(name)!;
  }

  static fromOptimizer(
    classRewrite: OptimizedMapping,
    classMap: Map<string, Style>
  ): RewriteMapping {
    let staticClasses = classRewrite.staticAttributes.class;
    let dynamicClasses = classRewrite.dynamicAttributes.class;
    let dynMap = new Map<string, BooleanExpression<Style>>();
    if (dynamicClasses) {
      for (let className of Object.keys(dynamicClasses)) {
        let expression = dynamicClasses[className];
        if (expression) {
          dynMap.set(
            className,
            processExpression(expression, classRewrite.inputs, classMap));
        }
      }
    }
    let styleRewrite = new RewriteMapping(staticClasses || [], dynMap);
    return styleRewrite;
  }
}

function indexesUsed(indexes: Set<number>, expression: BooleanExpression<number> | number) {
  if (typeof expression === "number") {
    indexes.add(expression);
  } else if (isAndExpression(expression)) {
    expression.and.forEach(e =>  indexesUsed(indexes, e));
  } else if (isOrExpression(expression)) {
    expression.or.forEach(e =>  indexesUsed(indexes, e));
  } else if (isNotExpression(expression)) {
    indexesUsed(indexes, expression.not);
  } else {
    assertNever(expression);
  }
}

function renumber(renumberer: any, expression: BooleanExpression<number>) {
  if (isAndExpression(expression)) {
    expression.and.forEach(renumberer);
  } else if (isOrExpression(expression)) {
    expression.or.forEach(renumberer);
  } else if (isNotExpression(expression)) {
    let not = [expression.not];
    not.forEach(renumberer);
    expression.not = not[0];
  } else {
    assertNever(expression);
  }
}

function processExpression(
  expression: BooleanExpression<number>,
  inputs: Array<SimpleTagname | SimpleAttribute>,
  classMap: Map<string, Style>
): BooleanExpression<Style> {
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
  classMap: Map<string, Style>,
): Style {
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
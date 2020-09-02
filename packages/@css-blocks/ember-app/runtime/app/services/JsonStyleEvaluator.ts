import { AggregateRewriteData } from "./AggregateRewriteData";
import { RuntimeStyles } from "./RuntimeStyle";
import { ClassNameExpression, Condition, StyleEvaluator } from "./StyleEvaluator";

export class JsonStyleEvaluator {
  evaluator: StyleEvaluator;

  constructor(data: AggregateRewriteData, args: ClassNameExpression) {
    let convertedArgs: ClassNameExpression;
    if (args[0] === 0) { // the old parameter style
      convertedArgs = args;
    } else if (args[0] === 1) { // thew new parameter style with a json object
      convertedArgs = convertArgs(args);
    } else {
      throw new Error("Unsupported class rewrite encountered. Please upgrade @css-blocks/ember.");
    }
    this.evaluator = new StyleEvaluator(data, convertedArgs);
  }

  evaluate(): Set<number> {
    return this.evaluator.evaluate();
  }
}

function convertArgs(args: ClassNameExpression): ClassNameExpression {
  let jsonString = args[1] as string;
  args = args.slice(2);
  let convertedArgs: ClassNameExpression = [0];
  let runtimeStyle: RuntimeStyles = JSON.parse(jsonString);
  let [blockRefs, styleRefs, staticStyles, booleanStyles, ternaryStyles, switchStyles] = runtimeStyle;
  convertedArgs.push(blockRefs.length);
  for (let blockRef of blockRefs) {
    let [guid, argIndex] = blockRef;
    convertedArgs.push(guid);
    // tslint:disable-next-line:triple-equals
    if (argIndex != null) { // this is intentionally casting to check for undefined as well as null
      convertedArgs.push(args[argIndex]);
    } else {
      convertedArgs.push(null);
    }
  }
  convertedArgs.push(styleRefs.length);
  for (let styleRef of styleRefs) {
    convertedArgs.push(...styleRef);
  }
  convertedArgs.push(
    staticStyles.length + booleanStyles.length +
    ternaryStyles.length + switchStyles.length);
  for (let staticStyle of staticStyles) {
    convertedArgs.push(Condition.static);
    convertedArgs.push(staticStyle);
  }
  for (let booleanStyle of booleanStyles) {
    let [argIndex, styles] = booleanStyle;
    convertedArgs.push(Condition.toggle, args[argIndex], styles.length, ...styles);
  }
  for (let ternaryStyle of ternaryStyles) {
    let [argIndex, ifTrue, ifFalse] = ternaryStyle;
    convertedArgs.push(Condition.ternary, args[argIndex], ifTrue.length, ...ifTrue, ifFalse.length, ...ifFalse);
  }
  for (let switchStyle of switchStyles) {
    let [argIndex, behavior, block, styleName] = switchStyle;
    convertedArgs.push(Condition.switch, behavior, block, styleName, args[argIndex]);
  }
  return convertedArgs;
}

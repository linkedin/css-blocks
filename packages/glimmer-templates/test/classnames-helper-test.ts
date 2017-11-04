import {
  Syntax,
  builders,
  print,
} from '@glimmer/syntax';
import classnamesHelper from '../src/helpers/classnames';
import { classnamesHelper as helperGenerator } from "../src/ClassnamesHelperGenerator";
import path = require('path');
import { expect } from 'chai';
import { fixture } from "./fixtures";
import {
  IndexedClassRewrite, BlockObject, BooleanExpression, AndExpression, OrExpression, NotExpression, ElementAnalysis, Block,
  IndexedClassMapping,
} from "css-blocks";
import {
  BooleanExpression as BooleanAST,
  StringExpression as StringAST,
  TernaryExpression as TernaryAST,
} from "../src/ElementAnalyzer";
import {
  POSITION_UNKNOWN
} from "@opticss/template-api";

describe('Classnames Helper', () => {
  it('generates an ast fragment for a dynamic class name expression', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], { });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      "{{/css-blocks/components/classnames 1 0 0 true 2 0 2 1 1}}"
    );
  });
  it('generates an ast fragment for a dependent style expression', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], { });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b],
    });
    element.addStaticState(s1);
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      "{{/css-blocks/components/classnames 2 0 0 true 1 0 0 1 1 0 1 3}}"
    );
  });
  it('generates an ast fragment for a dependent style expression', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], { });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b],
    });
    element.addDynamicState(s1, builders.boolean(false));
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      "{{/css-blocks/components/classnames 2 0 0 true 1 0 0 3 1 0 false 1 3}}"
    );
  });

  it('generates an ast fragment for a state group', () => {
    let b = new Block("test", "test");
    let red = b.states.ensureState("red", "theme");
    let orange = b.states.ensureState("orange", "theme");
    let blue = b.states.ensureState("blue", "theme");

    let inputs = [b, red, orange, blue];
    let rewrite = new IndexedClassMapping(inputs, [], { });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicGroup(b, {red, orange, blue}, builders.mustache(builders.string("blue")));
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 1 0 4 3 1 "blue" "red" 1 1 "orange" 1 2 "blue" 1 3}}'
    );
  });

  it('generates an ast fragment for a dependent state group', () => {
    let b = new Block("test", "test");
    let red = b.states.ensureState("red", "theme");
    let orange = b.states.ensureState("orange", "theme");
    let blue = b.states.ensureState("blue", "theme");

    let inputs = [b, red, orange, blue];
    let rewrite = new IndexedClassMapping(inputs, [], { });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [ b ]
    });
    element.addDynamicGroup(b, {red, orange, blue}, builders.mustache(builders.path("/app/foo/helperz"), [builders.string("blue")]));
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 2 0 0 true 1 0 0 5 1 0 3 1 (/app/foo/helperz "blue") "red" 1 1 "orange" 1 2 "blue" 1 3}}'
    );
  });
  it('generates an ast fragment for optimized classes', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [ 0, 2 ]}
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 1 1 0 true 2 0 2 1 1 "a" -3 2 0 2}}'
    );
  });
  it('omits the boolean expression for single "and" and "or" values', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [ {or: [0]}, {and: [2]} ]}
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 1 1 0 true 2 0 2 1 1 "a" -3 2 0 2}}'
    );
  });
  it('can negate boolean expressions', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {and: [0, {not: 2}]}
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 1 1 0 true 2 0 2 1 1 "a" -3 2 0 -1 2}}'
    );
  });
  it('can "or" boolean expressions', () => {
    let b = new Block("test", "test");
    let c1 = b.ensureClass("class-1");
    let c2 = b.ensureClass("class-2");
    let s1 = b.states.ensureState("enabled");

    let inputs = [b, c1, c2, s1];
    let rewrite = new IndexedClassMapping(inputs, [], {
      a: {or: [0, {not: 2}]}
    });
    let element = new ElementAnalysis<BooleanAST, StringAST, TernaryAST>({start: POSITION_UNKNOWN});
    element.addDynamicClasses({
      condition: builders.boolean(true),
      whenTrue: [b, c2],
      whenFalse: [c1]
    });
    let result = print(helperGenerator(rewrite, element));
    expect(result).deep.equals(
      '{{/css-blocks/components/classnames 1 1 0 true 2 0 2 1 1 "a" -2 2 0 -1 2}}'
    );
  });
});
import {
  Maybe,
} from "@opticss/util";

// These boolean expression types are copied from opticss to avoid pulling that dependency in.

export type BooleanExpression<V> = AndExpression<V> | OrExpression<V> | NotExpression<V>;
export interface AndExpression<V> {
    and: Array<V | BooleanExpression<V>>;
}
export interface OrExpression<V> {
    or: Array<V | BooleanExpression<V>>;
}
export interface NotExpression<V> {
    not: V | BooleanExpression<V>;
}

export interface ClassRewrite<BooleanType> {
  staticClasses: string[];
  readonly dynamicClasses: string[];
  dynamicClass(name: string): BooleanExpression<BooleanType> | undefined;
}

export interface IndexedClassRewrite<SourceType> extends ClassRewrite<number> {
  inputs: Array<SourceType>;
  indexOf(input: SourceType): Maybe<number>;
}
# CSS Blocks Runtime for Dynamic Classnames

This runtime helper provides efficient and terse evaluation of
CSS Block's styles that have been optimized by OptiCSS.

The dynamic expression can be generated from many different
authoring formats, it expresses a wide-range of dynamic
changes that can happen to block styles.

It's easiest to understand how it works from an example.

Consider the following `objstr` expression:

```js
let style = objstr({
     [bar.pretty]: leSigh,
     [bar.pretty.bool()]: true,
     [bar.pretty.color(dynamic)]: true
});
```

which becomes:

`c$$([ 3, 2, 0, leSigh, 1, 0, 0, 1, 1, 0, 1, 1, 5, 1, 0, 1, 0, dynamic, "yellow", 1, 2, "c", -2, 2, 0, 1, "d", 2])`

Let's break that down:

1. The first number (`3`) is how many input dynamic input styles there are.
2. The second number (`2`) is how many dynamic output styles there are.
3. For each conditional input style (The first number is what kind of conditional it is the arguments that follow depend on the type.)

    * `0, leSigh, 1, 0, 0` - This (`0`) is a ternary expression with the boolean conditional of `leSigh`. There is `1` style set on (the style with index `0`) if true and (`0`) styles if false.
    * `1, 1, 0, 1, 1` is a dependency  on a previously evaluated condition. Dependencies are a bit `1` that can be set on any other type of conditional or used stand-alone). In this case it is a pure dependency. This style depends on `1` other style (the style with index `0`) and if all of those styles are set to on, it allows the conditional expression that follows to set its styles to on. Since there is no conditional for a pure dependency it causes the `1` style that follows (the style with index `1`) to be turned on.
    * `5, 1, 0, 1, 0, dynamic, "yellow", 1, 2` is a switch conditional with a dependency `5 = 4 | 1`. The dependency comes first so `1, 0` causes the entire switch to depend on `1` previously set style, the style with index `0`. This switch statement has `1` string to compare against and if the value of the string is falsey an error (`0`) should be raised (other values let a falsey value disable the style or provide a default string to assume). The expression `dynamic` is evaluated, checked if it's falsey then and compared against `"yellow"` and if it matches `1` style is set to on (the style with index `2`).

4. For each output style, the style comes first, then a boolean expression over source input styles for each follows. a boolean expression is arbitrarily long and nested with other boolean expressions.
   *  `"c", -2, 2, 0, 1` - sets the class `c` with an "or" (`-2`) expression. The start of a boolean expression is signaled by a negative number and then a count of expressions or styles that are combined with that boolean operator. So this is an or of `2` input styles (with indexes `0` and `1`) -- if either of those are set, the boolean expression will be true. below you will see this is because both of those classes set `color: red`.
   * `"d", 2` - is a simple expression with no boolean operator. The class `c` is present if the style with index `2` is on.

This isn't comprehensive, but hopefully it generally makes it more clear what is going on. More documentation can be found in the code.

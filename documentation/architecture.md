# CSS Blocks Architecture

The following guide will help you learn about the CSS Blocks framework design, internals, and related build tooling.

Note: You should read the [CSS Blocks Project README][README] and the [Syntax Guide][README] first as this document expects you have a good handle on Block syntax and Block composition concepts.

<details>
  <summary>Table of Contents</summary>

- [CSS Blocks Architecture](#css-blocks-architecture)
- [High Level Overview](#high-level-overview)
  - [1st Phase: Block Parsing](#1st-phase-block-parsing)
  - [2nd Phase: Template Analysis](#2nd-phase-template-analysis)
  - [3rd Phase: Block Compilation](#3rd-phase-block-compilation)
  - [4th Phase: Optimization](#4th-phase-optimization)
  - [Final Phase: Rewrite Phase](#final-phase-rewrite-phase)
- [Mapping the Architecture to our Project Structure](#mapping-the-architecture-to-our-project-structure)
  - [Core Packages](#core-packages)
    - [[Core][CORE]](#core)
    - [[Runtime][RUNTIME]](#runtime)
    - [[Code Style][CODESTYLE]](#code-style)
  - [Template Integrations](#template-integrations)
    - [Analyzers](#analyzers)
    - [Rewriters](#rewriters)
  - [Build System Integrations](#build-system-integrations)
  - [In Conclusion](#in-conclusion)

</details>

# High Level Overview

A lot happens in a CSS Blocks build. Over the course of a single build CSS Blocks will go through 5 distinct phases:

1. Block Parsing
2. Template Analysis
3. Block Compilation
4. Optimization (in Production Only)
5. Template Rewriting.

## 1st Phase: Block Parsing
Perhaps counter-intuatively for a CSS Framework, CSS Blocks actually starts with your templates.

First, we start at the entry point template(s) passed to it by your build, and crawl the template dependency tree. Every time we encounter a referenced Block file in a template (the syntax depending on that templating language [integration](INTEGRATIONS) we pass it off to the [BlockFactory](../packages/@css-blocks/core/src/BlockParser/BlockFactory.ts)) for parsing.

Then the `BlockFactory` parses every Block file discovered into a well indexed, easily searchable, data model. This manages all the complexity of Block composition, inheritance, and implementation. 

This data model is called a [BlockTree](../packages/@css-blocks/core/src/BlockTree/index.ts).

A key purpose of the `BlockFactory` is ensuring we only ever have a single instance of each unique Block file's data model at any time, encapsulating all the logic around the Block's reference resolution, CSS parsing, and preprocessor integration.

It is in this phase that we validate the Block syntax. We will stop the build with a (hopefully!) useful error message if we notice anything wrong in a Block file!

Some possible errors that we check for are:

 - Invalid Selectors or Identifiers
 - Missing API Implementations
 - Illegal use of `!important`
 - Malformed Block paths or block-references
 - ...and more!

A valid `Block` may contain one to many `Style` objects that represent individual `BlockClass`es, or `AttrValue`s accessible on the `Block`. These in turn map directly back to one or more declared rulesets in the source Block file.

At the end of a successful __Block Parsing Phase__, we have a collection of `Block` objects that have all the needed information about a Block file.

> Want to know more about `Block` objects and their associated APIs? Check out the [CSS Blocks Core README](./packages/%40css-blocks/core).

## 2nd Phase: Template Analysis
Once we're finished constructing our `Block` objects, this data is passed off to a template `Analyzer` for the Template Analysis Phase. It is the job of the analyzer to inspect every element, in every template of the application, and report back information, like:

  * Which styles are used?
  * Which styles are dynamic?
  * Which styles are mutually exclusive>

...and any other pertinent usage information that we can glean from the templates.

The syntax for consuming Blocks in any given template language may change, but each language's implementation must be *statically analyzable*. This means that by parsing the template we are able to tell with certainty when and how Styles are being used. The more uncertainty in a template's implementation, the less stylesheet optimization we can do in the next build phase.

The `Analyzer` has access to:

 1. All parsed `Block` objects;
 2. All template entry points.

The `Analyzer` then crawls the template dependency tree and creates a new `Analysis` object for each template it discovers. These `Analysis` objects contain style usage information for every element in the template.

It's also here that we validate *style composition* and will stop the build with a helpful error if we notice anything wrong. These can include:

 * Invalid application of `Style`s, for example:
	 * an `AttrValue` used without parent `BlockClass`,
	 * two classes from the same block applied to the same element,
	 * a `:scope` and `BlockClass` applied on the same element.
 * An unresolvable conflict between `Style`s from different Blocks.
 * Duplicates of exclusive `AttrValue`s.

You can read more about `Analyzer`s and their associated APIs in the [Analyzer README](./packages/%40css-blocks/core/src/Analyzer).

## 3rd Phase: Block Compilation
Now that we have our parsed `Block` objects, and the fully populated `Analysis` data, we can emit a compiled CSS file for each `Block`.

The [`BlockCompiler`](./packages/%40css-blocks/core/src/BlockCompiler) is responsible for taking in a `Block` object, and emitting a transformed PostCSS root node with the rewritten classes.

At this phase, your Block files are rewritten to use globally unique class names, and all extension and conflict resolution selectors are emitted.

As described in the [CSS Blocks README][CORE], `Style` objects (`BlockClasses` and `AttrValues`) conveniently map directly to BEM classes. By default, you will see BEM classes emitted in this phase.

> Note: BEM is the default output mode for CSS Blocks – and currently the only output mode – but [other output modes](./packages/%40css-blocks/core/src/configuration/OutputMode.ts) for CSS Blocks may be added in the future.

## 4th Phase: Optimization
Once we have all of our style data parsed from the __Block Parsing Phase__, and all of our usage data from the __Template Analysis Phase__, *and* the compiled Block CSS files, all this information is passed off to [Opticss][OPTICSS], our standalone CSS stylesheet optimizer, for style optimization! (optional)

I encourage you to read up about Opticss and its internals [over in its repository][OPTICSS]. However, after all is said and done, and a lot of optimization magic is run, we are returned:

  1. a re-written, optimized, CSS file;
  2. a `StyleMapping` object with queryable rewrite data, described below;
  3. an `Action` queue describing every transformation step the optimizer made.

> Note: In a non-optimized build, this step is essentially a pass through. The Optimizer will return un-transformed CSS and `StyleMapping` data that is the same as the input data.

The [`StyleMapping`](./packages/%40css-blocks/core/src/TemplateRewriter/StyleMapping.ts) object returned by CSS Blocks after an Opticss run contains APIs that allow you to query a `RewriteMapping` for any Element analyzed during the __Analysis Phase__. This `RewriteMapping` contains all the information required to rewrite that Element from the old, pre-optimized classes, to the new, fully-optimized classes, as we will see in the __Rewrite Phase__.

## Final Phase: Rewrite Phase
Phew! Last step. Now that we have our final CSS stylesheet and it's corresponding `StyleMapping`, we can re-visit every Element we encountered during our __Analysis Phase__ and make sure it uses the correct classes at the right times.

As mentioned above, every Element has a corresponding [`RewriteMapping`](./packages/%40css-blocks/core/src/TemplateRewriter/RewriteMapping.ts) returned from Opticss. Any given Class, ID or Attribute associated with an element will map back to one (or many) optimized class names that should **only** be applied if a certain set of conditions are met.

Some classes are static – they are always present on the element. Other classes are dynamic, and should only be applied if the application is in a specific state.

Knowing this, we can conceptually think of these Element `RewriteMappings` as a set of classes and dynamic expressions (which evaluate to `true` or `false`), spread over a specially crafted boolean expression that is specific to that Element.

For example, given this Block file and template:

```css
.class-0 {
  color: red;
  float: left;
}
.class-1 {
  color: red;
  float: right;
}
.class-0[active] {
  color: blue;
}
.class-1[color=yellow] {
  color: yellow;
}
```

```handlebars
<div block:class="class-0" block:active={{isActive}}>
<div block:class="{{style-if isColorful 'class-1'}}" block:color={{dynamicColor}}>
```

We can easily conceptualize the `RewriteMapping` data for each element in development mode, when the CSS output is just BEM.

```css
.block__class-0 {
  color: red;
  float: left;
}

.block__class-1 {
  color: red;
  float: right;
}

/* Notice: `[active]` will *only* be applied when `.class-0` is also applied! */
.block__class-0.block__class-0--active {
  color: blue;
}

/* Notice: `[color=yellow]` will *only* be applied when `.class-1` is also applied! */
.block__class-1.block__class-1--color-yellow {
  color: yellow;
}
```

```javascript
// For Element 1:
//   - `.class-0` is always applied
//   - `.class-0[active]` is *only* applied when `isActive` is true
const el1Classes = [
  "block__class-0",
  isActive && "block__class-0--active"
].join(' ');

// For Element 2:
//   - `.class-1` is applied when `isColorful` is true
//   -  `[color=yellow]` is applied when `dynamicColor` === "yellow"
const el2Classes = [
  isColorful ? "block__class-1" : "",
  dynamicColor === "yellow" ? "block__class-1--color-yellow" : "",
].join(' ');
```

> ⁉️ **Note**
>
> The above functional syntax is only here to explain the concept of `RewriteMapping`s and conditional style application! Please read about css-blocks' [Runtime Library][RUNTIME] to learn about how this dynamicism is actually represented in the browser.

In production mode however, these `RewriteMapping`s change! The optimized stylesheet may look something like this:

```css
.a { color: red; }
.b { float: left; }
.c { float: right; }
.d { color: blue; }
.e { color: yellow; }
```

And our `RewriteMapping`s will adjust to accommodate:

```javascript
// Element 1 styling logic remains the same, but uses updated classes.
const el1Classes = [
  "a b",
  isActive && "d"
].join(' ');

// Element 2 styling logic is updated to use the new minified classes,
// but also pushes some stylesheet logic to the template!
// `[color=yellow]` will *only every be applied when `isColorful`
// is also truthy.
const el2Classes = [
  isColorful ? "a c" : "",
  isColorful && dynamicColor === "yellow" ? "e" : "",
].join(' ');
```

Now, as mentioned above, what actually gets written out to your templates is *not* the very explicit JavaScript syntax you see above. The examples above were only written in that way to help explain the concept of `RewriteMapping`s.

To make life easy for template rewriters, CSS Blocks delivers its own tiny (~500byte) [Runtime Library][RUNTIME]. Rewriters only need to make sure they invoke this runtime function with the arguments provided to them by the `RewriteMapping` using the template's preferred syntax. You can read about implementation details of this runtime library in its package's [README][RUNTIME].

Because all this runtime logic is abstracted away from template rewriters, they can focus on a single task: understanding the template syntax and transforming individual elements.

---

And there it is. That is what happens, end to end, when you build a CSS Blocks project. Now lets talk about the code that actually makes this process tick.

# Mapping the Architecture to our Project Structure
As mentioned in the README, every module in CSS Blocks has its own dedicated README that will deep-dive into its specific implementation details. Here we will provide a high-level description of each major module's function and relation to the concepts covered above.

## Core Packages

These packages are everything that is a core-concern for CSS Blocks. This includes, but is not limited to, all Block file parsing, analysis, and compilation logic, the browser runtime, and shared rewrite data structures.

### [Core][CORE]
The `@css-blocks/core` is the package that drives everything that happens between reading a Block file and outputting the final CSS.

All `BlockSyntax` features, functionality for constructing `BlockTrees`, the base class for all `Analyzer`s, the `BlockFactory` and `BlockCompiler` implementations, and much more, live in this package.

### [Runtime][RUNTIME]
The `@css-blocks/runtime` package delivers the very slim in-browser runtime that handles dynamic class application. The high-level concept of *what* the runtime does is briefly explained in the **Rewrite Phase** section above, but for a more detailed examination of how we actually execute these arbitrary binary expressions, with N number of static or dynamic classes, check out this project's README.

### [Code Style][CODESTYLE]
The `@css-blocks/code-style`package provides TSLint code style rules for the project. Currently, for consistency, it simply re-exports the code style rules delivered by [@opticss/opticss][OPTICSS], our CSS optimizer.

## Template Integrations
A core requirement of CSS Blocks is the ability to analyze and rewrite your application's templates. Because of language differences, every templating system will have a *slightly* different syntax when importing / referencing Blocks from a template, and for interacting with CSS Blocks classes / states in the markup.

Template Integrations have one single responsibility: to understand your project's specific templating syntax (ie: Glimmer, JSX, etc) and provide a template language specific `Analyzer` and `Rewriter`.

### Analyzers
**Analyzers** will typically be run on a single entry point template and are responsible for 2 things as they crawl the template dependency tree:

  1. Discover Block files referenced by the templates and pass them to the `BlockFactory` (provided by `@css-blocks/core`) for compilation.
  2. _After_ the Block compilation, crawl every element in every template and log any relevant Block class/state usage information onto a `StyleAnalysis` object (also provided by `@css-blocks/core`).

You can think of Analyzers as the code that turns a Block into a data structure.

### Rewriters
**Rewriters** are responsible for taking the Analyzer's `StyleAnalysis` objects and transforming the templates to use generated classes and dynamic expressions. 

Rewriters are, by their nature, a little more free-form than Analyzers because the will typically need to interface with an existing template or asset compilation pipeline (Babel Plugins for JSX, Glimmer AST Plugins for Glimmer, and so on).

To that end, more detailed information and instruction for a given template integration can be found in their respective packages:

 * [@css-blocks/glimmer][GLIMMER] Provides the template integration for [Glimmer Templates][GLIMMER_WEBSITE].
 * [@css-blocks/jsx][JSX] Provides the template integration for [JSX Templates][JSX_WEBSITE].

## Build System Integrations
These are what allow CSS Blocks to work anywhere! Because our system is designed to be modular a build integration can be made for any build system.

Every build integration needs to export a CSS Blocks plugin and have some method to provide it an **Analyzer** and **Rewriter** to run on the project.

These build system integrations haveseveral specific responsibilities:

 * Understanding the file system abstraction provided by the build system.
 * Handing off templates to an **Analyzer** for analysis.
 * Shuttling `StyleAnalysis` data between the **Analyzer** and **Rewriter**.

As with the Template Integrations, more detailed information and instruction for a given template integration can be found in their respective packages:

 * [@css-blocks/broccoli][BROCCOLI] Provides the build system integration for [Broccoli][BROCCOLI_WEBSITE].
 * [@css-blocks/webpack][WEBPACK] Provides the build system integration for [Webpack][WEBPACK_WEBSITE].
 * [@css-blocks/ember-cli][EMBER_CLI] Provides the build system integration for [Ember CLI][EMBER_CLI_WEBSITE].

## In Conclusion

Hopefully you now feel you understand how CSS Blocks works internally, at least at a high level. If you feel there is something we could add, or are interested in contributing, head over to our [Contributing Guide](./CONTRIBUTING.md) to learn how you can help!

[README]: ../README.md
[INTEGRATIONS]: ./integrations.md
[CORE]: ../packages/@css-blocks/core
[RUNTIME]: ../packages/@css-blocks/runtime
[CODESTYLE]: ../packages/@css-blocks/code-style
[JSX]: ../packages/@css-blocks/jsx
[GLIMMER]: ../packages/@css-blocks/glimmer
[EMBER_CLI]: ../packages/@css-blocks/ember-cli
[WEBPACK]: ../packages/@css-blocks/webpack
[BROCCOLI]: ../packages/@css-blocks/broccoli

[OPTICSS]: https://github.com/linkedin/opticss
[EMBER_CLI_WEBSITE]: https://ember-cli.com/
[WEBPACK_WEBSITE]: https://webpack.js.org/
[BROCCOLI_WEBSITE]: http://broccolijs.com/
[JSX_WEBSITE]: https://facebook.github.io/jsx/
[GLIMMER_WEBSITE]: https://glimmerjs.com/
[LERNA_WEBSITE]: https://lernajs.io
[CSS_BLOCKS_WEBSITE]: http://css-blocks.com

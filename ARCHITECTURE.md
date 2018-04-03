# CSS Blocks Architecture
Welcome to css-blocks' architecture document! Here you will learn all about the css-blocks framework design, internals, and related build tooling.

I heavily recommend you review the [CSS Blocks Project README][PROJECT_HOME] for a full overview of the css-blocks project and its public APIs! This document expects you have a good handle on Block syntax and Block composition concepts.

I'll give you a chance to review...

Oh, you're back? Good! Glad you're a css-blocks master now –  welcome to the community! 🎉 Now, lets dive in to the really fun stuff.

* [CSS Blocks Architecture](#css-blocks-architecture)
* [Build Phases](#build-phases)
  * [Block Parsing](#block-parsing)
  * [Template Analysis](#template-analysis)
  * [Block Compilation](#block-compilation)
  * [Optimization (Production Only)](#optimization-production-only)
  * [Rewrite Phase](#rewrite-phase)
* [Project Structure](#project-structure)
  * [Core Packages](#core-packages)
    * [@css-blocks/core](#css-blockscore)
    * [@css-blocks/runtime](#css-blocksruntime)
    * [@css-blocks/code-style](#css-blockscode-style)
  * [Template Integrations](#template-integrations)
    * [@css-blocks/glimmer](#css-blocksglimmer)
    * [@css-blocks/jsx](#css-blocksjsx)
  * [Build System Integrations](#build-system-integrations)
      * [@css-blocks/broccoli](#css-blocksbroccoli)
      * [@css-blocks/webpack](#css-blockswebpack)
      * [@css-blocks/ember-cli](#css-blocksember-cli)

# Build Phases

Lets kick this off with a high-level overview of what happens when you run a css-blocks build. We'll dive deeper into the project structure and organization a little later, but there's a **lot** going on here, and what's the point of reading about APIs if you don't know what we're trying to accomplish? 

After all, as Uncle Ben once said – "With great power, comes great...computational complexity" (Sorry, its been a while since I've seen Spider Man).

To pull off all the features promised by css-blocks, we need to do a *lot* of work. Over the course of a single build, css-blocks will bring your application through five (5) distinct phases:

1. Block Parsing
2. Template Analysis 
3. Block Compilation
4. Optimization (Production Only)
5. Template Rewrite

## Block Parsing
Lets start at the very beginning – a very good place to start! In css-blocks, we start with your templates – unexpected for a CSS framework, I know! 

CSS Blocks starts at the entry point template(s) passed to it by your build, and crawls the template dependency trees. Every time we encounter a referenced Block file in a template (remember: the syntax for this changes depending on the templating language), we pass it off to the [BlockFactory](./packages/css-blocks/src/BlockFactory/index.ts) for parsing. 

The `BlockFactory` parses every Block file discovered into an internally used, intermediate data model that is well indexed, easily searchable, and manages all the complexity of Block composition, inheritance and implementation. This data model is affectionately called a [BlockTree](./packages/css-blocks/src/Block/index.ts). 

The `BlockFactory` also ensures we only ever have a single instance of each unique Block file's data model at any time, and encapsulates all the logic around Block reference resolution, CSS parsing and preprocessor integration.

In this phase we validate Block syntax and will stop the build with a helpful error if we notice anything wrong in a Block file! These include errors for:

 - Invalid Selectors or Identifiers
 - Missing API Implementations
 - Illegal use of `!important`
 - Malformed Block paths or block-references
 - And more!

At the end of a successful __Block Parsing Phase__, we are left with a collection of `Block` objects that my be used to query any and all relevant information about a Block file. Any valid `Block` may contain one to many `Style` objects that represent individual `BlockClass`es, or `AttrValue`s accessible on the `Block`. These in turn map directly back to one or more declared rulesets in the source Block file. 

You can read more about `Block` objects and their associated APIs in the [Block Object README](./packages/css-blocks/src/Block/README.md).

## Template Analysis 
Once we're finished constructing our `Block` objects, these data are passed off to a template `Analyzer` for the __Template Analysis Phase__. It is the job of the analyzer to inspect every element, in every template of the application, and report back information, like:
  
  - which styles are used;
  - which styles are dynamic;
  - which styles are mutually exclusive;

and any other pertinent usage information that we can glean from the templates.

The syntax for consuming Blocks in any given template language may change, but we require that each language's implementation be *statically analyzable*. This means that by parsing the template we are able to tell with certainty when and how Styles are being used. The more uncertainty in a template's implementation, the less stylesheet optimization we can do in the next build phase.

The `Analyzer` is has access to:

 1. all parsed `Block` objects;
 2. all template entry points.

The `Analyzer` will crawl the template dependency tree and create a new `Analysis` object for each template discovered. These `Analysis` objects contain style usage information for every element the template contains.

In this phase we validate style composition and will stop the build with a helpful error if we notice anything wrong, including but not limited to:

 - Invalid application of `Style`s, like: 
	 - an `AttrValue` used without parent `BlockClass`,
	 - two classes from the same block applied to the same element,
	 - a `:scope` and `BlockClass` applied on the same element;
 - Un-resolved property conflicts on correlated `Style`s from different Blocks;
 - Duplicate application of exclusive `AttrValue`s.

You can read more about `Analyzer`s and their associated APIs in the [Analyzer README](./packages/css-blocks/src/TemplateAnalysis/README.md).

## Block Compilation
Now that we have our parsed `Block` objects, and the fully populated `Analysis` data, we can emit a compiled CSS file for each `Block`.

The [`BlockCompiler`](./packages/css-blocks/src/BlockCompiler) is responsible for taking in a `Block` object, and emitting a transformed PostCSS root node with the rewritten classes.

At this phase, your Block files are rewritten to use globally unique class names, and all extension and conflict resolution selectors are emitted.

As described in the [CSS Blocks README][CORE], `Style` objects (`BlockClasses` and `AttrValues`) conveniently map directly to BEM classes. By default, you will see BEM classes emitted in this phase.

> Note: BEM is the default output mode for css-blocks – and currently the only output mode – but [other output modes](./packages/css-blocks/src/OutputMode.ts) for css-blocks may be added in the future.

## Optimization (Production Only)
Once we have all of our style data parsed from the __Block Parsing Phase__, and all of our usage data from the __Template Analysis Phase__, *and* the compiled Block CSS files, all this information is passed off to [Opticss][OPTICSS], our standalone CSS stylesheet optimizer, for style optimization!

I encourage you to read up about Opticss and its internals [over in its repository][OPTICSS]. However, after all is said and done, and a lot of optimization magic is run, we are returned:

  1. a re-written, optimized, CSS file;
  2. a `StyleMapping` object with queryable rewrite data, described below;
  3. an `Action` queue describing every transformation step the optimizer made. 

> Note: In development mode, this step is essentially a pass through. The Optimizer will return un-transformed CSS and `StyleMapping` data that is the same as the input data.

The [`StyleMapping`](./packages/css-blocks/src/TemplateRewriter/StyleMapping.ts) object returned by css-blocks after an Opticss run contains APIs that allow you to query a `RewriteMapping` for any Element analyzed during the __Analysis Phase__. This `RewriteMapping` contains all the information required to rewrite that Element from the old, pre-optimized classes, to the new, fully-optimized classes, as we will see in the __Rewrite Phase__.

## Rewrite Phase
Phew! Last step. Now that we have our final CSS stylesheet and it's corresponding `StyleMapping`, we can re-visit every Element we encountered during our __Analysis Phase__ and make sure it uses the correct classes at the right times. 

As mentioned above, every Element has a corresponding [`RewriteMapping`](./packages/css-blocks/src/TemplateRewriter/RewriteMapping.ts) returned from Opticss. Any given Class, ID or Attribute associated with an element will map back to one (or many) optimized class names that should **only** be applied if a certain set of conditions are met. 

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
.class-0[state|active] {
  color: blue;
}
.class-1[state|color=yellow] {
  color: yellow;
}
```

```handlebars
<div class="class-0" state:active={{isActive}}>
<div class="{{style-if isColorful 'class-1'}}" state:color={{dynamicColor}}>
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

/* Notice: `[state|active]` will *only* be applied when `.class-0` is also applied! */
.block__class-0.block__class-0--active {
  color: blue;
}

/* Notice: `[state|color=yellow]` will *only* be applied when `.class-1` is also applied! */
.block__class-1.block__class-1--color-yellow {
  color: yellow;
}
```

```javascript
// For Element 1:
//   - `.class-0` is always applied
//   - [state|active] is *only* applied when `isActive` is true
const el1Classes = [
  "block__class-0",  
  isActive && "block__class-0--active"
].join(' ');

// For Element 2:
//   - `.class-1` is applied when `isColorful` is true
//   -  `[state|color=yellow]` is applied when `dynamicColor` === "yellow"
const el2Classes = [
  isColorful ? "block__class-1" : "",
  dynamicColor === "yellow" ? "block__class-1--color-yellow" : "",
].join(' ');
```

> Note: The above functional syntax is only here to explain the concept of `RewriteMapping`s and conditional style application! Please read about css-blocks' [Runtime Library][RUNTIME] to learn about how this dynamicism is actually represented in the browser.

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
// `[state|color=yellow]` will *only every be applied when `isColorful` 
// is also truthy.
const el2Classes = [
  isColorful ? "a c" : "",
  isColorful && dynamicColor === "yellow" ? "e" : "",
].join(' ');
```

Now, as mentioned above, what actually gets written out to your templates is *not* the very explicit JavaScript syntax you see above. The examples above were only written in that way to help explain the concept of `RewriteMapping`s.

To make life easy for template rewriters, css-blocks delivers its own tiny (~500byte) [Runtime Library][RUNTIME]. Rewriters only need to make sure they invoke this runtime function with the arguments provided to them by the `RewriteMapping` using the template's preferred syntax. You can read about implementation details of this runtime library in its package's [README][RUNTIME].

Because all this runtime logic is abstracted away from template rewriters, they can focus on a single task: understanding the template syntax and transforming individual elements.

---

And there it is. That is what happens, end to end, when you build a css-blocks project. Now lets talk about the code that actually makes this process tick.

# Project Structure

CSS Blocks is structured as a mono-repo, meaning all of the  packages we're about to talk about live in *this* Git repository, but still publish to individual node modules. You can read more about mono-repos and the associated tooling on the [lernajs.io][LERNA_WEBSITE] website.

Every module in css-blocks has its own dedicated README that deep-dives into the nitty-gritty implementation details of that package. So, instead of capturing that complexity here, this section will function as a reference for the major modules in css-blocks and provide a high-level description of each module's function.

The css-blocks mono-repo is organized into the following packages:

## Core Packages

Core css-blocks packages deliver anything that is considered a core-concern of css-blocks – including but not limited to: all the Block file parsing, analysis, and compilation logic, the browser runtime, shared rewrite data structures, etc.

### [@css-blocks/core][CORE]
Here be Dragons – `@css-blocks/core` is the package that drives everything that happens between reading a Block file and outputting final CSS! CSS Blocks core nearly deserves to be a mono-repo in its own right. All `BlockSyntax` features, functionality for constructing `BlockTrees`, the base class for all `Analyzer`s, the `BlockFactory` and `BlockCompiler` implementations, and more, live in this package.

### [@css-blocks/runtime][RUNTIME]
The runtime package delivers the very slim in-browser runtime that handles dynamic class application. The high-level concept of *what* the runtime does is briefly explained in the **Rewrite Phase** section above, but for a more detailed examination of how we actually execute these arbitrary binary expressions, with N number of static or dynamic classes, check out this project's README.

### [@css-blocks/code-style][RUNTIME]
This is a utility package that provides TSLint code style rules for the project. Currently, for consistency, it simply re-exports the code style rules delivered by [@css-blocks/opticss][OPTICSS], the CSS optimizer.

## Template Integrations
A core requirement of css-blocks is the ability to analyze and rewrite your application's templates. Because of language differences, every templating system will have a *slightly* different syntax when importing / referencing Blocks from a template, and for interacting with css-blocks classes / states in the markup.

**Template Integration** packages' sole responsibility is to understand your project's specific templating syntax (ex: Glimmer, JSX, etc) and provide language specific `Analyzer` and `Rewriter`s.

**Analyzers** will typically be run on one (1) entry point template and are responsible for two (2) things as the crawl the template dependency tree:
 
  1. Discover Block files referenced by the templates and pass them to the `BlockFactory` (provided by `@css-blocks/core`) for compilation and,
  2. After Block compilation, crawl every element in every template and log relevant Block class/state usage information on an `Analysis` object (also provided by `@css-blocks/core`).

**Rewriters** are responsible for taking the aforementioned `StyleAnalysis` objects emitted from a Block compilation and transforming templates to use the new classes and updated dynamic expressions. **Rewriters** are a little more free-form than **Analyzers** because the will typically need to interface with the existing template compilation pipeline (ex: Babel Plugins for JSX, Glimmer AST Plugins for Glimmer).

Specific instructions for a given template integration can be found in their respective packages:

### [@css-blocks/glimmer][GLIMMER]
Provides the template integration for [Glimmer Templates][GLIMMER_WEBSITE].

### [@css-blocks/jsx][JSX]
Provides the template integration for [JSX Templates][JSX_WEBSITE].

## Build System Integrations
**Build System Integrations** are what allow css-blocks to work anywhere. Because the system is designed to be modular, a build integration can be made for any consuming build system. Every build integration will export a css-blocks plugin, in the form required by the system, and have some method to provide it an **Analyzer** and **Rewriter** to run on the project.

These build system integrations are responsible for understanding the file system abstraction provided by the build system, handing off templates to the **Analyzer** for analysis, and shuttling `StyleAnalays` data between the **Analyzer** and **Rewriter**.

### [@css-blocks/broccoli][BROCCOLI]
Provides the build system integration for [Broccoli][BROCCOLI_WEBSITE].

### [@css-blocks/webpack][WEBPACK]
Provides the build system integration for [Webpack][WEBPACK_WEBSITE].

### [@css-blocks/ember-cli](EMBER_CLI)
Provides the build system integration for [Ember CLI][EMBER_CLI_WEBSITE].

[PROJECT_HOME]: .
[CORE]: ./tree/docs/packages/css-blocks
[RUNTIME]: ./tree/docs/packages/runtime
[OPTICSS]: https://github.com/css-blocks/opticss
[WEBPACK]: ./tree/docs/packages/webpack-plugin
[BROCCOLI]: ./tree/docs/packages/broccoli-css-blocks
[JSX]: ./tree/docs/packages/jsx
[GLIMMER]: ./tree/docs/packages/glimmer-templates

[EMBER_CLI_WEBSITE]: ./packages/ember-cli
[WEBPACK_WEBSITE]: https://webpack.js.org/
[BROCCOLI_WEBSITE]: http://broccolijs.com/
[JSX_WEBSITE]: https://facebook.github.io/jsx/
[GLIMMER_WEBSITE]: https://glimmerjs.com/
[LERNA_WEBSITE]: https://lernajs.io
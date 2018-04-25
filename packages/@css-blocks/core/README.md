<p align="center">
  <img alt="CSS Blocks" width="480px" src="http://css-blocks.com/static/media/wordmark-animated.012177e4.svg" />
</p>
<h2 align="center">@css-blocks/core</h2>

`@css-blocks/core` drives everything that happens between reading a Block file and outputting final CSS! This package nearly deserves to be a mono-repo in its own right. All `BlockSyntax` features, functionality for constructing `BlockTrees`, the base class for all `Analyzer`s, the `BlockFactory` and `BlockCompiler` implementations, and more, live in this package. As such, this codebase is best described in "packages", as you'll see below.

# Options

| Option | Default | Description |
|:--|:--|:--|
| **rootDir** | `process.cwd()` | The root directory from which all sources are relative. |
| **outputMode** | `"BEM"` | Block file output mode. One of [OutputMode][OUTPUT_MODE] |
| **preprocessors** | `{}` | A preprocessor function can be declared by [Syntax][SYNTAX]. |
| **importer** | [`FilesystemImporter`](./src/importing/FilesystemImporter.ts) | A custom importer to resolve identifiers passed to `@block-reference`. |
| **importerData** | `{}` | Additional data to make available to the importer. |
| **maxConcurrentCompiles** | `4` | Limits block parsing and compilation to this number of threads at any one time. |
| **disablePreprocessChaining** | `false` | If a preprocessor function is declared for `css`, all blocks will be ran through it, even those that were pre-processed for another syntax. This can be disabled by setting `disablePreprocessChaining` to true. |

# Packages

## /src/BlockTree

A `BlockTree` is an in-memory data model that captures all the complexity represented in a single Block file and exposes APIs for querying and manipulating its attributes.

`BlockTrees` are strongly typed (read: children must be of a single type), N-Ary (read: every layer may have any number of child nodes) trees composed of four (4) possible node types. These nodes **must** be arranged in the following hierarchy:

> `Block` => `BlockClass` => `Attribute` => `AttrValue`

The core implementation of `BlockTree` nodes, which every node type extends, lives in `/src/BlockTree/Inheritable.ts`. All nodes have common APIs concerning tree hierarchy and inheritance / resolution.

> Inheritance Example Here.

These four (4) node types each fit in to one of two (2) classifications: **Container Nodes** and **Style Nodes**. These classifications and node types are described in detail below.

### Container Nodes
Container Nodes...contain other nodes ;) These nodes contain logical groupings of like-nodes. Each container node type may implement convenience methods that make sense for the type of nodes it contains.

#### Block
A `Block` node is always the root of any `BlockTree`. A `Block` may be parent to any number of `BlockClass`es. The `:scope` selector is considered a special kind of `BlockClass` selector and is also stored as a child of `Block`.

`Block` nodes also store all data related to any `@block-reference`s, the `block-name`, implemented `Blocks`, the inherited `Block`, and any other metadata stored in the Block file. `Block`s also have a special `rootClass` property that points directly to the child `BlockClass` that represents the parsed `:scope` selector .

#### Attribute
An `Attribute` node represents a single unique attribute `namespace|name` pair and is a parent to any number of `AttrValue` nodes, which represent all the possible attribute values for this `Attribute` discovered in the Block file. An `Attribute` node's parent is always a `BlockClass`. Attribute selectors where no value is specified are considered a special kind of `AttrValue` and is also stored as a child of `Attribute`.

`Attribute` nodes expose APIs suited for querying information about their children `AttrValue`.

### Style Nodes
Style nodes represent fully resolved selectors that apply a CSS ruleset the the matching elements. For css-blocks these are `BlockClass` and `AttrValue` nodes.

Style nodes inherit from the abstract `/src/BlockTree/Style.ts` class and augment the base `Inheritable` class to store `RulesetContainer` objects to track property concerns and property resolutions from all rulesets that target this Style and its pseudo-elements, and possess methods to query own and inherited generated class names for the Style node.

#### BlockClass
`BlockClass` nodes represent class selectors discovered in a Block file. `BlockClass` nodes may contain one to many `Attribute` container nodes and have methods for querying own and inherited `Attribute` and their `AttrValue` nodes.

#### AttrValue
`AttrValue` nodes represent an fully qualified attribute selector (meaning namespace, name and value are all defined) discovered in a Block file. `AttrValue` nodes are leaf nodes and may have no children.

### All Together Now
All these `BlockTree` objects, and the APIs they provide, enable css-blocks core to build an in-memory representation of any Block file, its dependencies, and all its data, in a format that is easily traversable and query-able.

For details on all the APIs available on `BlockTree`s and their constituent parts, I invite you to explore the [API documentation](TODO).

## /src/BlockCompiler
The **BlockCompiler** package delivers a single class: the `BlockCompiler` (go figure 😉).

`BlockCompiler`s are responsible for taking a `Block` object, a `postcss.Root` (and an optional `Analyzer` to help guide final stylesheet output), and returning a transformed `postcss.Root` with all classes and states replaces with their globally unique output names, and all resolution and inheritance selectors emitted in the stylesheet.

> Note: Currently in master we don't accept a whole `Analyzer`, just a single `Analysis`. We should.

Much of what currently goes in to Block compilation amounts to a find and replace of all classes and states with their generated, globally unique, class names. The format of these generated selectors are dictated by the `OutputMode` specified in the CSS Blocks' configuration, and defaults to BEM.

Block compilation becomes a little more complicated once we begin emitting conflict resolution selectors. In cases where explicit resolutions are provided, or when one Block inherits from another and re-defined an inherited CSS property, we need to emit a conflict resolution selector so the browser exhibits the expected behavior. This involves merging two, potentially complicated, selectors so the new selector will only match when both overridden selectors are applied. For example:

**Input**
```css
/* other.css */
:scope { block-name: "other"; }
:scope[state|active] .bar { color: blue; }

/* main.css */
@block-reference other from "./other.css";
:scope { block-name: "main"; }
:scope:hover .foo { color: red; color: resolve("other.bar"); }
```

**Output**
```css
/* Compiled "other.css" */
.other--active .other__bar { color: blue; }

/* Compiled "main.css" */
.main:hover .main__foo { color: red; }

/* Emitted Resolution Selector */
.other--active.main:hover .main__foo.other__bar { color: blue; }
```

## /src/BlockParser
The **BlockParser** package contains all constructs that handle converting an Block file into a `BlockTree`, including preprocessor integrations.

### `BlockFactory`
The primary class delivered by **BlockParser** is the `BlockFactory`. The `BlockFactory` is responsible for creating new Block objects and ensuring that every unique Block file is only parsed once. If the same file is re-requested, the `BlockFactory` will return the same promise as the previous parse request which will resolve with the same shared `Block` object. Like most [Factory Pattern](https://en.wikipedia.org/wiki/Factory_method_pattern) implementations, most consumers will exclusively interface with the `BlockFactory` when creating new `Block`s and should not have to worry about the parser itself.

#### Preprocessor Support
It is also the responsibility of the `BlockFactory` to only start Block compilation **after** all user-provided preprocessor steps have been finished. The configuration options for preprocessor integration can be found in this package.

### `BlockParser`
Under the hood, the `BlockFactory` uses a `BlockParser` to convert the provided `postcss.Root` into a new `Block` object. The `BlockParser` is modeled after something akin to the [Builder Pattern](https://en.wikipedia.org/wiki/Builder_pattern#Class_diagram) and runs the newly minted `Block` through a series of feature-specific "middleware". Each middleware, found in `src/BlockParser/features`, is responsible for reading, and augmenting the new `Block`, with a single language feature concern.

It is important that the supplied `postcss.Root` is **not** transformed in any way during this parse phase. The postcss tree should be considered read-only in all `BlockParser` feature middleware and only be used to construct the resulting `BlockTree`.

> Note: The **only** place that `block-intermediates` are used outside of `BlockParser` is one place in `BlockTree`. We should work to refactor `block-intermediates` out of `BlockTree` and make it a construct completely private to the package.

## /src/BlockSyntax
The **BlockSyntax** package delivers CSS Blocks specific syntax constants, and a few simple parsing functions, used in Block files. [You can look at the API documentation][TODO] for details.

All CSS Blocks specific syntax used in Block files should be defined here. No other package should be re-defining these constants for parsing functions.

## /src/Analyzer

> Note: I'm writing this section, not as the Analyzer implementation is currently written, but how I'd like to see it implemented in the near future. I have this working as described here in a branch.

The **Analyzer** package delivers the classes, data models, and types that are required by a [Template Integration][TODO]. It is the Template Integrations' responsibility to, given a number of template entry-points, know how to crawl the template dependency tree and analyze every element of every template discovered.

There are three (3) core classes that drive every Template Analyzer integration:

### `Analyzer`
The `Analyzer` class is the base class that all Template Integrations must derive from. It represents the project-wide analysis of *all* templates reachable from the list of entry-points provided. An extender of `Analyzer` is expected to implement the abstract `analyze(...entry-points: string)` method, as this is what will be called by Build Integrations to kick off analysis.

The `Analyzer` has a factory method, `getAnalysis()` to retrieve a new `Analysis` object (described below) for each template discovered. The `Analyzer` will then crawl the contents of the template and log all Block usage data for the template on that `Analysis` object.

`Analyzer`s have a number of convenience methods for accessing and iterating over `Analysis` objects created after an analysis pass. `Analysis` objects may be re-used (ex: in dev rebuilds) by calling their `reset()` method to clear all caches and saved data from the previous analysis pass. These methods can be explored over in the [Analysis API documentation][TODO].

### `Analysis`
The `Analysis` object represents a single template's Block usage data. These are created by the `Analyzer` during an analysis pass for every template discovered when crawling the template dependency tree.

It is the Template Integration's responsibility to assemble each `Analysis` to accurately represent the Block usage in the template. This includes adding all referenced Blocks to the `Analysis` object, and creating a new `ElementAnalysis` (described below) for every element in the template and registering all used Block styles with the `ElementAnalysis`.

`Analysis` objects function as factories for `ElementAnalysis` objects. When a new element is discovered, Template Integrations can call `startElement()` on the current template's `Analysis`, to create a new `ElementAnalysis`. The integration can then add discovered Block styles to the `ElementAnalysis`. Once all Block styles have been registered with the `ElementAnalysis`, the integration may then call `endElement()` to seal the `ElementAnalysis`.

### `ElementAnalysis`
The `ElementAnalysis` object represents a single element's Block usage data and are retrieved from a template's `Analysis` object using the `Analysis.startElement()` factory function. The last returned `ElementAnalysis` object remains un-sealed until `Analysis.endElement()` is called.

Un-sealed `ElementAnalysis` objects may be used to store Block style usage data saved to them (read: `BlockClass` and `AttrValue`s). Any given Block style used in a template may be either Static, Dynamic, or Mutually Exclusive.

For example, given the following Block file, we can determine the type of usage in the handlebars snippets below:
```css
.my-class            { /* ... */ }
.other-class         { /* ... */ }
[state|active]       { /* ... */ }
[state|color="red"]  { /* ... */ }
[state|color="blue"] { /* ... */ }
```

Static styles are guaranteed to never change:
```handlebars
<div class="my-class" state:active="true"></div>
```

Dynamic styles may or may not be applied depending on application state:
```handlebars
<div class="{{style-if value 'my-class'}}" state:active={{isActive}}></div>
```

Mutually Exclusive styles are guaranteed to never be used on the element at the same time:
```handlebars
{{!-- `my-class` and `other-class` are mutually exclusive --}}
{{!-- `[state|color=red]` and `[state|color=blue]` are mutually exclusive --}}
<div class="{{style-if value 'my-class' 'other-class'}}" state:color={{color}}></div>
```

Every Template Integration's syntax for consuming Blocks will differ slightly. It is the responsibility of the integration to implement template parsing and Block object discovery to feed in to the `ElementAnalysis` APIs. You can read more about these style tracking methods on the [`ElementAnalysis` API documentation][https://css-blocks.com/api/classes/_css_blocks_core.elementanalysis.html].

Once an `ElementAnalysis` is sealed, a number of automatic validations run on it to ensure no template rules have been violated. These template validators are defined as independent plugins and may be enabled or disabled individually. By default, they are all enabled. These validations live under `/src/Analyzer/validations` and include:

 - `attribute-group-validator`: Verify that any given State attribute is only applied once to an element.
 - `attribute-parent-validator`: Ensure that State attributes are always applied with their owner class.
 - `class-paris-validator`: If two classes from the same block are applied to the same element, throw.
 - `property-conflict-validator`: If two styles might be applied at the same time on the same element, and they have an un-resolved conflicting property concern, throw.
 - `root-class-validator`: Prevent the `:scope` class and a `BlockClass` from being applied to the same element.

## /src/TemplateRewriter
Because each Template Integration has to leverage whatever plugin / AST transform system is provided by the templating system, Rewriters are a little more free-form than Analyzers. As such, there is no single base class for Rewriters to extend from.

Instead, this package delivers data models that Template Integrations may leverage to query data about *how* to rewrite elements they encounter during the rewrite phase. It is the responsibility of the Build Integration to shuttle these rewrite data to the actual rewriter integration.

> Note: We really need to standardize how data is handed off from the Analyzer to the Rewriter, agnostic of the Build Integration... This works for the limited number of template integrations we have today, but will not scale well. Aka: a Vue integration may need its own Broccoli build integration because Broccoli is currently *very* Glimmer specific. We have too tight a coupling between Template Integration and Build Integration.

**TODO:** Write more about `TemplateRewriter` data models and their APIs.

## /src/configuration
The **configuration** package contains the CSS Blocks build configuration utilities, including Typescript types for the configuration hash, a configuration reader to normalize user-provided configuration hashes with default values.

See the options table at the top of this file for configuration object details.

## /src/importing
CSS Blocks needs to know where to get a Block file's contents when provided a file `FileIdentifier` from an `@block-reference`. Most of the time, this file path will be a file on disk, in which case the default importer delivered with CSS Blocks will work out of the box. However, in cases where custom resolution of `@block-reference`s are required, consumers are able to provide their own implementation of the CSS Blocks `Importer` interface to deliver this custom behavior.

A custom importer may be passed to CSS Blocks via the `importer` options of the configuration object. Custom importers will understand how to resolve information about the `FileIdentifier` passed to `@block-reference` and are used to abstract application or platform specific path resolution logic.

Any CSS Blocks `Importer` **must** implement the interface defined for a CSS Blocks `Importer` in [`/src/importing/types.ts`](./src/importing/types.ts). Every importer is required to have a number of introspection methods that return standard metadata for a given `FileIdentifier`:

 - **identifier**: Return a globally unique identifier for the `FileIdentifier`
 - **defaultName**: Return the default Block name to use if no `block-name` is set.
 - **filesystemPath**: If this `FileIdentifier` is backed by the filesystem, return the absolute file path.
 - **debugIdentifier**: Returns a string meant for human consumption that identifies the file. Used for debug and error reporting.
 - **syntax**: Return the syntax type the contents of this file are written in. One of [`Syntax`][SYNTAX].

However, the primary method for any importer is its `import()` method. `import()` returns a promise that resolves with a metadata object which not only contains all the information outlined above, but also the stringified contents of the file. It is these contents that the `BlockFactory` will use to create a `BlockTree`.

For any custom importers that require extra data to be passed by the end-user, the `importerData` CSS BLocks config option has been specially reserved as a namespaced location for extra importer data to be passed. All importer methods are passsed the full CSS Blocks config object as their last argument.

CSS Blocks ships with two (2) pre-defined importers.

 1. `FilesystemImporter`: This is the default importer used by CSS Blocks if no other is provided. It enables `@block-reference`s to resolve relative and absolute file references
 2. `PathAliasImporter`: The PathAliasImporter is a replacement for the fileystem importer. Relative import paths are first checked to see if they match an existing file relative to the from identifier (when provided). Then if the relative import path has a first segment that is any of the aliases provided the path will be made absolute using that alias's path location. Finally any relative path is resolved against the `rootDir` specified in the CSS Block configuration options.

## /src/util
Utilities used inside the CSS Blocks repo. These are:

 - **PromiseQueue**: Enqueue a series of tasks to run in parallel. If a task fails, it will wait for all running jobs to either finish or fail before rejecting.
 - **unionInto**: Like `Object.assign`, but for Sets.

[SYNTAX]: ./src/BlockParser/preprocessing.ts#L11
[OUTPUT_MODE]: ./src/configuration/OutputMode.ts

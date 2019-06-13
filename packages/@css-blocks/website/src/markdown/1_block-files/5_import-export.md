---
name: Imports and Exports
title: Importing and Exporting Blocks
---

So now you know about Block files, the core unit of isolation in CSS Blocks, and the rules imposed on the selectors they contain.

However, application styles rarely live in isolation! This is where Block imports and exports come in to play.

A Block may declare a dependency on another Block by using a `@block` import at the top of your file. A `@block` import creates a locally scoped reference to the other Block where you can access the public API (declared classes and states) for a variety of purposes.

It is import to note that **Block references don't cause any styles to be included**. Instead, they are like an ES6 `import` statement -- they make it possible to refer to the public interface of another Block from within the current Block.

You can use the `@block` at-rule to import a block and assign a locally scoped name with which to reference it:

```css
/* block-1.block.css */
:scope { block-name: block-1; }
.my-class { /* ... */ }
.my-class[state|my-state] { /* ... */ }
```

```css
/* block-2.block.css */
@block other-block from "./block-1.block.css";

:scope { block-name: block-2; }
```

With the above code, `block-2` now has a local reference, `other-block`, which points to `block-1`. We can now freely use the `other-block` identifier inside of `block-2` when we want to reference `block-1`. This comes in handy! Especially with some of the advanced features we will review in the following sections:

 - Block Extension
 - Block Implementation
 - In-Stylesheet Composition
 - Conflict Resolution

 But, lets quickly review the ins and outs of Block import and export syntax before diving in to advanced features, shall we?

 ## Block Imports

 A Block file will always have a `default` export. The default export of a Block file are the rules it defines in its own file body.

 Much like ES6 imports, you can import the `default` export of a Block by either using the default import shorthand, or by aliasing the `default` keyword explicitly. For example, the following two import lines are equivalent:

 ```css
  /* The following two lines are equivalent. */
  @block fubar from "other.block.css";
  @block ( default as fubar ) from "other.block.css";
```

This alias-by-name import syntax becomes helpful when a Block chooses to export more than just its own `default` Block. Much like ES6 imports, you can reference additional Blocks exported by a Block file using this dereferencing syntax:

```css
@block other, ( ref1, ref2 as block2 ) from "other.block.css";
```

> Note: `default` as a Reserved Import Word
>
> Because every Block automatically has a `default` export – the rules inside the file
> itself – it is not permitted to import a Block under the name `default`. You
> will receive a build time error message if you try to.

Again, much like ES6 imports in Node.js, import paths may either reference the file system with relative paths, or a module in `node_modules` that specifies a main Block in its `package.json`. Modules expecting to deliver a Block for import can specify the default Block like so:

```js
{
  name: "my-module",
  version: "1.0.0",
  /*...*/
  "css-blocks": {
    main: "path/to/main.block.css"
  }
}
```

Now, if an app that depends on "my-module" tries to import:
```css
@block my-module from "my-module";
```
The app will receive the Block located at `node_modules/my-module/path/to/main.block.css`.

## Block Exports

Importing a Block allows you to reference it locally. In order to expose an imported Block
as importable under a specific name, you must explicitly re-export it. Exports are written using the
`@export` directive. Exports may be done under the same local name:

```css
@block other from "other.block.css";

@export other;
```

Or by mapping it to a new external alias:

```css
@block other from "other1.block.css";
@block other2 from "other2.block.css";

@export ( other, other2 as block1 );
```

> Note: `default` as a Reserved Export Word
>
> Because every Block automatically has a `default` export – the rules inside the file
> itself – it is not permitted to export a Block under the name `default`. You
> will receive a build time error message if you try to.

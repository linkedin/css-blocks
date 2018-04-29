# CSS Blocks JSX Analyzer / Rewriter

CSS Blocks' JSX integrations is inspired by CSS Modules to provide an API that is in-line with the expectations of the React and JSX communities.

## Syntax

Blocks may be imported to any JSX file like any other asset. CSS Block files *must* end with the extension `{block-name}.block.css`.

```jsx
import styles from "my-block.block.css";
```

### Scopes, Classes, and States
Block files have a single default export that is the Block itself. Classes are exposed as properties on this object, and states are exposed as methods. The default import itself represents the `:scope` selector and may be applied like any other class.

```jsx
import styles from "my-block.block.css";

// References the `:scope` selector.
<div className={styles} />;

// References the class `.myClass` from the imported block.
<div className={styles.myClass} />;

// References the state `:scope[state|rootState]` from the imported block.
<div className={styles.rootState()} />;

// References the state `.myClass[state|classState]` from the imported block.
<div className={styles.myClass.classState()} />;

```

### Sub-States
To reference sub-states on a state, pass the sub-state value as the first (and only) argument. If a variable is seen to be passed to a state, the rewriter will add an import for the CSS Blocks runtime and be sure to preserve all possible runtime behaviors.


```jsx
import styles from "my-block.block.css";

// References the sub-state `.myClass[state|rootState="foo"]` from the imported block.
<div className={styles.rootState("foo")} />;

// References the sub-state `.myClass[state|classState="bar"]` from the imported block.
let tmp = "bar"
<div className={styles.myClass.classState(tmp)} />;

```

### Composition

Multiple blocks may be imported into a single JSX file and be applied to a single element. To combine styles, use the [`obj-str`](https://www.npmjs.com/package/obj-str) package. Logic passed to obj-str is preserved in the rewrite.

```jsx
import objstr from "obj-str";
import styles from "my-block.block.css";
import typography from "typography.block.css";

// Apply `my-block:scope` and `typography.small`
let styleOne = objstr({
  [styles]: true,
  [typography.small]: true
});
<div className={styleOne} />;

// Apply `my-block:scope` and `my-blocks[state|enabled]`
let styleOne = objstr({
  [styles]: true,
  [styles.enabled()]: isEnabled
});
<div className={styleOne} />;

```

### Restrictions

  1. Block references may not be used outside of the `className` property (or `class` for Preact), or an `obj-str` call.
  2. If a dynamic value is passed to a state "method", then we can not determine through static analysis which sub-states are used by the program, so all possible sub-states will be included in the final CSS output. When possible, pass state "methods" a string literal.

## Integration

### Analyzer

The JSX Analyzer extends the main CSS Blocks core Analyzer. Its constructor accepts a unique name, to help with debugging, and an options hash:

```js
import { Analyzer } from "@css-blocks/jsx";
let analyzer = new Analyzer("unique-name", options);
```

Possible options are:

| Option | Default | Description |
|:--|:--|:--|
| **baseDir** | `process.cwd()` | The root directory from which all sources are relative. |
| **types** | "none" | Which JavaScript typing language to enable. Options are: "typescript", "flow" or "none" |
| **aliases** | `{}` | Resolution aliases used for Block files. If no file is found at the exact path specified, the Block importer will attempt to resolve using these path aliases. |
| **compilationOptions** | {} | Provide custom compilation options to [@css-blocks/core](../core#options). |

The Analyzer may be passed to a build integration. For JSX, this will typically be [Webpack](../webpack);

### Rewriter

The JSX Rewriter is a Babel plugin that rewrites all JSX files that consume CSS Blocks according to data collected by the Analyzer. This Babel plugin will be passed directly to Babel through its `plugins` option, and will typically look something like this.

```js
plugins: [
  require("@css-blocks/jsx/dist/src/transformer/babel").makePlugin({ rewriter }),
],
```

The `makePlugin` method creates a new instance of the babel plugin with the shared-memory object `rewriter` in scope. The build integration will have some method of populating this `rewriter` shared-memory object with Analyzer data. Please refer to your selected build integration for details.

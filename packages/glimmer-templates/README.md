# CSS Blocks Integration for Glimmer Applications

A library for doing static analysis and rewriting of css-blocks styles with
Glimmer apps.

## Installation

```
yarn add @css-blocks/glimmer-templates
```

or

```
npm install --save-dev @css-blocks/glimmer-templates
```

## Usage

This integration for css-blocks with Glimmer creates a convention where every component
has an associated css-block. The classes and states of that block are exposed by default
to the template. Other blocks are exposed to the template using the `@block-reference`
at-rule from within the stylesheet.

## Template Syntax

Given the following CSS Block definition:

```css
@block-reference grid from "./grid.block.css";
:scope { block-name: my-component; /* ... */ }
[state|loading] { /* ... */ }
.sidebar { /* ... */ }
.sidebar[state|collapsed] { /* ... */ }
.main { /* ... */ }
.recommended { /* ... */ }
```

```css
.one-fifth { /* ... */ }
.one-fifth[state|gutter-right] { /* ... */ }
.four-fifths { /* ... */ }
```

We can style a glimmer template like so:

```hbs
<div state:loading={{isLoading}}>
  <aside class="sidebar grid.one-fifth" state:collapsed state:grid.gutter-right>
  </aside>
  <article class="{{style-if isRecommended 'recommended' 'main'}} grid.four-fifths">
  </article>
</div>
```

Of note here:
 - The styles for the `:scope` class are automatically applied to the root element of the component (in this case: `div`).
 - Classes and states from referenced blocks are prefixed with the name of the block (in this case: `grid`)
 - The only expressions allowed in `class` attributes are the CSS Blocks specific `{{style-if}}` and `{{style-unless}}` helpers. Otherwise, a build time error is thrown.


## Creating an Analyzer

The default Analyzer performs a transitive analysis by traversing the component
hierarchy as well as the block's dependencies on other blocks. This analysis can
be provided to the css-blocks compiler and optimizer to remove dead css and enable
powerful optimizations.

```ts
import * as path from "path";
import {
  Project,
  Rewriter,
  HandlebarsTransitiveStyleAnalyzer as Analyzer
} from "@css-blocks/glimmer-templates";
import projectConfig from "./projectConfig";
let projectDir = path.resolve(__dirname, "..");
let project = new Project(projectDir, projectConfig);
let analyzer = new Analyzer(project, "my-app-component");
analyzer.analyze().then((analysis) => {
  console.log(analysis.serialize(projectDir));
});
```

### Glimmer Project Layout for CSS Blocks

You must add a new `stylesheet` type to your project so that every component
has an associated CSS block. This means you must declare a new type in the
`types` section and add `"stylesheet"` to the component types.

**Example:**

```js
const glimmerProjectConfiguration = {
  types: {
    application: { definitiveCollection: 'main' },
    component: { definitiveCollection: 'components' },
    helper: { definitiveCollection: 'components' },
    renderer: { definitiveCollection: 'main' },
    template: { definitiveCollection: 'components' },
    stylesheet: { definitiveCollection: 'components' }
  },
  collections: {
    main: {
      types: ['application', 'renderer']
    },
    components: {
      group: 'ui',
      types: ['component', 'template', 'helper', 'stylesheet'],
      defaultType: 'component',
      privateCollections: ['utils']
    }
  }
}
```

Note: at this time the default block file for a component must be named `stylesheet.css` -- the standard naming convention of `*.block.css` does not work.

## Rewriting Templates

After analyzing templates and compiling & optimizing the CSS blocks that are
used, the glimmer template must be rewritten to use the right classnames. Glimmer
accepts AST plugins during the precompilation step.

Here's an example script for how to analyze and rewrite a single template. Integration
with your specific build system will be required.

```ts
import * as path from "path";
import {
  StyleMapping
} from "css-blocks";
import {
  Project,
  Rewriter,
  RewriterOptions,
  HandlebarsStyleAnalyzer as Analyzer,
} from "@css-blocks/glimmer-templates";
import {
  precompile
} from "@glimmer/compiler";
import projectConfig from "./projectConfig";
let projectDir = path.resolve(__dirname, "..");
let project = new Project(projectDir, projectConfig);
let analyzer = new Analyzer(project, "my-app-component");
analyzer.analyze().then((analysis) => {
  let template = project.templateFor("my-app-component");
  let options = {
    meta: {},
    plugins: {
      ast: [Rewriter]
    },
    cssBlocks: {
      styleMapping: StyleMapping.fromAnalysis(analysis)
    }
  };
  let compiledFile = precompile(template.string, options);
  console.log(compiledFile);
});
```

## To Do

* Default the name for a component's main block stylesheet to the name of the component so that
  `:scope { block-name: name-of-component; }` is not required.

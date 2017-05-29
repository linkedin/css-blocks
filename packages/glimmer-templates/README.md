# CSS Blocks Analyzer for Glimmer Applications

A library for doing static analysis and rewriting of css-blocks styles with
Glimmer apps.

## Installation

```
yarn add @css-blocks/glimmer-analyzer
```

## Creating an Analyzer

```ts
import Analyzer from ".";
let analyzer = new Analyzer("test/fixtures/styled-app");
analyzer.analyze("my-app").then((analysis) => {
  console.log(analysis.serialize());
});
```

## Analyzing Styles

### `analyze(componentName)`

Validate styles are used correctly and extact necessary information
for block compilation and optimization.

```ts
import Analyzer from ".";
let analyzer = new Analyzer("test/fixtures/styled-app");
analyzer.analyze("my-app").then((analysis) => {
  console.log(analysis.serialize());
});
// {
//   template: 'test/fixtures/styled-app/src/ui/components/my-app/template.hbs',
//   blocks: { '': 'test/fixtures/styled-app/src/ui/components/my-app/stylesheet.css' },
//   stylesFound: [ '.root', '[state|is-loading]' ],
//   styleCorrelations: [ [ 0, 1 ] ]
// }
```

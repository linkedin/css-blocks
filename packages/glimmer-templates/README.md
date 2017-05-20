# Glimmer Analyzer

A library for doing some static analysis of Glimmer apps.

## Installation

```
yarn add glimmer-analyzer
```

## Creating an Analyzer

```ts
import Analyzer from 'glimmer-analyzer';
let analyzer = new Analyzer('/path/to/glimmer/app');
```

## Template Dependencies

### `dependenciesForTemplate(componentName)`

Discover the child components used in a component's template.

```ts
import Analyzer from 'glimmer-analyzer';
let analyzer = new Analyzer('/path/to/glimmer/app');
analyzer.dependenciesForTemplate('my-component');
// {
//   path: '/my-app/components/my-component',
//   hasComponentHelper: false,
//   components: [
//     '/my-app/components/my-component/local-component',
//     '/my-app/components/my-other-component'
//   ]
// }
```

### `recursiveDependenciesForTemplate(componentName)`

Discover the child components used in a component's template, and the components
used in the child components' templates, and so on, until the entire dependency
graph has been walked.

```ts
import Analyzer from 'glimmer-analyzer';
let analyzer = new Analyzer('/path/to/glimmer/app');
analyzer.dependenciesForTemplate('my-component');
// {
//   path: '/my-app/components/my-component',
//   hasComponentHelper: false,
//   components: [
//     '/my-app/components/my-component/local-component',
//     '/my-app/components/my-component/local-component/we-must-go-deeper',
//     '/my-app/components/my-other-component',
//     '/my-app/components/user-profile',
//     '/my-app/components/some-component-used-by-my-other-component-but-not-my-component'
//     '/my-app/components/no-one-reads-readmes-anyway',
//   ]
// }
```

## Treeshaken Resolution Maps

Glimmer uses a [resolution
map](https://github.com/glimmerjs/resolution-map-builder#the-resolution-map) to
map components used in your templates to their underlying modules. Instead of
building a resolution map that contains everything for the whole app, you can
build a map that contains the modules for just a single component (an entry
point for a route, for example) and all of its dependencies.

### `resolutionMapForEntryPoint`

Returns the resolution map for the app with everything but the given component
and its dependencies removed. If you don't provide the map as the second
argument, it will try to generate one for you.

```ts
import Analyzer from 'glimmer-analyzer';
let analyzer = new Analyzer('/path/to/glimmer/app');
let resolutionMapForWholeApp = ...;

analyzer.resolutionMapForEntryPoint('my-component', resolutionMapForWholeApp);
// {
//   'component:/my-app/components/my-component': 'ui/components/my-component/component.ts',
//   'template:/my-app/components/my-component': 'ui/components/my-component/template.hbs',
//   'component:/my-app/components/my-component/page-banner': 'ui/components/my-app/page-banner/component.ts',
//   'template:/my-app/components/my-component/page-banner': 'ui/components/my-app/page-banner/template.hbs',
//   'template:/my-app/components/ferret-launcher': 'ui/components/ferret-launcher/template.hbs',
// }
```

# CSS Blocks Integrations

CSS Blocks requires deep integration with your build system & templating language.

CSS Blocks can, functionally, be integrated with any combination of build and template systems. However there are currently a few that we support within this repo and project directly.

To learn how to install css-blocks for in your application please see the  documentation of that integration.

## Template Integrations
These packages are responsible for understanding a templating syntax (Glimmer, JSX, etc). They allow you to work with CSS Blocks inside your templates.

 * [@css-blocks/glimmer][GLIMMER]. The template syntax associated with Ember.
 * [@css-blocks/jsx][JSX] (_very_ pre-release). The template syntax associated with React.

## Build System Integrations  
These are the modules that allow CSS Blocks to work! They run CSS Blocks within your app or bundle. Each one exports a plugin in the form required for each system.

 * [@css-blocks/ember-cli][EMBER_CLI]. Ember's build tool.
 * [@css-blocks/broccoli][BROCCOLI]. A general purpose asset pipeline, also used internally by Ember.
 * [@css-blocks/webpack][WEBPACK] (_very_ pre-release). A generalized code bundler.

> Don't see your preferred platform yet?
>
> Learn how to make your own Template Integration or Build System Integrations in our [Architecture Documentation](./architecture.md#build-system-integrations) and contribute it back!


[GLIMMER]: ../packages/@css-blocks/glimmer
[JSX]: ../packages/@css-blocks/jsx
[EMBER_CLI]: ../packages/@css-blocks/ember-cli
[BROCCOLI]: ../packages/@css-blocks/broccoli
[WEBPACK]: ../packages/@css-blocks/webpack
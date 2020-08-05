<p align="center">
  <img alt="CSS Blocks" width="480px" src="http://css-blocks.com/static/media/wordmark-animated.012177e4.svg" />
</p>

# @css-blocks/ember

An ember-cli addon for Ember applications using CSS Blocks applications, addons, and engines that author stylesheets using CSS Blocks.

This addon is only part of the Ember build pipeline for CSS Blocks! Any application that consumes CSS Blocks from itself, an addon, or an engine will need the `@css-blocks/ember-app` addon as a dependency.

## Basic Usage

1. Add this addon as a dependency to your application, addon, or engine.
2. Also make sure you the application adds `@css-blocks/ember-app` as a dependency.
3. Run `ember build`. See the [README for `@css-blocks/ember-app](../ember-app/README.md) for more instructions.

## Options

The following options can be passed as options to the `css-blocks` property in your application's `ember-cli-build.js`.

* `output` - `<string>` Changes the filename where css-block's styles are written into the `app/styles` directory during the build. If this is set, the styles are never concatenated automatically with `app/styles/app.css`.
* `aliases` - `<object>` The keys of this object import aliases accept values that are absolute paths to a directory containing CSS Block files. E.g. `{myblocks: path.resolve(__dirname, '../blocks')}` would cause `@block foo from 'myblocks/header.block.css';` to import the `header.block.css` file in the `../blocks` directory.
* `analysisOpts` - Template analysis options. You probably don't need to set these.
* `parserOpts` - Options passed to the CSS Blocks parser and compiler. If not set, these options are loaded automatically from a `css-blocks.config.js` file. Using a CSS Blocks configuration file will allow other tools like the CSS Blocks command line (`@css-blocks/cli`) to load the same options as your ember application.
* `optimization` - Options passed to the Opticss optimizer. This can be used to selectively enable or disable specific optimizations or to explicitly disable all optimizations by setting the `enable` option to `false`.

## Common Gotchas

This section is devoted to common issues you might run into when working with this addon.

### Nothing yet...

There's nothing here yet, but we'll add things here as the need arises.

## More Reading

- [CSS Blocks User Documentation](https://css-blocks.com/)
- Ember Build Pipeline Technical Deep Dive - Link TBD
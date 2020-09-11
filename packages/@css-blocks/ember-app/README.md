<p align="center">
  <img alt="CSS Blocks" width="480px" src="http://css-blocks.com/static/media/wordmark-animated.012177e4.svg" />
</p>

# @css-blocks/ember-app

An ember-cli addon for Ember applications using CSS Blocks in its application code. This addon should be a dependency in Ember applications.

This addon is only part of the Ember build pipeline for CSS Blocks! Your application, as well as any addons or engines you rely on, will need the `@css-blocks/ember` addon as a dependency if they have any CSS Blocks files.

## Basic Usage

1. Add this addon as a dependency to your application.
2. Also make sure you add `@css-blocks/ember` as a dependency if you are authoring css using CSS Blocks.
3. Run `ember build`.

If your application has a `app/styles/app.css` file, the build output of CSS Blocks will be automatically added to end of that file. If your project uses some other filename (E.g. due to preprocessing) then a file named `app/styles/css-blocks.css` is added to your application styles directory during the build and it can be included/imported by your preprocessor or concatenated with other files to produce your application's css file.

If your application uses engines, the `css-blocks` service must be added as a dependency to each engine that uses `@css-blocks/ember`.

That's it! For development builds, we'll generate CSS output with some developer-friendly BEM class names so you can better understand your application. For production builds, you'll get a CSS artifact that's been concatenated, optimized, and minified.

## Options

The following options can be passed as options to the `css-blocks` property in your application's `ember-cli-build.js`.

* `output` - `<string>` Changes the filename where css-block's styles are written into the `app/styles` directory during the build. If this is set, the styles are never concatenated automatically with `app/styles/app.css`.
* `aliases` - `<object>` The keys of this object import aliases accept values that are absolute paths to a directory containing CSS Block files. E.g. `{myblocks: path.resolve(__dirname, '../blocks')}` would cause `@block foo from 'myblocks/header.block.css';` to import the `header.block.css` file in the `../blocks` directory.
* `analysisOpts` - Template analysis options. You probably don't need to set these.
* `parserOpts` - Options passed to the CSS Blocks parser and compiler. If not set, these options are loaded automatically from a `css-blocks.config.js` file. Using a CSS Blocks configuration file will allow other tools like the CSS Blocks command line (`@css-blocks/cli`) to load the same options as your ember application.
* `optimization` - Options passed to the Opticss optimizer. This can be used to selectively enable or disable specific optimizations or to explicitly disable all optimizations by setting the `enable` option to `false`.
* `broccoliConcat` - Options that control the behavior of broccoli-concat, which is used to concatenate CSS files together by ember-app during postprocess. If this is set to false, broccoli-concat will *not* run and you'll need to add additional processing to add the CSS Blocks compiled content to your final CSS build artifact.
* `appClasses` - List of classes that are used by application CSS and might conflict with the optimizer. You should add any short class names (~5 characters) to this list so the optimizer doesn't use these when building the CSS Blocks compiled output. This is a convenience alias for `optimization.rewriteIdents.omitIdents.class[]`. It has no effect if optimization is disabled.

## Common Gotchas

This section is devoted to common issues you might run into when working with this addon.

### Nothing yet...

There's nothing here yet, but we'll add things here as the need arises.

## More Reading

- [CSS Blocks User Documentation](https://css-blocks.com/)
- Ember Build Pipeline Technical Deep Dive - Link TBD
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

That's it! For development builds, we'll generate CSS output with some developer-friendly BEM class names so you can better understand your application. For production builds, you'll get a CSS artifact that's been concatenated and minified.

This addon also provides a template helper for your application: `-css-blocks-`. We take a closer look at how this helper works in the Ember Build Pipeline Technical Deep Dive. The quick summary is that this helper figures out what styles to apply to any templates or components with an associated CSS Blocks file. Any templates that were previously compiled using the `@css-blocks/ember` addon will reference this helper, so you'll need to make sure you have it available in your app.

## Options

None at the moment, but when they're available, we'll document them here.

## Common Gotchas

This section is devoted to common issues you might run into when working with this addon.

### Nothing yet...

There's nothing here yet, but we'll add things here as the need arises.

## More Reading

- [CSS Blocks User Documentation](https://css-blocks.com/)
- Ember Build Pipeline Technical Deep Dive - Link TBD
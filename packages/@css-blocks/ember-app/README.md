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

## Testing
Once you have integrated this addon within an ember application, all your CSS classnames are going to look very different from what they did in the block files that you had originally written and the output CSS classnames will vary across builds and across different machines. This is done intentionally to ensure that you don't use any CSS classname selectors in any of the tests and that your tests remain robust across executions. Not to mention, even the number of classes on an element can be entirely different after all the CSS has been optimized using opticss.

In order to faciliate testing in such an environment, this ember addon provides a utility method called `setupCSSBlocksTest()` that that exposes the CSS blocks service that can in turn be used to query the existence of certain classes on your elements.

Note: `setupCSSBlocksTest()` has been written to work with `ember-qunit` and `ember-mocha`.

### Test setup and usage
- In your integration or acceptance tests, call `setupCSSBlocksTest()` declaring any tests. Ensure that `setupCSSBlocksTest()` is called *after* `setupTest|setupRenderingTest|setupApplicationTest` for the setup to work as desired.
**Note: `setupCSSBlocksTest` is exposed within a service on the application's namespace and will have to be imported as such**
    ```js
    import { setupCSSBlocksTest} from '<appName>/services/css-blocks-test-support';
    ```
- After this, the css-blocks service is available to the test via `this.cssblocks`
- The test service primarily exposes a single API function, `this.cssBlocks.getBlock(<pathToBlock>, <blockName>)` that takes in a path to the block file and the an optional blockName. If the blockName isn't specified, the default block for the block file is returned. The <blockPath> begin with either the appName, the addon name (if its from an in-repo addon) or by the engine's name(in the case of an in-repo engine) that it is a part of. `getBlock()` returns a reference to the runtime CSS block which can be queried for styles within the block using `.style(<styleName>)`.
- The element can then assert whether a certain style is present on it or not using `element.classList.contains()`

Putting it all together in an example,
```js
import { setupCSSBlocksTest } from 'my-very-fine-app/services/css-blocks-test-support';

module('Acceptance | css blocks test', function (hooks) {
  setupApplicationTest(hooks);

  setupCSSBlocksTest(hooks);

  test('visiting /', async function (assert) {
    await visit('/');
    let defaultBlock = this.cssBlocks.getBlock("my-very-fine-app/styles/components/application", "default");
    let element = find('[data-test-large-hello]');
    assert.ok(element.classList.contains(defaultBlock.style(':scope[size="large]')));
  });
});
```

## Common Gotchas

This section is devoted to common issues you might run into when working with this addon.

### Nothing yet...

There's nothing here yet, but we'll add things here as the need arises.

## More Reading

- [CSS Blocks User Documentation](https://css-blocks.com/)
- Ember Build Pipeline Technical Deep Dive - Link TBD
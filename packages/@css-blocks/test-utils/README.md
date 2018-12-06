# Shared Test Utilities for `@css-blocks` Packages

These utilities are only used in the @css-blocks tests, so this package is not published.

## `import { mock } from @css-blocks/test-utils`

The `mock` utility provides tests the ability to temporarily mocks files on the filesystem. Works for all supported versions of Node.js. Once mocked, files generated using `mock` can be accessed like regular files by all Node.js filesystem calls.

You can mock files using the following API:

```js
mock({
  'filename.js': 'file-contents',
  'foldernames': {
    'can': {
      'nest': {
        'file.css': 'file-contents'
      }
    }
  }
});
```

To clean up all mocked filesystem files and directories when done, simply call:

```js
mock.restore();
```
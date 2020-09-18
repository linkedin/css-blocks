# CSS Blocks Eyeglass Integration
This package provides an easy way to integrate your CSS Blocks code with the Sass module manager [Eyeglass](https://github.com/linkedin/eyeglass).

## Installation

`npm install @css-blocks/eyeglass`

## Usage

Here's an example `css-blocks.config.js` file using this package.

```js
import sass from "node-sass";
import eyeglass from "eyeglass";
import { adaptor, adaptorSync } from "@css-blocks/eyeglass";

const sassOptions = {
  outputStyle: "expanded"
};

const scss = adaptor(sass, eyeglass, sassOptions);
const scssSync = adaptorSync(sass, eyeglass, sassOptions);

module.exports = {
  preprocessors: { scss }
  preprocessorsSync: { scss: scssSync }
};
```

## Building npm libraries that provide css-blocks written in Sass

If your library provides CSS Block files that are written with Sass it will
require the application that uses your library to include Sass preprocessing in
its configuration.

In turn, so the library can maintain control over the preprocessing configuration
that is used we recommend that your library ship an "optional adaptor" that
looks like this:

```ts
import { DirectoryScopedPreprocessor } from "@css-blocks/eyeglass";

// a path to where your block files live
const PACKAGE_DIR = path.resolve(__dirname, "..", "..") + "/";

class MyModulesPreprocessor extends DirectoryScopedPreprocessor {
  setupOptions(options: EyeglassOptions): EyeglassOptions {
    // Don't manipulate the options passed in.
    return Object.assign({}, options, {precision: 20});
  }
}

export const adaptor = new MyModulesPreprocessor(PACKAGE_DIR);
```

## Building applications that consume Sass-preprocessed css-blocks

If your application consumes CSS Block files that are written with Sass
you'll need to work with any adaptors provided by the extensions you're
using. This css-blocks/eyeglass integration provides a helper function that
will select the correct processor for the block file being processed or
fall back to a default sass processor.

This css-blocks configuration file is an example of how to consume the
eyeglass adaptors from other libraries that use this integration.

```ts
// css-blocks.config.js

const sass = require("node-sass");
const Eyeglass = require("eyeglass");
import { adaptAll, adaptAllSync } from "@css-blocks/eyeglass";

// See the documentation for your module to know how to import
// its adaptors.
import { adaptor as fancyAdaptor } from "fancy-module";
import { adaptor as anotherAdaptor } from "another-package";

const sassOptions = {
  // The default sass and eyeglass options for your application.
  // Where important, these options might be overridden by the module itself.
};

const sassOptionsSync = Object.assign({}, sassOptions, {
  // if necessary use different options for synchronous compilation (e.g. synchronous versions of JS functions)
});

// While it's probably irrelevant, the order of the adaptors here
// does matter, the first one that wants to process a file will win.
const eyeglassAdaptors = [
  fancyAdaptor,
  anotherAdaptor,
];

export default {
  preprocesors: {
    scss: adaptAll(eyeglassAdaptors, sass, eyeglass, sassOptions),
  }
  preprocesorsSync: {
    scss: adaptAllSync(eyeglassAdaptors, sass, eyeglass, sassOptionsSync),
  }
};
```

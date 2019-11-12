# CSS Blocks Configuration

Loads configuration for css-blocks from standardized locations so that build integrations, text editors, and the cli can all interoperate with the same configuration.

## Installation

```
yarn add @css-blocks/config
```

## Usage

```ts
import { Options as CSSBlocksOptions } from "@css-blocks/core";
import * as config from '@css-blocks/config';
// finds configuration starting in the current working directory.
let opts: CSSBlocksOptions | null = config.search();

// finds configuration starting in the specified directory;
opts = config.search(__dirname);

// loads a specific configuration file:
opts = config.load("config/css-blocks.js");
```

## Configuration Options

The values specified in the configuration files are expected to be legal options
for the [CSS Blocks configuration](../core/src/configuration/types.ts).
However, there are a few exceptions:

* `preprocesors` - This can be set to a file location of a javascript file that
  exports one or more preprocessors. The properties exported should correspond to the
  [supported syntaxes](../core/src/BlockParser/preprocessing.ts).
* `importer` - This can be set to a file location of a javascript file that
  exports an object with keys of `importer` and (optionally) `data`. If data
  is returned, it takes precedence over a configuration value for
  `importerData` in the current configuration file.
* `extends` - If provided, this configuration file located at the provided path
  is loaded and this configuration is deeply merged into it. Note: the values
  for `importer` and `importerData` are not deeply merged.
* `rootDir` - If this configuration property is not set explicitly, the directory of the
  configuration file is used.

Note: Any path to another file or directory is interpreted as being relative
to the directory of the file containing the path.
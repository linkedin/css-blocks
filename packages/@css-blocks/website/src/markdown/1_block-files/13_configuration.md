---
name: Configuration
title: Block Parser Configuration
---

There are a number of options you can pass to CSS Blocks that will affect how BLock files are compiled.

How you pass this options hash to the compiler will differ based on your integration. Please consult your platform's documentation for how to pass configuration options.

The configuration interface is defined in [@css-blocks/core/src/Configuration](https://css-blocks.com/api/interfaces/_css_blocks_core.configuration.html).


| Option | Default | Description |
|:--|:--|:--|
| **rootDir** | `process.cwd()` | The root directory from which all sources are relative. |
| **outputMode** | `"BEM"` | Block file output mode. One of [OutputMode][OUTPUT_MODE] |
| **preprocessors** | `{}` | A preprocessor function can be declared by [Syntax][SYNTAX]. See our [documentation page on preprocessors for more detail](/learn/block-files/preprocessors).  |
| **importer** | [`NodeJsImporter`](./src/importing/NodeJsImporter.ts) | A custom importer to resolve identifiers passed to `@block`. |
| **importerData** | `{}` | Additional data to make available to the importer. |
| **maxConcurrentCompiles** | `4` | Limits block parsing and compilation to this number of threads at any one time. |
| **disablePreprocessChaining** | `false` | If a preprocessor function is declared for `css`, all blocks will be ran through it, even those that were pre-processed for another syntax. This can be disabled by setting `disablePreprocessChaining` to true. |

[SYNTAX]: https://css-blocks.com/api/modules/_css_blocks_core.html#preprocessors
[OUTPUT_MODE]: https://css-blocks.com/api/enums/_css_blocks_core.outputmode.html

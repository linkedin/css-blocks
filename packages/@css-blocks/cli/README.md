# CSS Blocks Command Line Interface

The css-blocks Rewriter and Analyzer for Glimmer templates.

## Installation

```
yarn add @css-blocks/cli
```

or run without installation:

```
npx @css-blocks/cli --validate blocks/*.block.css
```

## Usage

```
css-blocks [options] <block directory/file>...
```

### Options:

| Option | Description |
|--------|-------------|
| `--output-file` | a file to output all compiled css blocks into. Overwrites any existing file. |
| `--output-dir` | Output a css file per block to this directory. |
| `--check` | Check syntax only. Do not output any files. |
| `--preprocessors <preprocessor js>` | A JS file that exports an object that maps extensions to a [preprocessor function][preprocessor_type] for that type. |

[preprocessor_type]: https://github.com/linkedin/css-blocks/blob/2f93f994f7ffc72c14728740e49227f7bd30c98b/packages/%40css-blocks/core/src/BlockParser/preprocessing.ts#L44
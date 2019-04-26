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
css-blocks <cmd> [options] <blocks..>

Commands:
  css-blocks validate <blocks..>  Validate block file syntax.

Options:
  --version        Show version number                                 [boolean]
  --preprocessors  A JS file that exports an object that maps extensions to a
                   preprocessor function for that type.                 [string]
  --help           Show help                                           [boolean]
```

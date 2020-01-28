# CSS Blocks Command Line Interface

A simple interface for working with CSS Blocks.
Not meant to replace a proper build tool integration.

## Installation

```
yarn add @css-blocks/cli
```

or run without installation:

```
npx @css-blocks/cli validate blocks/*.block.css
```

```
npx @css-blocks/cli convert my-bem-file.css
```

## Usage

```
css-blocks <cmd> [options] block-dir-or-file...

Commands:
  css-blocks validate <blocks..>  Validate block file syntax.
  css-blocks convert <files..>    Convert BEM syntax to block file syntax.

Options:
  --version        Show version number                                [boolean]
  --preprocessors  A JS file that exports an object that maps          [string]
                   extensions to a preprocessor function for that type.
  --npm            Allow importing from node_modules                  [boolean]
  --alias          Define an import alias. Requires two arguments:      [array]
                   an alias and a directory.
  --help           Show help                                          [boolean]

```

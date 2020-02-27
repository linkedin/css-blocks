# CSS Blocks Eyeglass Integration
This package provides an easy way to integrate your CSS Blocks code with the Sass module manager [Eyeglass](https://github.com/linkedin/eyeglass).

## Installation

`npm install @css-blocks/eyeglass`

## Usage

Here's an example `css-blocks.config.js` file using this package. 

```js
import sass from "node-sass";
import eyeglass from "eyeglass";
import { adaptor } from "@css-blocks/eyeglass";

const sassOptions = {
  outputStyle: "expanded"
};

const scss = adaptor(sass, eyeglass, sassOptions);

module.exports = {
  preprocessors: { scss }
};
```

An important thing to notice here is that this adapter _does not provide Eyeglass for you_. Instead we use the module instance you pass into the adaptor. This means you're not tied whatever version of Eyeglass (or Sass) this package would include!

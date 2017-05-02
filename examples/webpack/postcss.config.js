var postcss = require("postcss");
var cssBlocks = require("css-blocks").default;

var cssBlocksOpts = {
  interoperableCSS: true
};

module.exports = {
  plugins: [
    cssBlocks(postcss)(cssBlocksOpts)
  ]
}

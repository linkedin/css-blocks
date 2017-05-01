var postcss = require("postcss");
var cssBlocks = require("css-blocks");

var cssBlocksOpts = {
  interoperableCSS: true
};

module.exports = {
  plugins: [
    cssBlocks(postcss)(cssBlocksOpts)
  ]
}

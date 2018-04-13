module.exports = {
  "src": [
    "./packages/@css-blocks/broccoli/src",
    "./packages/@css-blocks/core/src",
    "./packages/@css-blocks/glimmer/src",
    "./packages/@css-blocks/jsx/src",
    "./packages/@css-blocks/runtime/src",
    "./packages/@css-blocks/webpack/src"
  ],
  "out": "docs",
  "mode": "modules",
  "theme": "default",
  "name": "@css-blocks",
  "external-modulemap": ".*packages\/(@css-blocks\/[^\/]+)\/.*"
}
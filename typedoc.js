module.exports = {
  "src": [
    "./packages/@css-blocks/broccoli/src",
    "./packages/@css-blocks/core/src",
    "./packages/@css-blocks/glimmer/src",
    "./packages/@css-blocks/jsx/src",
    "./packages/@css-blocks/runtime/src",
    "./packages/@css-blocks/webpack/src"
  ],
  "out": "packages/@css-blocks/website/public/docs",
  "mode": "modules",
  "theme": "packages/@css-blocks/website/typedoc-theme",
  "name": "@css-blocks",
  "external-modulemap": ".*packages\/(@css-blocks\/[^\/]+)\/.*"
}
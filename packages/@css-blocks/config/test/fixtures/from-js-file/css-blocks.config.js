module.exports = {
  extends: "../from-pkg-json/package.json",
  maxConcurrentCompiles: 8,
  rootDir: "blocks",
  preprocessors: {
    styl: (_fullPath, content, _configuration, _sourceMap) => {return {content}; },
  }
};

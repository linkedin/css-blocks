'use strict';

const GlimmerApp = require('@glimmer/application-pipeline').GlimmerApp;

module.exports = function(defaults) {
  let app = new GlimmerApp(defaults, {
    'css-blocks': {
      entry: "GlimmerTest",
      parserOpts: {},
      analysisOpts: {},
      optimization: {
        rewriteIdents: true,
        mergeDeclarations: true,
        removeUnusedStyles: true,
        conflictResolution: true,
        enabled: process.env.EMBER_ENV !== 'development',
      },
    }
  });
  return app.toTree();
};
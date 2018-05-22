'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

module.exports = function(defaults) {
  let app = new EmberAddon(defaults, {
    'css-blocks': {
      parserOpts: {},
      analysisOpts: {},
      optimization: {
        rewriteIdents: true,
        mergeDeclarations: true,
        removeUnusedStyles: true,
        conflictResolution: true,
        enabled: false //process.env.EMBER_ENV !== 'development',
      },
    }
  });

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  return app.toTree();
};
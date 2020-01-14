'use strict';

const EmberAddon = require('ember-cli/lib/broccoli/ember-addon');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const path = require('path');

module.exports = function(defaults) {

  let app = new EmberAddon(defaults, {
    'css-blocks': {
      parserOpts: {},
      analysisOpts: {},
      optimization: {
        rewriteIdents: true,
        mergeDeclarations: true,
        removeUnusedStyles: true,
      },
    }
  });

  let addonTree = new Funnel(path.resolve(__dirname, './tests/dummy/lib/in-repo-addon'));

  /*
    This build file specifies the options for the dummy test app of this
    addon, located in `/tests/dummy`
    This build file does *not* influence how the addon or the app using it
    behave. You most likely want to be modifying `./index.js` or app's build file
  */

  return new MergeTrees([app.toTree(), addonTree]);
};
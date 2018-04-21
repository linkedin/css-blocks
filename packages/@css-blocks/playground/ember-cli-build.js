'use strict';

const GlimmerApp = require('@glimmer/application-pipeline').GlimmerApp;

module.exports = function(defaults) {

  let app = new GlimmerApp(defaults, {

    'css-blocks': {
      entry: "GlimmerTest",
      output: "src/ui/styles/css-blocks.css"
    }

  });

  return app.toTree();
};

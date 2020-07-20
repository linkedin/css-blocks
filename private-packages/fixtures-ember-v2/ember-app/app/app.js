import Application from '@ember/application';
import Resolver from './resolver';
import loadInitializers from 'ember-load-initializers';
import config from './config/environment';

const dependencies = {
  services: [
    'css-blocks',
  ]
};

const engines = {
  '@cssBlocksFixturesV2/emberEngine': { dependencies },
  '@cssBlocksFixturesV2/emberLazyEngine': { dependencies },
}

const App = Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver,
  engines,
});

loadInitializers(App, config.modulePrefix);

export default App;

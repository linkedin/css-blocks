import initializerFactory from 'ember-cli-app-version/initializer-factory';
import config from '../config/environment';

let name, version;
if (config.APP) {
  name = config.APP.name;
  version = config.APP.version;
}

export default {
  name: 'App Version',
  initialize: initializerFactory(name, version)
};

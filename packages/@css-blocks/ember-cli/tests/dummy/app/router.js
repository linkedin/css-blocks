import EmberRouter from '@ember/routing/router';
import config from './config/environment';

const Router = EmberRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL
});

Router.map(function() {
  this.route('global-styles');
  this.route('route-block');
  this.route('app-component');
  this.route('ember-builtins');
  this.route('addon-component');
});

export default Router;

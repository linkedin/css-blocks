// Mad hax yo: https://github.com/ember-cli/ember-resolver/blob/master/mu-trees/addon/ember-config.js
// Currently, Ember Glimmer configs are *client side only*. Because of this, their
// default config file isn't transpiled before being published, because module bundlers.
// However, we need it server side. This is a copy paste until we figure out a build-time
// method for accessing project configs.
module.exports = function generateConfig(name) {
  return {
    app: {
      name,
      rootName: name
    },
    types: {
      adapter: { definitiveCollection: 'models' },
      application: { definitiveCollection: 'main' },
      controller: { definitiveCollection: 'routes' },
      component: { definitiveCollection: 'components' },
      'component-lookup': { definitiveCollection: 'main' },
      event_dispatcher: { definitiveCollection: 'main' },
      helper: { definitiveCollection: 'components' },
      initializer: { definitiveCollection: 'initializers' },
      'instance-initializers': { definitiveCollection: 'instance-initializer' },
      location: { definitiveCollection: 'main' },
      model: { definitiveCollection: 'models' },
      partial: { definitiveCollection: 'partials' },
      renderer: { definitiveCollection: 'main' },
      route: { definitiveCollection: 'routes' },
      router: { definitiveCollection: 'main' },
      serializer: { definitiveCollection: 'models' },
      service: { definitiveCollection: 'services' },
      template: { definitiveCollection: 'components' },
      'template-compiler': { definitiveCollection: 'main' },
      transform: { definitiveCollection: 'transforms' },
      view: { definitiveCollection: 'views' },
      '-view-registry': { definitiveCollection: 'main' },
      '-bucket-cache': { definitiveCollection: 'main' },
      '-environment': { definitiveCollection: 'main' },
      '-application-instance': { definitiveCollection: 'main' }
    },
    collections: {
      'main': {
        types: ['router', '-bucket-cache', 'component-lookup', '-view-registry', 'event_dispatcher', 'application', 'location', 'renderer', '-environment', '-application-instance']
      },
      components: {
        group: 'ui',
        privateCollections: ['utils'],
        types: ['component', 'helper', 'template']
      },
      initializers: {
        group: 'init',
        defaultType: 'initializer',
        privateCollections: ['utils'],
        types: ['initializer']
      },
      'instance-initializers': {
        group: 'init',
        defaultType: 'instance-initializer',
        privateCollections: ['utils'],
        types: ['instance-initializers']
      },
      models: {
        group: 'data',
        defaultType: 'model',
        privateCollections: ['utils'],
        types: ['model', 'adapter', 'serializer']
      },
      partials: {
        group: 'ui',
        defaultType: 'partial',
        privateCollections: ['utils'],
        types: ['partial']
      },
      routes: {
        group: 'ui',
        defaultType: 'route',
        privateCollections: ['components', 'utils'],
        types: ['route', 'controller', 'template']
      },
      services: {
        defaultType: 'service',
        privateCollections: ['utils'],
        types: ['service']
      },
      utils: {
        unresolvable: true
      },
      views: {
        defaultType: 'view',
        privateCollections: ['utils'],
        types: ['view']
      },
      transforms: {
        group: 'data',
        defaultType: 'transform',
        privateCollections: ['utils'],
        types: ['transform']
      }
    }
  };
}
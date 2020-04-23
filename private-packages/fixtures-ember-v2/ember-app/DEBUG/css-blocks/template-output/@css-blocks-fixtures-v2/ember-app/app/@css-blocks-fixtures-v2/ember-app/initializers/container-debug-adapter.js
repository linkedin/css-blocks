import ContainerDebugAdapter from 'ember-resolver/resolvers/classic/container-debug-adapter';

export default {
  name: 'container-debug-adapter',

  initialize() {
    let app = arguments[1] || arguments[0];

    app.register('container-debug-adapter:main', ContainerDebugAdapter);
    app.inject('container-debug-adapter:main', 'namespace', 'application:main');
  }
};

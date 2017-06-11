import Analyzer from 'glimmer-analyzer';
import path = require('path');
import { expect } from 'chai';
import { fixture } from "./fixtures";

describe('Template dependency analysis', function() {
  it('discovers angle bracket components', function() {
    let analyzer = new Analyzer(fixture('basic-app'));
    let analysis = analyzer.dependenciesForTemplate('my-app');

    expect(analysis).to.deep.equal({
      path: '/basic-app/components/my-app',
      hasComponentHelper: false,
      components: [
        '/basic-app/components/my-app/page-banner',
        '/basic-app/components/text-editor'
      ]
    });
  });

  it('discovers use of the {{component}} helper', function() {
    let analyzer = new Analyzer(fixture('basic-app'));
    let analysis = analyzer.dependenciesForTemplate('with-component-helper');

    expect(analysis).to.deep.equal({
      path: '/basic-app/components/with-component-helper',
      hasComponentHelper: true,
      components: [
        '/basic-app/components/my-app'
      ]
    });
  });
});

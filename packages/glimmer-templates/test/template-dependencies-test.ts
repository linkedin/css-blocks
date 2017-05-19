import Analyzer from '../src';
import path = require('path');
import { expect } from 'chai';

function fixture(fixturePath: string) {
  return path.join(__dirname, 'fixtures', fixturePath);
}

describe('Template dependency analysis', function() {
  it('discovers angle bracket components', function() {
    let analyzer = new Analyzer(fixture('basic-app'));
    let analysis = analyzer.dependenciesForTemplate('my-app');

    expect(analysis).to.deep.equal({
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
      hasComponentHelper: true,
      components: [
        '/basic-app/components/my-app'
      ]
    });
  });
});

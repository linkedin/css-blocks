import BlockAnalyzer from '../src';
import path = require('path');
import { assert } from 'chai';

function fixture(fixturePath: string) {
  return path.join(__dirname, 'fixtures', fixturePath);
}

describe('Stylesheet dependency analysis', function() {
  it('discovers angle bracket components', function() {
    let analyzer = new BlockAnalyzer(fixture('styled-app'));
    let analysis = analyzer.analyze('my-app');

    assert.equal(analysis.template, fixture("styled-app/src/ui/components/my-app/template.hbs"));
    assert.deepEqual(analysis.blocks, {
      "": fixture("styled-app/src/ui/components/my-app/stylesheet.css")
    });
    assert(analysis.stylesFound.has("my-app"));
    assert(analysis.stylesFound.has("[state|is-loading]"));
    assert.deepEqual(analysis.styleCorrelations, [["my-app", "[state|is-loading]"]]);
  });
});

import BlockAnalyzer from '../src';
import path = require('path');
import { assert } from 'chai';

function fixture(fixturePath: string) {
  return path.join(__dirname, 'fixtures', fixturePath);
}

describe('Stylesheet dependency analysis', function() {
  it('analyzes basic root-level styles', function() {
    let analyzer = new BlockAnalyzer(fixture('styled-app'));
    let analysis = analyzer.analyze('my-app').then((richAnalysis) => {
      let analysis = richAnalysis.serialize();
      assert.equal(analysis.template, fixture("styled-app/src/ui/components/my-app/template.hbs"));
      assert.deepEqual(analysis.blocks, {
        "": fixture("styled-app/src/ui/components/my-app/stylesheet.css")
      });
      assert.deepEqual(analysis.stylesFound, [".root", "[state|is-loading]"]);
      assert.deepEqual(analysis.styleCorrelations, [[0, 1]]);
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });
});

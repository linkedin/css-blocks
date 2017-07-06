import { HandlebarsStyleAnalyzer } from '../src';
import path = require('path');
import { assert } from 'chai';
import { fixture } from "./fixtures";

describe('Stylesheet analysis', function() {
  it('analyzes styles from the implicit block', function() {
    let projectDir = fixture('styled-app');
    let analyzer = new HandlebarsStyleAnalyzer(projectDir, 'my-app');
    return analyzer.analyze().then((richAnalysis) => {
      let analysis = richAnalysis.serialize();
      assert.equal(analysis.template.identifier, fixture("styled-app/src/ui/components/my-app/template.hbs"));
      assert.deepEqual(analysis.blocks, {
        "": fixture("styled-app/src/ui/components/my-app/stylesheet.css")
      });
      assert.deepEqual(analysis.stylesFound, [".editor", ".editor[state|disabled]" ,".root", "[state|is-loading]"]);
      assert.deepEqual(analysis.styleCorrelations, [[2, 3], [0, 1]]);
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });

  it('analyzes styles from a referenced block', function() {
    let projectDir = fixture('styled-app');
    let analyzer = new HandlebarsStyleAnalyzer(projectDir, 'with-multiple-blocks');
    return analyzer.analyze().then((richAnalysis) => {
      let analysis = richAnalysis.serialize();
      assert.equal(analysis.template.identifier, fixture("styled-app/src/ui/components/with-multiple-blocks/template.hbs"));
      assert.deepEqual(analysis.blocks, {
        "": fixture("styled-app/src/ui/components/with-multiple-blocks/stylesheet.css"),
        "h": fixture("styled-app/src/ui/components/with-multiple-blocks/header.css")
      });
      assert.deepEqual(analysis.stylesFound, [".root", ".world", ".world[state|thick]", "h.emphasis", "h.emphasis[state|extra]", "h.root"]);
      assert.deepEqual(analysis.styleCorrelations, [[1, 2, 3, 4]]);
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });
});

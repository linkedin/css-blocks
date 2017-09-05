import * as postcss from "postcss";
import { HandlebarsStyleAnalyzer, ResolvedFile } from '../src';
import {
  TemplateAnalysis,
  BlockFactory
} from "css-blocks";
import path = require('path');
import { assert } from 'chai';
import { fixture } from "./fixtures";

describe('Stylesheet analysis', function() {
  it('analyzes styles from the implicit block', function() {
    let projectDir = fixture('styled-app');
    let analyzer = new HandlebarsStyleAnalyzer(projectDir, 'my-app');
    return analyzer.analyze().then((richAnalysis) => {
      let analysis: TemplateAnalysis<ResolvedFile> = richAnalysis;
      let serializedAnalysis = analysis.serialize();
      assert.equal(analysis.template.identifier, "template:/styled-app/components/my-app");
      assert.deepEqual(serializedAnalysis.blocks, {
        "": "glimmer:stylesheet:/styled-app/components/my-app" // I think the identifier shouldn't be the resolved value from glimmer.
      });
      assert.deepEqual(serializedAnalysis.stylesFound, [".editor", ".editor[state|disabled]" ,".root", "[state|is-loading]"]);
      assert.deepEqual(serializedAnalysis.elements, {
        el_a: { static: [ 2, 3 ], dynamic: [], correlations: [], loc: {} },
        /* el_b has no styles, so isn't added to analysis */
        el_c: { static: [ 0, 1 ], dynamic: [], correlations: [], loc: {} }
      });

      // deserialize and re-serialize to make sure it creates the same representation.
      let factory = new BlockFactory(analyzer.project.cssBlocksOpts, postcss);
      return TemplateAnalysis.deserialize<ResolvedFile>(serializedAnalysis, factory).then(recreatedAnalysis => {
        let reserializedAnalysis = recreatedAnalysis.serialize();
        assert.deepEqual(reserializedAnalysis, serializedAnalysis);
      });
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
      assert.equal(analysis.template.identifier, "template:/styled-app/components/with-multiple-blocks");
      assert.deepEqual(analysis.blocks, {
        "": "glimmer:stylesheet:/styled-app/components/with-multiple-blocks",
        "h": fixture("styled-app/src/ui/components/with-multiple-blocks/header.css")
      });
      assert.deepEqual(analysis.stylesFound, [".root", ".world", ".world[state|thick]", "h.emphasis", "h.emphasis[state|extra]", "h.root"]);
      assert.deepEqual(analysis.elements, {
        el_a: { static: [ 0 ], dynamic: [], correlations: [], loc: {} },
        el_b: { static: [ 5 ], dynamic: [], correlations: [], loc: {} },
        el_c: { static: [ 1, 2, 3, 4 ], dynamic: [], correlations: [], loc: {} }
      });
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });

  it('analyzes styles from a referenced block with dynamic state', function() {
    let projectDir = fixture('styled-app');
    let analyzer = new HandlebarsStyleAnalyzer(projectDir, 'with-dynamic-states');
    return analyzer.analyze().then((richAnalysis) => {
      let analysis = richAnalysis.serialize();
      assert.equal(analysis.template.identifier, "template:/styled-app/components/with-dynamic-states");
      assert.deepEqual(analysis.blocks, {
        "": "glimmer:stylesheet:/styled-app/components/with-dynamic-states",
        "h": fixture("styled-app/src/ui/components/with-dynamic-states/header.css")
      });
      assert.deepEqual(analysis.stylesFound, [
        '.root',
         '.world',
         '.world[state|thick]',
         'h.emphasis',
         'h.emphasis[state|style=bold]',
         'h.emphasis[state|style=italic]',
         'h.root'
      ]);
      assert.deepEqual(analysis.elements, {
        el_a: { static: [ 0 ], dynamic: [], correlations: [], loc: {} },
        el_b: { static: [ 6 ], dynamic: [], correlations: [], loc: {} },
        el_c: { static: [ 1, 3 ], dynamic: [], correlations: [ [ -1, 4, 5 ], [ -1, 2 ] ], loc: {} }
      });
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });

  it('analyzes styles from a referenced block with dynamic classes', function() {
    let projectDir = fixture('styled-app');
    let analyzer = new HandlebarsStyleAnalyzer(projectDir, 'with-dynamic-classes');
    return analyzer.analyze().then((richAnalysis) => {
      let analysis = richAnalysis.serialize();
      assert.equal(analysis.template.identifier, "template:/styled-app/components/with-dynamic-classes");
      assert.deepEqual(analysis.blocks, {
        "": "glimmer:stylesheet:/styled-app/components/with-dynamic-classes",
        "h": fixture("styled-app/src/ui/components/with-dynamic-classes/header.css"),
        "t": fixture("styled-app/src/ui/components/with-dynamic-classes/typography.css")
      });
      assert.deepEqual(analysis.stylesFound, [
        '.root',
         '.world',
         '.world[state|thick]',
         'h.emphasis',
         'h.emphasis[state|style=bold]',
         'h.emphasis[state|style=italic]',
         'h.root',
         't.underline'
      ]);
      assert.deepEqual(analysis.elements, { el_a: { static: [ 0 ], dynamic: [], correlations: [], loc: {} },
        el_b: { static: [ 6 ], dynamic: [], correlations: [], loc: {} },
        el_c: { static: [ 3, 7 ], dynamic: [ 1 ], correlations: [ [ -1, 4, 5 ], [ -1, 2 ] ], loc: {} },
        el_d: { static: [], dynamic: [], correlations: [ [ 1, 3 ] ], loc: {} },
        el_e: { static: [], dynamic: [], correlations: [ [ 1, 3 ] ], loc: {} },
        el_f: { static: [], dynamic: [ 1 ], correlations: [], loc: {} }
      });
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });

});

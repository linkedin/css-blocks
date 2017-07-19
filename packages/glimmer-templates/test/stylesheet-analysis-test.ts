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
      assert.deepEqual(serializedAnalysis.styleCorrelations, [[2, 3], [0, 1]]);

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
      assert.deepEqual(analysis.styleCorrelations, [[1, 2, 3, 4]]);
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });
});

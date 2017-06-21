import { HandlebarsStyleAnalyzer, Rewriter, rewriteAdapter } from '../src';
import path = require('path');
import fs = require('fs');
import { assert } from 'chai';
import { fixture } from "./fixtures";
import { PreprocessOptions, ASTPlugin } from "@glimmer/syntax";
import { precompile, PrecompileOptions } from "@glimmer/compiler";
import { StyleMapping, PluginOptionsReader } from "css-blocks";

describe('Template Rewriting', function() {
  it('analyzes styles from the implicit block', function() {
    let projectDir = fixture('styled-app');
    let analyzer = new HandlebarsStyleAnalyzer(projectDir, 'my-app');
    return analyzer.analyze().then((richAnalysis) => {
      let cssBlocksOpts = new PluginOptionsReader();
      let options = {
        meta: {},
        plugins: {
          ast: [rewriteAdapter(StyleMapping.fromAnalysis(richAnalysis, cssBlocksOpts))]
        }
      };
      let templateContent = fs.readFileSync(fixture('styled-app/src/ui/components/my-app/template.hbs'));
      let result = JSON.parse(precompile(templateContent.toString(), options));
      let classes: string[] = [];
      JSON.parse(result.block).statements.forEach(statement => {
        if (statement[0] === 9 && statement[1] === "class") {
          classes.push(statement[2]);
        }
      });
      assert.deepEqual(classes, ['my-app my-app--is-loading']);
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });
});

import { HandlebarsStyleAnalyzer, Rewriter, loaderAdapter, Project } from '../src';
import path = require('path');
import fs = require('fs');
import { assert } from 'chai';
import { fixture } from "./fixtures";
import { PreprocessOptions, ASTPlugin } from "@glimmer/syntax";
import { precompile, PrecompileOptions } from "@glimmer/compiler";
import { StyleMapping, PluginOptionsReader, Block, MetaStyleMapping } from "css-blocks";

describe('Template Rewriting', function() {
  it('analyzes styles from the implicit block', function() {
    let projectDir = fixture('styled-app');
    let project = new Project(projectDir);
    let cssBlocksOpts = new PluginOptionsReader(project.cssBlocksOpts);
    let analyzer = new HandlebarsStyleAnalyzer(project, 'my-app');
    let templatePath = fixture('styled-app/src/ui/components/my-app/template.hbs');
    return analyzer.analyze().then((richAnalysis) => {
      let metaMapping = new MetaStyleMapping();
      metaMapping.templates.set(templatePath, StyleMapping.fromAnalysis(richAnalysis, cssBlocksOpts));
      let fakeLoaderContext = {
        resourcePath: templatePath,
        cssBlocks: {
          mappings: {
            'css-blocks.css': metaMapping
          },
          compilationOptions: cssBlocksOpts
        },
        dependency(_path) {
        }
      };
      return loaderAdapter(fakeLoaderContext).then(plugin => {
        let options = {
          meta: {},
          plugins: {
            ast: [plugin]
          }
        };
        let templateContent = fs.readFileSync(templatePath);
        let result = JSON.parse(precompile(templateContent.toString(), options));
        let classes: string[] = [];
        JSON.parse(result.block).statements.forEach(statement => {
          if (statement[0] === 9 && statement[1] === "class") {
            classes.push(statement[2]);
          }
        });
        assert.deepEqual(classes, ['my-app my-app--is-loading']);
      });
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });
});

import { HandlebarsStyleAnalyzer, Rewriter, loaderAdapter, Project } from '../src';
import path = require('path');
import fs = require('fs');
import { assert } from 'chai';
import { fixture } from "./fixtures";
import { PreprocessOptions, ASTPlugin } from "@glimmer/syntax";
import { precompile, PrecompileOptions } from "@glimmer/compiler";
import { StyleMapping, PluginOptionsReader, Block, MetaStyleMapping } from "css-blocks";

describe('Template Rewriting', function() {

  it('rewrites styles from dynamic attributes', function() {
    let projectDir = fixture('styled-app');
    let project = new Project(projectDir);
    let cssBlocksOpts = new PluginOptionsReader(project.cssBlocksOpts);
    let analyzer = new HandlebarsStyleAnalyzer(project, 'with-dynamic-states');
    let templatePath = fixture('styled-app/src/ui/components/with-dynamic-states/template.hbs');
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
        let classes: any = {};

        JSON.parse(result.block).statements.forEach((statement, i) => {
          if ((statement[0] === 10) && statement[1] === "class") {
            classes[i] = statement[2][1];
          }
        });
        assert.deepEqual(classes, {
          1: ['with-dynamic-states'],
          5: ['header'],
          9: [
              "with-dynamic-states__world header__emphasis",
              [
                25, "/css-blocks/components/block",
                [
                  [ 19, 0, [ "isThick" ] ],
                  " with-dynamic-states__world--thick"
                ],
                null
              ],
              [
                25, "/css-blocks/components/block",
                [
                  [
                    19, 0, [ "textStyle" ]
                  ],
                  "bold",
                  " header__emphasis--style-bold"
                ],
                null
              ],
              [
                25, "/css-blocks/components/block",
                [
                  [ 19, 0, [ "textStyle" ] ],
                  "italic",
                  " header__emphasis--style-italic"
                ],
                null
              ]
            ]
        });
      });
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });

});

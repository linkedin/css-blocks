import { HandlebarsStyleAnalyzer, Rewriter, loaderAdapter, Project } from '../src';
import path = require('path');
import fs = require('fs');
import { assert } from 'chai';
import { fixture } from "./fixtures";
import { PreprocessOptions, ASTPlugin, print, preprocess } from "@glimmer/syntax";
import { precompile, PrecompileOptions } from "@glimmer/compiler";
import { PluginOptionsReader, Block, StyleMapping} from "css-blocks";

// Reduce whitespace.
function minify(s) {
  return s.replace(/^[\s\n]+|[\s\n]+$/gm, '');
}

describe('Template Rewriting', function() {
/*
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

        let res = print(preprocess(fs.readFileSync(templatePath).toString(), options));
        assert.deepEqual(minify(res), minify(`
          <div class="with-dynamic-states">
            <h1 class=" header">Hello, <span class=" with-dynamic-states__world header__emphasis{{/css-blocks/components/state isThick " with-dynamic-states__world--thick"}}{{/css-blocks/components/state textStyle "bold" " header__emphasis--style-bold"}}{{/css-blocks/components/state textStyle "italic" " header__emphasis--style-italic"}}">World</span>!</h1>
          </div>`));
      });
    }).catch((error) => {
      throw error;
    });
  });

  it('rewrites styles from dynamic classes', function() {
    let projectDir = fixture('styled-app');
    let project = new Project(projectDir);
    let cssBlocksOpts = new PluginOptionsReader(project.cssBlocksOpts);
    let analyzer = new HandlebarsStyleAnalyzer(project, 'with-dynamic-classes');
    let templatePath = fixture('styled-app/src/ui/components/with-dynamic-classes/template.hbs');
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

        let res = print(preprocess(fs.readFileSync(templatePath).toString(), options));

        assert.deepEqual(minify(res), minify(`
          <div class="with-dynamic-classes">
            <h1 class=" header">Hello, <span class="{{/css-blocks/components/style-if isWorld true " with-dynamic-classes__world" undefined}} header__emphasis typography__underline{{/css-blocks/components/state isThick " with-dynamic-classes__world--thick"}}{{/css-blocks/components/state textStyle "bold" " header__emphasis--style-bold"}}{{/css-blocks/components/state textStyle "italic" " header__emphasis--style-italic"}}">World</span>!</h1>
            <div class="{{/css-blocks/components/style-if isWorld true " with-dynamic-classes__world" " header__emphasis"}}">World</div>
            <div class="{{/css-blocks/components/style-if isWorld false " with-dynamic-classes__world" " header__emphasis"}}">World</div>
            <div class="{{/css-blocks/components/style-if isWorld false " with-dynamic-classes__world" undefined}}">World</div>
          </div>
        `));
      });
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });
  */

});

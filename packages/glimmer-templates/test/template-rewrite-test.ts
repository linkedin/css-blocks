import { HandlebarsStyleAnalyzer, Rewriter, loaderAdapter, Project } from '../src';
import path = require('path');
import * as postcss from "postcss";
import fs = require('fs');
import { assert } from 'chai';
import { fixture } from "./fixtures";
import { PreprocessOptions, ASTPlugin, print, preprocess } from "@glimmer/syntax";
import { precompile, PrecompileOptions } from "@glimmer/compiler";
import { PluginOptionsReader, Block, StyleMapping, BlockCompiler } from "css-blocks";
import { Optimizer } from "opticss";

// Reduce whitespace.
function minify(s) {
  return s.replace(/(^[\s\n]+|[\s\n]+$)/gm, ' ').replace(/[\s\n][\s\n]+/gm, ' ').replace(/\n/gm, ' ').trim();
}

function analyzeAndCompile(analyzer: HandlebarsStyleAnalyzer) {
  let reader = analyzer.project.cssBlocksOpts;
  return analyzer.analyze().then(analysis => {
    let blocks = analysis.transitiveBlockDependencies();
    let optimizerAnalysis = analysis.forOptimizer(reader);
    let optimizer = new Optimizer({}, { rewriteIdents: { id: false, class: true} });
    let compiler = new BlockCompiler(postcss, reader);

    optimizer.addAnalysis(optimizerAnalysis);
    for (let block of blocks) {
      let compiled = compiler.compile(block, block.root!, analysis);
      optimizer.addSource({
        content: compiled.toResult({to: reader.importer.filesystemPath(block.identifier, reader)!})
      });

    }
    return optimizer.optimize("result.css").then((optimized) => {
      let styleMapping = new StyleMapping(optimized.styleMapping, blocks, reader, [analysis]);
      let css = optimized.output.content;
      return { css, styleMapping };
    });
  });
}

function pretendToBeWebPack(result, templatePath, cssBlocksOpts) {
  let fakeLoaderContext = {
    resourcePath: templatePath,
    cssBlocks: {
      mappings: {
        'css-blocks.css': result.styleMapping
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
    return preprocess(fs.readFileSync(templatePath).toString(), options);
  });
}

function pipeline(analyzer: HandlebarsStyleAnalyzer, templatePath: string) {
  return analyzeAndCompile(analyzer).then(result => {
    return pretendToBeWebPack(result, templatePath, analyzer.project.cssBlocksOpts).then(ast => {
      return { css: result.css, ast };
    });
  });
}

describe('Template Rewriting', function() {

  it('rewrites styles from dynamic attributes', function() {
    let projectDir = fixture('styled-app');
    let project = new Project(projectDir);
    let analyzer = new HandlebarsStyleAnalyzer(project, 'with-dynamic-states');
    let templatePath = fixture('styled-app/src/ui/components/with-dynamic-states/template.hbs');
    return pipeline(analyzer, templatePath).then((result) => {
      let { css, ast } = result;
      let res = print(ast);
      // TODO why is `f` class both static and dynamic?
      assert.deepEqual(minify(res), minify(`
          <div class="b">
            <h1 class="e">Hello, <span class="f c {{/css-blocks/components/classnames 2 3 2 (isThick) 1 2 4 2 1 (textStyle) "bold" 1 0 "italic" 1 1 "g" 0 "f" 1 "d" 2}}">World</span>!</h1>
          </div>`));
      assert.deepEqual(minify(result.css), minify(`
          .b { color: red; }
          .c { border: 1px solid black; }
          .d { border-width: 3px; }
          .e { font-size: 18px; }
          .f { font-style: italic; }
          .g { font-weight: bold; }
        `)
      );
    });
  });

  it('rewrites styles from dynamic classes', function() {
    let projectDir = fixture('styled-app');
    let project = new Project(projectDir);
    let analyzer = new HandlebarsStyleAnalyzer(project, 'with-dynamic-classes');
    let templatePath = fixture('styled-app/src/ui/components/with-dynamic-classes/template.hbs');
    return pipeline(analyzer, templatePath).then((result) => {
      let { css, ast } = result;
      let res = print(ast);
      // TODO: why is `e` both static and dynamic
      assert.deepEqual(minify(res), minify(`
        <div class="b">
          <h1 class="d">Hello, <span class="e g {{/css-blocks/components/classnames 3 4 0 isWorld 1 2 0 3 1 2 (isThick) 1 3 4 2 1 (textStyle) "bold" 1 0 "italic" 1 1 "f" 0 "e" 1 "c" 2 "with-dynamic-classes__world--thick" 3}}">World</span>!</h1>
          <div class={{/css-blocks/components/classnames 1 2 0 isWorld 1 1 1 0 "e" 0 "c" 1}}>World</div>
          <div class={{/css-blocks/components/classnames 1 2 0 isWorld 1 0 1 1 "e" 0 "c" 1}}>World</div>
          <div class={{/css-blocks/components/classnames 1 1 0 isWorld 0 1 0 "c" 0}}>World</div>
        </div>
      `));
    });
  });

  it('rewrites styles from dynamic attributes from readme', function() {
    let projectDir = fixture('readme-app');
    let project = new Project(projectDir);
    let analyzer = new HandlebarsStyleAnalyzer(project, 'page-layout');
    let templatePath = fixture('readme-app/src/ui/components/page-layout/template.hbs');
    return pipeline(analyzer, templatePath).then((result) => {
      let { css, ast } = result;
      let res = print(ast);
      assert.deepEqual(minify(res), minify(`
      <div class="a {{/css-blocks/components/classnames 1 1 2 (isLoading) 1 0 "b" 0}}">
        <aside class="g h c d"> </aside>
        <article class="i {{/css-blocks/components/classnames 1 2 0 isRecommended 1 1 1 0 "e" 0 "f" 1}}"> </article>
      </div>
          `));
      assert.deepEqual(minify(result.css), minify(`
      .a { color: red; width: 100vw; }
      .b { color: blue }
      .c { float: left; }
      .d { display: none; }
      .e { border-right: 2px groove gray; }
      .f { background-color: orange }
      .g { width: 20%; }
      .h { width: calc(20% - 20px); margin-right: 20px; }
      .i { width: 80%; }
        `)
      );
    });
  });
});

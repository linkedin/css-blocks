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

  it.only('rewrites styles from dynamic attributes', function() {
    let projectDir = fixture('styled-app');
    let project = new Project(projectDir);
    let analyzer = new HandlebarsStyleAnalyzer(project, 'with-dynamic-states');
    let templatePath = fixture('styled-app/src/ui/components/with-dynamic-states/template.hbs');
    return pipeline(analyzer, templatePath).then((result) => {
      let { css, ast } = result;
      let res = print(ast);
      assert.deepEqual(minify(res), minify(`
          <div class={{/css-blocks/components/classnames 0 1 "b" 0}}>
            <h1 class={{/css-blocks/components/classnames 0 1 "e" 0}}>Hello, <span class={{/css-blocks/components/classnames 2 4 2 (isThick) 1 4 4 2 1 (textStyle) "bold" 1 1 "italic" 1 2 "f" -2 2 0 2 "g" 1 "c" 3 "d" 4}}>World</span>!</h1>
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

  it.only('rewrites styles from dynamic classes', function() {
    let projectDir = fixture('styled-app');
    let project = new Project(projectDir);
    let analyzer = new HandlebarsStyleAnalyzer(project, 'with-dynamic-classes');
    let templatePath = fixture('styled-app/src/ui/components/with-dynamic-classes/template.hbs');
    return pipeline(analyzer, templatePath).then((result) => {
      let { css, ast } = result;
      let res = print(ast);
      assert.deepEqual(minify(res), minify(`
        <div class={{/css-blocks/components/classnames 0 1 "b" 0}}>
          <h1 class={{/css-blocks/components/classnames 0 1 "d" 0}}>Hello, <span class={{/css-blocks/components/classnames 3 5 0 isWorld 1 4 0 3 1 4 (isThick) 1 5 4 2 1 (textStyle) "bold" 1 1 "italic" 1 2 "e" -2 2 0 2 "f" 1 "g" 3 "c" 4 "with-dynamic-classes__world--thick" 5}}>World</span>!</h1>
          <div class={{/css-blocks/components/classnames 1 2 0 isWorld 1 1 1 0 "e" 0 "c" 1}}>World</div>
          <div class={{/css-blocks/components/classnames 1 2 0 isWorld 1 0 1 1 "e" 0 "c" 1}}>World</div>
          <div class={{/css-blocks/components/classnames 1 1 0 isWorld 0 1 0 "c" 0}}>World</div>
        </div>
      `));
    });
  });
});

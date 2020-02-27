import { BlockCompiler, BlockFactory, CssBlockError, StyleMapping } from "@css-blocks/core";
import { ASTPluginEnvironment, preprocess, print } from "@glimmer/syntax";
import { assert } from "chai";
import fs = require("fs");
import { Optimizer } from "opticss";
import { postcss } from "opticss";

import { GlimmerAnalyzer, GlimmerRewriter, TEMPLATE_TYPE } from "../src";

import { fixture, moduleConfig } from "./fixtures";

// Reduce whitespace.
function minify(s: string) {
  return s.replace(/(^[\s\n]+|[\s\n]+$)/gm, " ").replace(/[\s\n][\s\n]+/gm, " ").replace(/\n/gm, " ").trim();
}

interface CSSAndMapping {
  css: postcss.Result | string;
  styleMapping: StyleMapping<TEMPLATE_TYPE>;
}

async function optimize(analyzer: GlimmerAnalyzer): Promise<CSSAndMapping> {
  let blockOpts = analyzer.cssBlocksOptions;
  let blocks = analyzer.transitiveBlockDependencies();
  let optimizerAnalysis = analyzer.getAnalysis(0).forOptimizer(blockOpts);
  let optimizer = new Optimizer({}, { rewriteIdents: { id: false, class: true} });
  let compiler = new BlockCompiler(postcss, blockOpts);

  optimizer.addAnalysis(optimizerAnalysis);
  for (let block of blocks) {
    let compiled = compiler.compile(block, block.stylesheet!, analyzer);
    optimizer.addSource({
      content: compiled.toResult({to: blockOpts.importer.filesystemPath(block.identifier, blockOpts)!}),
    });
  }
  let optimized = await optimizer.optimize("result.css");
  let styleMapping = new StyleMapping<TEMPLATE_TYPE>(optimized.styleMapping, blocks, blockOpts, analyzer.analyses());
  let css = optimized.output.content;
  return { css, styleMapping };
}

function rewrite(result: CSSAndMapping, analyzer: GlimmerAnalyzer, templatePath: string) {
  let plugin = (env: ASTPluginEnvironment) => new GlimmerRewriter(env.syntax, result.styleMapping, analyzer.getAnalysis(0), {});
  let options = {
    meta: {},
    plugins: {
      ast: [plugin],
    },
  };
  return preprocess(fs.readFileSync(templatePath).toString(), options);
}

async function pipeline(projectDir: string, analyzer: GlimmerAnalyzer, entry: string, templatePath: string) {
  await analyzer.analyze(projectDir, [entry]);
  let result = await optimize(analyzer);
  let ast = rewrite(result, analyzer, templatePath);
  return { css: result.css, ast, styleMapping: result.styleMapping };
}

describe("Template Rewriting", function() {

  it("rewrites styles from dynamic attributes", async function() {
    let projectDir = fixture("styled-app");
    let analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, moduleConfig);
    let templatePath = fixture("styled-app/src/ui/components/with-dynamic-states/template.hbs");
    let result = await pipeline(projectDir, analyzer, "with-dynamic-states", templatePath);

    // TODO why is `f` class both static and dynamic?
    assert.deepEqual(minify(print(result.ast)), minify(`
    <div class="b">
      <h1 class="e">Hello, <span class="c f {{-css-blocks-classnames 2 3 2 isThick 1 2 4 2 1 textStyle "bold" 1 0 "italic" 1 1 "g" 0 "f" 1 "d" 2}}">World</span>!</h1>
    </div>
    `));
    assert.deepEqual(minify(result.css.toString()), minify(`
      .b { color: red; }
      .c { border: 1px solid black; }
      .d { border-width: 3px; }
      .e { font-size: 18px; }
      .f { font-style: italic; }
      .g { font-weight: bold; }
    `),
    );
  });

  it("rewrites styles from dynamic classes", async function() {
    let projectDir = fixture("styled-app");
    let analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, moduleConfig);
    let templatePath = fixture("styled-app/src/ui/components/with-dynamic-classes/template.hbs");
    let result = await pipeline(projectDir, analyzer, "with-dynamic-classes", templatePath);
    assert.deepEqual(minify(print(result.ast)), minify(`
      <div class="a">
        <h1 class="e">Hello, <span class="f i {{-css-blocks-classnames 3 4 0 isWorld 1 2 0 3 1 2 (eq isThick 1) 1 3 4 2 1 textStyle "bold" 1 0 "italic" 1 1 "g" 0 "h" 1 "b" 2 "c" 3}}">World</span>!</h1>
        <div class={{-css-blocks-classnames 1 2 0 isWorld 1 1 1 0 "d" 0 "b" 1}}>World</div>
        <div class={{-css-blocks-classnames 1 2 0 isWorld 1 0 1 1 "d" 0 "b" 1}}>World</div>
        <div class={{-css-blocks-classnames 1 1 0 isWorld 0 1 0 "b" 0}}>World</div>
        <h2 class={{-css-blocks-classnames 1 1 0 isWorld 1 0 0 "e" 0}}>Dynamic Scope</h2>
      </div>
    `));
  });

  it("rewrites styles with the style-of helper", async function() {
    let projectDir = fixture("styled-app");
    let analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, moduleConfig);
    let templatePath = fixture("styled-app/src/ui/components/with-style-helper/template.hbs");
    let result = await pipeline(projectDir, analyzer, "with-style-helper", templatePath);
    assert.deepEqual(minify(print(result.ast)), minify(`
      <div class="b">
        <h1 class="e">Hello, <World cssClass={{-css-blocks-concat (-css-blocks-concat "c d f" " " (-css-blocks-classnames 1 2 4 2 1 (textStyle) "bold" 1 0 "italic" 1 1 "g" 0 "f" 1))}} />!</h1>
      </div>
    `));
  });

  it("rewrites styles with the style-of subexpressions", async function() {
    let projectDir = fixture("styled-app");
    let analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, moduleConfig);
    let templatePath = fixture("styled-app/src/ui/components/with-style-of-subexpression/template.hbs");
    let result = await pipeline(projectDir, analyzer, "with-style-of-subexpression", templatePath);
    assert.deepEqual(minify(print(result.ast)), minify(`
      <div class="b">
        <h1 class="e">Hello,
          {{yield (hash
            classnames=(hash
              action=(-css-blocks-concat (-css-blocks-concat "c f" " " (-css-blocks-classnames 2 3 2 isThick 1 2 4 2 1 (textStyle) "bold" 1 0 "italic" 1 1 "g" 0 "f" 1 "d" 2)))))}}
        </h1>
      </div>
    `));
  });

  it("supports positional styles with style-of helper", async function() {
    const projectDir = fixture("styled-app");
    const analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, moduleConfig);
    const templatePositionalPath = fixture("styled-app/src/ui/components/with-style-helper/template.hbs");
    const templateHashPath = fixture("styled-app/src/ui/components/with-style-helper/templateHash.hbs");
    // now we run the optimizer and rewriter against each temlpate
    const resultPositional = await pipeline(projectDir, analyzer, "with-style-helper", templatePositionalPath);
    analyzer.reset(); // need to reset the analyser otherwise it will change/advance class names.
    const resultHash = await pipeline(projectDir, analyzer, "with-style-helper", templateHashPath);

    assert.deepEqual(minify(print(resultPositional.ast)), minify(print(resultHash.ast)));
  });

  it("errors if positional argument is a block:class.", async function() {
    // assert.expect(2);
    const projectDir = fixture("styled-app");
    const analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, moduleConfig);
    const template = fixture("styled-app/src/ui/components/with-style-helper/templateInvalid.hbs");
    const expectedMessage = '[css-blocks] Error: The block:class attribute must contain a value and is not allowed to be purely positional. Did you mean block:class="foo"? (template:/styled-app/components/with-style-helper:2:37)';
    let didError = false;
    try {
      await pipeline(projectDir, analyzer, "with-style-helper", template);
    } catch (err) {
      // have to do this in catches to get type-checking...
      const typed: CssBlockError = err;
      didError = true;
      assert.ok(err instanceof CssBlockError);
      assert.equal(typed.message, expectedMessage);
    }
    assert.ok(didError);
  });

  it("rewrites styles with block aliases", async function() {
    let projectDir = fixture("styled-app");
    let analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, moduleConfig);
    let templatePath = fixture("styled-app/src/ui/components/with-block-aliases/template.hbs");
    let result = await pipeline(projectDir, analyzer, "with-block-aliases", templatePath);
    assert.deepEqual(minify(print(result.ast)), minify(`
    <div class="b my-scope-alias stylesheet__world">
      <h1 class="e my-header-alias">Hello, <span class="c f stylesheet__world stylesheet__world--thick {{-css-blocks-classnames 2 4 2 isThick 1 3 4 2 1 textStyle "bold" 1 0 "italic" 1 1 "g" 0 "f" 1 "my-alias-for-state" 2 "d" 3}}">World</span>!</h1>
    </div>
    `));
  });

  it("rewrites styles from dynamic attributes from readme", async function() {
    let projectDir = fixture("readme-app");
    let analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, moduleConfig);
    let templatePath = fixture("readme-app/src/ui/components/page-layout/template.hbs");
    let result = await pipeline(projectDir, analyzer, "page-layout", templatePath);
    assert.deepEqual(minify(result.css.toString()), minify(`
      .a { color: red; width: 100vw; }
      .b { color: blue }
      .c { float: left; }
      .d { display: none; }
      .e { border-right: 2px groove gray; }
      .f { background-color: orange }
      .g { width: 20%; }
      .h { width: calc(20% - 20px); margin-right: 20px; }
      .i { width: 80%; }
    `),
    );
    assert.deepEqual(minify(print(result.ast)), minify(`
      <div class="a {{-css-blocks-classnames 1 1 2 isLoading 1 0 "b" 0}}">
        <aside class="c d g h"> </aside>
        <article class="i {{-css-blocks-classnames 1 2 0 isRecommended 1 1 1 0 "e" 0 "f" 1}}"> </article>
      </div>
    `));
  });

  it("rewrites link-to helpers", async function() {
    let projectDir = fixture("styled-app");
    let analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, moduleConfig);
    let templatePath = fixture("styled-app/src/ui/components/with-link-to/template.hbs");
    let result = await pipeline(projectDir, analyzer, "with-link-to", templatePath);

    // TODO why is `f` class both static and dynamic?
    assert.deepEqual(minify(print(result.ast)), minify(`
    <div class="a i">
      {{link-to "Inline Form" "inline-form" class="b j"}}
      {{#link-to "block-form" class="b j m"}}Block Form{{/link-to}}

      {{link-to "Inline Form" "inline-form-active" class="c" activeClass="d"}}
      {{#link-to "block-form-active" class="c" activeClass="d"}}Block Form{{/link-to}}

      {{link-to "Dynamic Inline Form" "inline-form-active" class=(-css-blocks-classnames 1 1 0 foo 1 0 0 "c" 0) activeClass="d"}}
      {{#link-to "block-form-active" class=(-css-blocks-classnames 1 1 0 foo 1 0 0 "c" 0) activeClass="d"}}Dynamic Block Form{{/link-to}}

      {{link-to "Inline Form, Inherited State" "inline-form-active" class="k" activeClass="l"}}
      {{#link-to "block-form-active" class="k" activeClass="l"}}Block Form, Inherited State{{/link-to}}

      {{link-to "Inline Form, External State" "inline-form-active" class="k" activeClass="l"}}
      {{#link-to "block-form-active" class="k" activeClass="l"}}Block Form, External State{{/link-to}}

      {{link-to "Inline Form, All States" "inline-form-active" class="e" activeClass="f" loadingClass="g" disabledClass="h"}}
      {{#link-to "block-form-active" class="e" activeClass="f" loadingClass="g" disabledClass="h"}}Block Form, All States{{/link-to}}
    </div>
    `));

    assert.deepEqual(minify(result.css.toString()), minify(`
      .a { color: red; }
      .b { color: yellow; }
      .c { color: green; }
      .d { color: blue; }
      .e { color: gray; }
      .f { color: green; }
      .g { color: yellow; }
      .h { color: red; }
      .i { background: #ccc; }
      .j { background: blue; }
      .k { color: pink; }
      .l { color: purple }
      .m { border: 1px solid blue; }
    `),
    );
  });
});

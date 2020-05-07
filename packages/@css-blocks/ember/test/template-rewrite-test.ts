import { BlockFactory, Options } from "@css-blocks/core";
import { ASTPluginEnvironment, Syntax, Walker, builders, preprocess as parse, print, traverse } from "@glimmer/syntax";
import { TempDir, createTempDir } from "broccoli-test-helper";
import { assert } from "chai";
import * as fs from "fs";
import * as path from "path";

import { EmberAnalysis } from "../src/EmberAnalysis";
import { HandlebarsTemplate, TEMPLATE_NAME } from "../src/HandlebarsTemplate";
import { TemplateAnalyzingRewriter } from "../src/TemplateAnalyzingRewriter";

const syntax: Syntax = { parse, print, traverse, builders, Walker };

// Reduce whitespace.
function minify(s: string) {
  return s.replace(/(^[\s\n]+|[\s\n]+$)/gm, " ").replace(/[\s\n][\s\n]+/gm, " ").replace(/\n/gm, " ").trim();
}

async function analyzeAndRewrite(blockFactory: BlockFactory, rootDir: string, templatePath: string, blockPath: string) {
  let config = blockFactory.configuration;
  let template = new HandlebarsTemplate(path.join(rootDir, templatePath), templatePath);
  let block = await blockFactory.getBlockFromPath(path.join(rootDir, blockPath));
  let analysis = new EmberAnalysis(template, block, {});
  let plugin = (_env: ASTPluginEnvironment) => new TemplateAnalyzingRewriter(template, block, analysis, config, syntax);
  let astOptions = {
    meta: {},
    plugins: {
      ast: [plugin],
    },
  };
  let rewrittenAST = parse(fs.readFileSync(template.fullPath, "utf8"), astOptions);
  let rewrittenTemplate = print(rewrittenAST);
  return {
    block,
    template,
    rewrittenAST,
    rewrittenTemplate,
    analysis,
  };
}

describe("Template Rewriting", function() {

  let fixtures: TempDir;
  let projectDir: string;
  let factory: BlockFactory;
  let options: Options | undefined;
  before(async () => {
    fixtures = await createTempDir();
    projectDir = fixtures.path();
    factory = new BlockFactory(options || {});
    fixtures.write({
      "templates": {
        "hello.hbs": "<div block:scope>Hello World!</div>",
      },
      "styles": {
        "hello.block.css": ":scope {color: red; }",
      },
    });
  });
  it("rewrites styles", async function() {
    let result = await analyzeAndRewrite(factory, projectDir, "templates/hello.hbs", "styles/hello.block.css");
    assert.deepEqual(
      result.rewrittenTemplate,
      minify(`<div class="TODO">Hello World!</div>`));
    assert.deepEqual(result.analysis.serialize(), {
      template: {
        type: TEMPLATE_NAME,
        identifier: fixtures.path("templates/hello.hbs"),
        data: [
          "templates/hello.hbs",
        ],
      },
      blocks: {
        default: fixtures.path("styles/hello.block.css"),
      },
      stylesFound: [":scope"],
      elements: {
        a: {
          tagName: "div",
          dynamicAttributes: [],
          dynamicClasses: [],
          staticStyles: [0],
          sourceLocation: {
            start: {
              filename: fixtures.path("templates/hello.hbs"),
              line: 1,
              column: 0,
            },
            end: {
              filename: fixtures.path("templates/hello.hbs"),
              line: 1,
              column: 35,
            },
          },
        },
      },
    });
  });

  /* ** DISABLED
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
    const expectedMessage = '[css-blocks] Error: The block:class attribute must contain a value and is not allowed to be purely positional. Did you mean block:class="foo"? (ui/components/with-style-helper/template.hbs:2:37)';

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

  it("errors if style-of helper is provided unsupported arguments.", async function() {
    // assert.expect(2);
    const projectDir = fixture("styled-app");
    const analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, moduleConfig);
    const template = fixture("styled-app/src/ui/components/style-of-unsupported/template.hbs");
    const expectedMessage = "[css-blocks] Error: An attribute without a block namespace is forbidden in this context: foo (ui/components/style-of-unsupported/template.hbs:2:37)";
    let didError = false;
    try {
      await pipeline(projectDir, analyzer, "style-of-unsupported", template);
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
  ** END DISABLED */
});

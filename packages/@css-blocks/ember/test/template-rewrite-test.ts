import { BlockFactory, Options } from "@css-blocks/core";
import { ASTPluginEnvironment, Syntax, Walker, builders, preprocess as parse, print, traverse } from "@glimmer/syntax";
import { TempDir, createTempDir } from "broccoli-test-helper";
import chai = require("chai");
import chaiAsPromised = require("chai-as-promised");
import * as fs from "fs";
import * as path from "path";

import { EmberAnalysis } from "../src/EmberAnalysis";
import { HandlebarsTemplate, TEMPLATE_NAME } from "../src/HandlebarsTemplate";
import { TemplateAnalyzingRewriter } from "../src/TemplateAnalyzingRewriter";

chai.use(chaiAsPromised);
const assert = chai.assert;

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
        "shared": {
          "header.block.css": `
            :scope {
                font-size: 18px;
            }
            .emphasis {
                color: black;
            }
            .emphasis[style=bold] {
                font-weight: bold;
            }
            .emphasis[style=italic] {
                font-style: italic;
            }
          `,
          "typography.block.css": `
            .underline {
                text-decoration: underline;
            }
          `,
        },
        "hello.block.css": ":scope {color: red; }",
      },
    });
  });

  after(async () => {
    await fixtures.dispose();
  });

  it("rewrites styles", async function() {
    let result = await analyzeAndRewrite(factory, projectDir, "templates/hello.hbs", "styles/hello.block.css");
    assert.deepEqual(
      result.rewrittenTemplate,
      minify(`<div class={{-cssblocks- 0 1 "${result.block.guid}" null 1 0 0 1 1 0}}>Hello World!</div>`));
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

  it("has a test boilerplate", async function() {
    let result = await analyzeAndRewrite(factory, projectDir, "templates/hello.hbs", "styles/hello.block.css");
    assert.deepEqual(
      minify(result.rewrittenTemplate),
      minify(`<div class={{-cssblocks- 0 1 "${result.block.guid}" null 1 0 0 1 1 0}}>Hello World!</div>`));
    let analysis = result.analysis.serialize();
    assert.deepEqual(Object.keys(analysis.blocks).length, 1);
    assert.deepEqual(analysis.stylesFound, [":scope"]);
    assert.deepEqual(Object.keys(analysis.elements).length, 1);
    assert.deepEqual(analysis.elements.a.staticStyles, [0]);
    assert.deepEqual(analysis.elements.a.dynamicClasses, []);
    assert.deepEqual(analysis.elements.a.dynamicAttributes, []);
  });

  it("rewrites styles from dynamic classes", async function() {
    fixtures.write({
      templates: {
        components: {
          "with-dynamic-classes.hbs": `
            <div>
              <h1 h:scope>Hello, <span block:class={{style-if isWorld 'world'}} h:class="emphasis" t:class="underline" block:thick={{eq isThick 1}} h:style={{textStyle}}>World</span>!</h1>
              <div block:class={{style-if isWorld 'world' 'planet'}}>World</div>
              <div block:class={{style-unless isWorld 'world' 'planet'}}>World</div>
              <div block:class={{style-unless isWorld 'world'}}>World</div>
              <h2 h:scope={{isWorld}}>Dynamic Scope</h2>
            </div>
          `,
        },
      },
      styles: {
        components: {
          "with-dynamic-classes.block.css": `
            @block h from "../shared/header.block.css";
            @block t from "../shared/typography.block.css";
            :scope {
                color: red;
            }
            .world {
                border: 1px solid black;
            }
            .world[thick] {
                border-width: 3px;
            }
            .planet {
                border: 3px groove gray;
            }
            @export (h, t);
          `,
        },
      },
    });
    let result = await analyzeAndRewrite(factory, projectDir, "templates/components/with-dynamic-classes.hbs", "styles/components/with-dynamic-classes.block.css");
    let defaultBlock = result.block;
    let headerBlock = result.block.getReferencedBlock("h")!;
    let typographyBlock = result.block.getReferencedBlock("t")!;
    assert.deepEqual(
      minify(result.rewrittenTemplate),
      minify(`
        <div class={{-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 0 1 1 0}}>
          <h1 class={{-cssblocks- 0 1 "${headerBlock.guid}" null 1 0 0 1 1 0}}>Hello,
          <span class={{-cssblocks- 0 3 "${defaultBlock.guid}" null "${headerBlock.guid}" null "${typographyBlock.guid}" null 6 0 1 1 1 2 1 0 3 1 3 1 4 5 1 1 1 2 3 isWorld 1 0 0 2 (eq isThick 1) 1 3 4 1 textStyle "bold" 1 4 "italic" 1 5}}>World</span>!</h1>
          <div class={{-cssblocks- 0 1 "${defaultBlock.guid}" null 2 0 1 0 4 1 3 isWorld 1 0 1 1}}>World</div>
          <div class={{-cssblocks- 0 1 "${defaultBlock.guid}" null 2 0 4 0 1 1 3 isWorld 1 0 1 1}}>World</div>
          <div class={{-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 1 1 3 isWorld 0 1 0}}>World</div>
          <h2 class={{-cssblocks- 0 1 "${headerBlock.guid}" null 1 0 0 1 3 isWorld 1 0 0}}>Dynamic Scope</h2>
        </div>
      `));
    let analysis = result.analysis.serialize();
    assert.deepEqual(Object.keys(analysis.blocks).length, 3);
    assert.deepEqual(analysis.stylesFound, [
      ".planet",
      ".world",
      ".world[thick]",
      ":scope",
      "h.emphasis",
      "h.emphasis[style=bold]",
      "h.emphasis[style=italic]",
      "h:scope",
      "t.underline",
    ]);
    assert.deepEqual(Object.keys(analysis.elements).length, 7);
    assert.deepEqual(analysis.elements.a.staticStyles, [analysis.stylesFound.indexOf(":scope")]);
    assert.deepEqual(analysis.elements.a.dynamicClasses, []);
    assert.deepEqual(analysis.elements.a.dynamicAttributes, []);

    assert.deepEqual(analysis.elements.c.tagName, "span");
    assert.deepEqual(analysis.elements.c.staticStyles, [analysis.stylesFound.indexOf("h.emphasis"), analysis.stylesFound.indexOf("t.underline")]);
    assert.deepEqual(analysis.elements.c.dynamicClasses, [{
      condition: true, whenTrue: [analysis.stylesFound.indexOf(".world")],
    }]);
    assert.deepEqual(analysis.elements.c.dynamicAttributes, [
      {
        condition: true,
        container: analysis.stylesFound.indexOf(".world"),
        value: [analysis.stylesFound.indexOf(".world[thick]")],
      },
      {
        group: {
          bold: analysis.stylesFound.indexOf("h.emphasis[style=bold]"),
          italic: analysis.stylesFound.indexOf("h.emphasis[style=italic]"),
        },
        stringExpression: true,
        value: [],
      },
    ]);
  });

  it("rewrites styles with the style-of helper", async function() {
    fixtures.write({
      templates: {
        components: {
          "with-style-of-helper.hbs": `
            <div>
              <h1 h:scope>Hello, <World cssClass={{style-of block:thick block:class="world" h:class="emphasis" h:style=textStyle}} />!</h1>
            </div>
          `,
        },
      },
      styles: {
        components: {
          "with-style-of-helper.block.css": `
            @block h from "../shared/header.block.css";
            @block t from "../shared/typography.block.css";
            :scope {
                color: red;
            }
            .world {
                border: 1px solid black;
            }
            .world[thick] {
                border-width: 3px;
            }
            .planet {
                border: 3px groove gray;
            }
            @export (h, t);
          `,
        },
      },
    });
    let result = await analyzeAndRewrite(factory, projectDir, "templates/components/with-style-of-helper.hbs", "styles/components/with-style-of-helper.block.css");
    let defaultBlock = result.block;
    let headerBlock = result.block.getReferencedBlock("h")!;
    assert.deepEqual(
      minify(result.rewrittenTemplate),
      minify(`
        <div class={{-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 0 1 1 0}}>
          <h1 class={{-cssblocks- 0 1 "${headerBlock.guid}" null 1 0 0 1 1 0}}>Hello,
          <World cssClass={{-cssblocks- 0 2 "${defaultBlock.guid}" null "${headerBlock.guid}" null 5 0 1 1 1 0 3 1 3 1 4 4 1 0 1 1 1 2 4 1 (textStyle) "bold" 1 3 "italic" 1 4}} />!</h1>
        </div>
      `));
    let analysis = result.analysis.serialize();
    assert.deepEqual(Object.keys(analysis.blocks).length, 3);
    assert.deepEqual(analysis.stylesFound, [
      ".world",
      ".world[thick]",
      ":scope",
      "h.emphasis",
      "h.emphasis[style=bold]",
      "h.emphasis[style=italic]",
      "h:scope",
    ]);
    assert.deepEqual(Object.keys(analysis.elements).length, 4);
  });

  it("rewrites styles with style-of subexpressions", async function() {
    fixtures.write({
      templates: {
        components: {
          "with-style-of-subexpression.hbs": `
            <div>
              <h1 h:scope>Hello,
                {{yield (hash
                  classnames=(hash
                    action=(style-of block:class="world" h:class="emphasis" block:thick=isThick h:style=textStyle)
                  )
                )}}
              </h1>
            </div>
          `,
        },
      },
      styles: {
        components: {
          "with-style-of-subexpression.block.css": `
            @block h from "../shared/header.block.css";
            @block t from "../shared/typography.block.css";
            :scope {
                color: red;
            }
            .world {
                border: 1px solid black;
            }
            .world[thick] {
                border-width: 3px;
            }
            .planet {
                border: 3px groove gray;
            }
            @export (h, t);
          `,
        },
      },
    });
    let result = await analyzeAndRewrite(factory, projectDir, "templates/components/with-style-of-subexpression.hbs", "styles/components/with-style-of-subexpression.block.css");
    let defaultBlock = result.block;
    let headerBlock = result.block.getReferencedBlock("h")!;
    assert.deepEqual(
      minify(result.rewrittenTemplate),
      minify(`
      <div class={{-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 0 1 1 0}}>
        <h1 class={{-cssblocks- 0 1 "${headerBlock.guid}" null 1 0 0 1 1 0}}>Hello,
          {{yield (hash
            classnames=(hash
              action=(-cssblocks- 0 2 "${defaultBlock.guid}" null "${headerBlock.guid}" null 5 0 1 1 1 0 3 1 3 1 4 4 1 0 1 1 2 isThick 1 2 4 1 (textStyle) "bold" 1 3 "italic" 1 4)))}}
        </h1>
      </div>
      `));
    let analysis = result.analysis.serialize();
    assert.deepEqual(Object.keys(analysis.blocks).length, 3);
    assert.deepEqual(analysis.stylesFound, [
      ".world",
      ".world[thick]",
      ":scope",
      "h.emphasis",
      "h.emphasis[style=bold]",
      "h.emphasis[style=italic]",
      "h:scope",
    ]);
    assert.deepEqual(Object.keys(analysis.elements).length, 3);
  });

  it("rewrites link-to component", async function() {
    fixtures.write({
      templates: {
        components: {
          "with-link-to.hbs": `
            <div>
              {{link-to "Inline Form" "inline-form" block:class="link-1"}}
              {{#link-to "block-form" block:class="link-1" util:class="util"}}Block Form{{/link-to}}

              {{link-to "Inline Form" "inline-form-active" block:class="link-2"}}
              {{#link-to "block-form-active" block:class="link-2"}}Block Form{{/link-to}}

              {{link-to "Dynamic Inline Form" "inline-form-active" block:class=(style-if foo "link-2") activeClass="whatever"}}
              {{#link-to "block-form-active" block:class=(style-if foo "link-2")}}Dynamic Block Form{{/link-to}}

              {{link-to "Inline Form, Inherited State" "inline-form-active" block:class="link-3" activeClass="whatever"}}
              {{#link-to "block-form-active" block:class="link-3"}}Block Form, Inherited State{{/link-to}}

              {{link-to "Inline Form, External State" "inline-form-active" external:class="link-3" activeClass="whatever"}}
              {{#link-to "block-form-active" external:class="link-3"}}Block Form, External State{{/link-to}}

              {{link-to "Inline Form, All States" "inline-form-active" block:class="link-4" loadingClass="whatever"}}
              {{#link-to "block-form-active" block:class="link-4" disabledClass="whatever"}}Block Form, All States{{/link-to}}
            </div>
          `,
        },
      },
      styles: {
        components: {
          "with-link-to.block.css": `
            @block external from "./external.block.css";
            @export external;
            @export util from "./util.block.css";
            :scope {
              extends: external;
              color: red;
            }
            .link-1 {
              color: yellow;
            }
            .link-2 {
              color: green;
            }
            .link-2[active] {
              color: blue;
            }
            .link-4 {
              color: gray;
            }
            .link-4[active] {
              color: green;
            }
            .link-4[loading] {
              color: yellow;
            }
            .link-4[disabled] {
              color: red;
            }
          `,
          "external.block.css": `
            :scope {
              block-name: external;
              background: #ccc;
            }
            .link-1 {
              background: blue;
            }
            .link-3 {
              color: pink;
            }
            .link-3[active] {
              color: purple
            }
          `,
          "util.block.css": `
            .util {
              border: 1px solid blue;
            }
          `,
        },
      },
    });
    let result = await analyzeAndRewrite(factory, projectDir, "templates/components/with-link-to.hbs", "styles/components/with-link-to.block.css");
    let defaultBlock = result.block;
    let externalBlock = result.block.getExportedBlock("external")!;
    let utilBlock = result.block.getExportedBlock("util")!;
    assert.deepEqual(
      minify(result.rewrittenTemplate),
      minify(`
        <div class={{-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 0 1 1 0}}>
          {{link-to "Inline Form" "inline-form" class=(-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 1 1 1 0)}}
          {{#link-to "block-form" class=(-cssblocks- 0 2 "${defaultBlock.guid}" null "${utilBlock.guid}" null 2 0 1 1 1 2 1 0 1 1)}}Block Form{{/link-to}}

          {{link-to "Inline Form" "inline-form-active" class=(-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 2 1 1 0)}}
          {{#link-to "block-form-active" class=(-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 2 1 1 0)}}Block Form{{/link-to}}

          {{link-to "Dynamic Inline Form" "inline-form-active" class=(-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 2 1 3 foo 1 0 0)}}
          {{#link-to "block-form-active" class=(-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 2 1 3 foo 1 0 0)}}Dynamic Block Form{{/link-to}}

          {{link-to "Inline Form, Inherited State" "inline-form-active" class=(-cssblocks- 0 1 "${externalBlock.guid}" null 1 0 2 1 1 0)}}
          {{#link-to "block-form-active" class=(-cssblocks- 0 1 "${externalBlock.guid}" null 1 0 2 1 1 0)}}Block Form, Inherited State{{/link-to}}

          {{link-to "Inline Form, External State" "inline-form-active" class=(-cssblocks- 0 1 "${externalBlock.guid}" null 1 0 2 1 1 0)}}
          {{#link-to "block-form-active" class=(-cssblocks- 0 1 "${externalBlock.guid}" null 1 0 2 1 1 0)}}Block Form, External State{{/link-to}}

          {{link-to "Inline Form, All States" "inline-form-active" class=(-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 5 1 1 0)}}
          {{#link-to "block-form-active" class=(-cssblocks- 0 1 "${defaultBlock.guid}" null 1 0 5 1 1 0)}}Block Form, All States{{/link-to}}
        </div>
      `));
    let analysis = result.analysis.serialize();
    assert.deepEqual(Object.keys(analysis.blocks).length, 3);
    assert.deepEqual(analysis.stylesFound, [
      ".link-1",
      ".link-2",
      ".link-2[active]",
      ".link-4",
      ".link-4[active]",
      ".link-4[disabled]",
      ".link-4[loading]",
      ":scope",
      "external.link-3",
      "external.link-3[active]",
      "util.util",
    ]);
    assert.deepEqual(Object.keys(analysis.elements).length, 27);
  });

  it("rewrites positional and hash-based params to the style-of helper the same way", async function() {
    fixtures.write({
      templates: {
        components: {
          "with-style-of-helper.hbs": `
            <div>
              <h1 h:scope>Hello, <World cssClass={{style-of block:thick block:class="world" h:class="emphasis" h:style=textStyle}} />!</h1>
            </div>
          `,
          "with-style-of-hash-params.hbs": `
            <div>
              <h1 h:scope>Hello, <World cssClass={{style-of block:thick=true block:class="world" h:class="emphasis" h:style=textStyle}} />!</h1>
            </div>
          `,
        },
      },
      styles: {
        components: {
          "with-style-of-helper.block.css": `
            @block h from "../shared/header.block.css";
            @block t from "../shared/typography.block.css";
            :scope {
                color: red;
            }
            .world {
                border: 1px solid black;
            }
            .world[thick] {
                border-width: 3px;
            }
            .planet {
                border: 3px groove gray;
            }
            @export (h, t);
          `,
        },
      },
    });
    let resultPositional = await analyzeAndRewrite(factory, projectDir, "templates/components/with-style-of-helper.hbs", "styles/components/with-style-of-helper.block.css");
    let resultHash = await analyzeAndRewrite(factory, projectDir, "templates/components/with-style-of-hash-params.hbs", "styles/components/with-style-of-helper.block.css");
    assert.deepEqual(resultPositional.rewrittenTemplate, resultHash.rewrittenTemplate);
  });

  it("errors if styles conflict.", async function() {
    fixtures.write({
      templates: {
        components: {
          "has-style-conflict.hbs": `
            <div>
              <h1 h:scope block:class="h1">Hello, World!</h1>
            </div>
          `,
        },
      },
      styles: {
        components: {
          "has-style-conflict.block.css": `
            @block h from "../shared/header.block.css";
            .h1 {
              font-size: 22px;
            }
            @export (h);
          `,
        },
      },
    });
    return assert.isRejected(
      analyzeAndRewrite(factory, projectDir, "templates/components/has-style-conflict.hbs", "styles/components/has-style-conflict.block.css"),
      `[css-blocks] TemplateError: The following property conflicts must be resolved for these composed Styles:`,
    );
  });

  it("errors if positional argument is a block:class", async function() {
    fixtures.write({
      templates: {
        components: {
          "invalid-positional-param.hbs": `
            <div>
              <h1 h:scope>Hello, <World cssClass={{style-of block:thick block:class h:class="emphasis" h:style=textStyle}} />!</h1>
            </div>
          `,
        },
      },
      styles: {
        components: {
          "with-style-of-helper.block.css": `
            @block h from "../shared/header.block.css";
            @block t from "../shared/typography.block.css";
            :scope {
                color: red;
            }
            .world {
                border: 1px solid black;
            }
            .world[thick] {
                border-width: 3px;
            }
            .planet {
                border: 3px groove gray;
            }
            @export (h, t);
          `,
        },
      },
    });
    return assert.isRejected(
      analyzeAndRewrite(factory, projectDir, "templates/components/invalid-positional-param.hbs", "styles/components/with-style-of-helper.block.css"),
      `[css-blocks] Error: The block:class attribute must contain a value and is not allowed to be purely positional. Did you mean block:class="foo"? (templates/components/invalid-positional-param.hbs:3:49)`,
    );
  });

  it("errors if style-of helper is provided unsupported arguments.", async function() {
    fixtures.write({
      templates: {
        components: {
          "invalid-param.hbs": `
            <div>
              <h1 h:scope>Hello, <World cssClass={{style-of block:thick foo bar="something" baz=true block:class="world" h:class="emphasis" h:style=textStyle}} />!</h1>
            </div>
          `,
        },
      },
      styles: {
        components: {
          "with-style-of-helper.block.css": `
            @block h from "../shared/header.block.css";
            @block t from "../shared/typography.block.css";
            :scope {
                color: red;
            }
            .world {
                border: 1px solid black;
            }
            .world[thick] {
                border-width: 3px;
            }
            .planet {
                border: 3px groove gray;
            }
            @export (h, t);
          `,
        },
      },
    });
    return assert.isRejected(
      analyzeAndRewrite(factory, projectDir, "templates/components/invalid-param.hbs", "styles/components/with-style-of-helper.block.css"),
      `[css-blocks] Error: An attribute without a block namespace is forbidden in this context: foo (templates/components/invalid-param.hbs:3:49)`,
    );
  });

  it.skip("rewrites styles with block aliases", async function() {
    // TODO: we can test this when we have the runtime implementation working.
  });
});

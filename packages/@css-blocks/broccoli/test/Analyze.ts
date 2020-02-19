import { BlockFactory, CascadingError, InvalidBlockSyntax, MultipleCssBlockErrors } from "@css-blocks/core";
import { GlimmerAnalyzer } from "@css-blocks/glimmer";
import * as assert from "assert";
import { TempDir, createBuilder, createTempDir } from "broccoli-test-helper";
import * as FSTree from "fs-tree-diff";
import * as walkSync from "walk-sync";

import { CSSBlocksAnalyze, Transport } from "../src/index";

describe("Broccoli Analyze Plugin Test", function () {
  let input: TempDir;

  beforeEach(async () => {
    input = await createTempDir();
  });

  afterEach(async () => {
    await input.dispose();
  });

  describe("Broccoli Plugin Test", () => {
    it("analyzes a CSS Blocks project and populates transport object", async () => {
      const entryComponentName = "Chrisrng";

      input.write({
        "package.json": `{ "name": "chrisrng-test" }`,
        src: {
          ui: {
            components: {
              [entryComponentName]: {
                "template.hbs": `<div><h1 block:class="foo">Welcome to Glimmer!</h1></div>`,
                "stylesheet.css": `:scope { color: red; } .foo { color: green; }`,
              },
            },
          },
        },
      });

      let transport = new Transport("test-transport");
      let analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, {
        app: { name: "test" },
        types: {
          stylesheet: { definitiveCollection: "components" },
          template: { definitiveCollection: "components" },
        },
        collections: {
          components: { group: "ui", types: ["template", "stylesheet"] },
        },
      });
      let output = createBuilder(new CSSBlocksAnalyze(
        input.path(),
        transport,
        {
          entry: [entryComponentName],
          root: input.path(),
          output: "css-blocks.css",
          analyzer,
        },
      ));

      // First pass does full compile and copies all files except block files to output.
      let preDiff = FSTree.fromEntries(walkSync.entries(input.path()));
      await output.build();
      let postDiff = FSTree.fromEntries(walkSync.entries(input.path()));

      assert.equal(preDiff.calculatePatch(postDiff).length, 0, "Input directory unchanged after build.");
      assert.ok(Object.keys(transport).length, "Transport Object populated");
      assert.ok(transport["mapping"], "Mapping property is populated in Transport Object");
      assert.ok(transport["blocks"], "Blocks property is populated in Transport Object");
      assert.ok(transport["analyzer"], "Analyzer property is populated in Transport Object");
      assert.equal(transport["css"], ".a { color: red; } .b { color: green; }", "CSS property is populated in Transport Object");
      assert.deepEqual(output.changes(), {
        "package.json": "create",
        "src/": "mkdir",
        "src/ui/": "mkdir",
        "src/ui/components/": "mkdir",
        "src/ui/components/Chrisrng/": "mkdir",
        "src/ui/components/Chrisrng/template.hbs": "create",
      });

      // Modifications to block files trigger build but result in no output tree changes.
      input.write({
        src: {
          ui: {
            components: {
              [entryComponentName]: {
                "stylesheet.css": `:scope { color: blue; } .foo { color: yellow; }`,
              },
            },
          },
        },
      });
      await output.build();
      assert.equal(preDiff.calculatePatch(postDiff).length, 0, "Input directory unchanged after rebuild.");
      assert.equal(transport["css"], ".a { color: blue; } .b { color: yellow; }", "Modifications to block files trigger build but result in no output tree changes.");
      assert.deepEqual(output.changes(), {}, "Modifications to block files trigger build but result in no output tree changes.");

      // Removal of block files trigger build but result in no tree changes.
      input.write({
        src: {
          ui: {
            components: {
              [entryComponentName]: {
                "stylesheet.css": null,
              },
            },
          },
        },
      });
      await output.build();
      assert.equal(transport["css"], "", "Removal of block files trigger build but result in no output tree changes.");
      assert.deepEqual(output.changes(), {}, "Removal of block files trigger build but result in output no tree changes.");

      // Addition of block files trigger build but result in no output tree changes.
      input.write({
        src: {
          ui: {
            components: {
              [entryComponentName]: {
                "stylesheet.css": `:scope { color: red; } .foo { color: green; }`,
              },
            },
          },
        },
      });
      await output.build();
      assert.equal(transport["css"], ".a { color: red; } .b { color: green; }", "Addition of block files trigger build but result in no output tree changes.");
      assert.deepEqual(output.changes(), {}, "Addition of block files trigger build but result in no output tree changes.");

      // Modifications to non-block files are funneled through to output.
      input.write({
        src: {
          ui: {
            components: {
              [entryComponentName]: {
                "template.hbs": `<div><h1>Welcome to Glimmer!</h1></div>`,
              },
            },
          },
        },
      });
      await output.build();
      assert.equal(transport["css"], ".a { color: red; }");
      assert.deepEqual(output.changes(), { "src/ui/components/Chrisrng/template.hbs": "change" });

      // NO-OP does no work and makes no modifications.
      transport["css"] = "Transport Not Modified On NO-OP";
      await output.build();
      assert.equal(transport["css"], "Transport Not Modified On NO-OP");
      assert.deepEqual(output.changes(), {});

      // Adding a template & block is safe
      input.write({
        src: {
          ui: {
            components: {
              [entryComponentName]: {
                "template.hbs": `<div><h1>Welcome to Glimmer!</h1><AnotherComponent /></div>`,
              },
              AnotherComponent: {
                "template.hbs": `<div block:scope><h1 block:class="bar">Another Component</h1></div>`,
                "stylesheet.css": `:scope { border: 1px solid black; } .bar { border-left: 0px; }`,
              },
            },
          },
        },
      });
      await output.build();
      assert.equal(transport["css"],
                   `.a { color: red; }\n` +
                   `.b { border: 1px solid black; } .c { border-left: 0px; }`,
                   "Addition of new component compiles it.");
      assert.deepEqual(output.changes(), {
        "src/ui/components/Chrisrng/template.hbs": "change",
        "src/ui/components/AnotherComponent/": "mkdir",
        "src/ui/components/AnotherComponent/template.hbs": "create",
      });

      // Removing a template is safe
      input.write({
        src: {
          ui: {
            components: {
              AnotherComponent: {
                "template.hbs": null,
                "stylesheet.css": null,
              },
            },
          },
        },
      });
      await output.build();
      assert.deepEqual(output.changes(),
                       { "src/ui/components/AnotherComponent/template.hbs": "unlink" },
                       "output directory is cleaned up.");
    });
    it.only("Handles errors in block files", async () => {
      const entryComponentName = "HasError";

      input.write({
        "package.json": `{ "name": "has-error-test" }`,
        src: {
          ui: {
            components: {
              [entryComponentName]: {
                "template.hbs": `<div><AnotherComponent /><h1 foo:scope>Welcome to Glimmer!</h1></div>`,
                "stylesheet.css": `@export foo from "../../../../blocks/foo.block.css";`,
              },
              "AnotherComponent": {
                "template.hbs": `<div foo:scope>Hello, World!</div>`,
                "stylesheet.css": `@export foo from "../../../../blocks/foo.block.css";`,
              },
            },
          },
        },
        blocks: {
          "foo.block.css": `:scope div { color: red; }`, // this has an error in it on purpose.
        },
      });

      let transport = new Transport("test-transport");
      let analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, {
        app: { name: "test" },
        types: {
          stylesheet: { definitiveCollection: "components" },
          template: { definitiveCollection: "components" },
        },
        collections: {
          components: { group: "ui", types: ["template", "stylesheet"] },
        },
      });
      let output = createBuilder(new CSSBlocksAnalyze(
        input.path(),
        transport,
        {
          entry: [entryComponentName, "AnotherComponent"],
          root: input.path(),
          output: "css-blocks.css",
          analyzer,
        },
      ));

      // First pass does full compile and copies all files except block files to output.
      try {
        await output.build();
        assert.fail("Error was expected but not raised.");
      } catch (e) {
        let origError = e.broccoliPayload.originalError;
        assert(origError instanceof CascadingError);
        assert(origError.message.startsWith(`[css-blocks] CascadingError: Error in exported block "../../../../blocks/foo.block.css"`));
        assert(origError.cause instanceof MultipleCssBlockErrors);
        assert(origError.cause.errors[0] instanceof InvalidBlockSyntax);
      }
    });
  });
});

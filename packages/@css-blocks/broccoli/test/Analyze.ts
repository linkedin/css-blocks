import * as assert from "assert";

import { GlimmerAnalyzer } from "@css-blocks/glimmer";
import { TempDir, createBuilder, createTempDir } from "broccoli-test-helper";

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
                "template.hbs": `<div><h1 class="foo">Welcome to Glimmer!</h1></div>`,
                "stylesheet.css": `:scope { color: red; } .foo { color: green; }`,
              },
            },
          },
        },
      });

      let transport = new Transport("test-transport");
      let analyzer = new GlimmerAnalyzer({}, {}, {
        app: { name: "test" },
        types: {
          stylesheet: { definitiveCollection: "components" },
          template: { definitiveCollection: "components" },
        },
        collections: {
          components: { group: "ui", types: [ "template", "stylesheet" ] },
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
      await output.build();
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
        src: { ui: { components: { [entryComponentName]: {
          "stylesheet.css": `:scope { color: blue; } .foo { color: yellow; }`,
        }}}},
      });
      await output.build();
      assert.equal(transport["css"], ".a { color: blue; } .b { color: yellow; }", "Modifications to block files trigger build but result in no output tree changes.");
      assert.deepEqual(output.changes(), {}, "Modifications to block files trigger build but result in no output tree changes.");

      // Removal of block files trigger build but result in no tree changes.
      input.write({
        src: { ui: { components: { [entryComponentName]: {
          "stylesheet.css": null,
        }}}},
      });
      await output.build();
      assert.equal(transport["css"], "", "Removal of block files trigger build but result in no output tree changes.");
      assert.deepEqual(output.changes(), {}, "Removal of block files trigger build but result in output no tree changes.");

      // Addition of block files trigger build but result in no output tree changes.
      input.write({
        src: { ui: { components: { [entryComponentName]: {
          "stylesheet.css": `:scope { color: red; } .foo { color: green; }`,
        }}}},
      });
      await output.build();
      assert.equal(transport["css"], ".a { color: red; } .b { color: green; }", "Addition of block files trigger build but result in no output tree changes.");
      assert.deepEqual(output.changes(), {}, "Addition of block files trigger build but result in no output tree changes.");

      // Modifications to non-block files are funneled through to output.
      input.write({
        src: { ui: { components: { [entryComponentName]: {
          "template.hbs": `<div><h1>Welcome to Glimmer!</h1></div>`,
        }}}},
      });
      await output.build();
      assert.equal(transport["css"], ".a { color: red; }");
      assert.deepEqual(output.changes(), { "src/ui/components/Chrisrng/template.hbs": "change" });

      // NO-OP does no work and makes no modifications.
      transport["css"] = "Transport Not Modified On NO-OP";
      await output.build();
      assert.equal(transport["css"], "Transport Not Modified On NO-OP");
      assert.deepEqual(output.changes(), {});
    });
  });
});

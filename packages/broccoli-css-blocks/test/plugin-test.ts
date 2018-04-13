import { GlimmerAnalyzer } from "@css-blocks/glimmer-templates";
import * as assert from "assert";
import { buildOutput, createTempDir, TempDir } from "broccoli-test-helper";

import { BroccoliCSSBlocks } from "../src/index";

describe("Broccoli Plugin Test", function() {
  let input: TempDir;

  beforeEach(async () => {
    input = await createTempDir();
  });

  afterEach(async () => {
    await input.dispose();
  });

  describe("Broccoli Plugin Test", () => {
    it("runs tests", () => {
      assert.ok(1);
    });

    it("outputs CSS file", async () => {
      const entryComponentName = "Chrisrng";

      input.write({
        "package.json": `{
          "name": "chrisrng-test"
        }`,
        src: {
          ui: {
            components: {
              [entryComponentName]: {
                "template.hbs": `<div><h1 class="foo">Welcome to Glimmer!</h1></div>`,
                "stylesheet.block.css": `:scope {
                  color: red;
                }

                .foo {
                  color: green;
                }`,
              },
            },
          },
        },
      });

      let analyzer = new GlimmerAnalyzer(input.path());

      let compiler = new BroccoliCSSBlocks(input.path(), {
        entry: [entryComponentName],
        output: "src/ui/styles/css-blocks.css",
        transport: {},
        analyzer,
      });

      let output = await buildOutput(compiler);
      let files = output.read();

      assert.ok(files["src"]!["ui"]["styles"]["css-blocks.css"]);
    });
  });
});

import * as assert from "assert";

import { TempDir, createBuilder, createTempDir } from "broccoli-test-helper";
import * as FSTree from "fs-tree-diff";
import * as walkSync from "walk-sync";

import { CSSBlocksAggregate, Transport } from "../src/index";

// Reduce whitespace.
function minify(s: string | undefined) {
  return !s ? "" : s.replace(/(^[\s\n]+|[\s\n]+$)/gm, " ").replace(/[\s\n][\s\n]+/gm, " ").replace(/\n/gm, " ").trim();
}

describe("Broccoli Aggregate Plugin Test", function () {
  let input: TempDir;

  beforeEach(async () => {
    input = await createTempDir();
  });

  afterEach(async () => {
    await input.dispose();
  });

  describe("Broccoli Plugin Test", () => {
    it("outputs a CSS file and populates transport object", async () => {

      input.write({
        "test.css": ".test { display: none; }",
        "app.css": "app { color: white; }",
      });

      let transportA = new Transport("TransportA");
      transportA.css = ".a { color: red; }";
      let transportB = new Transport("TransportB");
      transportB.css = ".b { color: green; }";
      let transportC = new Transport("TransportC");
      transportC.css = ".c { color: blue; }";

      let pluginA = new CSSBlocksAggregate([ input.path() ], transportA, "app.css");
      let pluginB = new CSSBlocksAggregate([ pluginA ], transportB, "app.css");
      let pluginC = new CSSBlocksAggregate([ pluginB ], transportC, "app.css");
      let output = createBuilder(pluginC);

      // First pass does full compile and copies all files except block files to output.
      let preDiff = FSTree.fromEntries(walkSync.entries(input.path()));
      await output.build();
      let postDiff = FSTree.fromEntries(walkSync.entries(input.path()));

      assert.equal(preDiff.calculatePatch(postDiff).length, 0, "Input directory unchanged after build.");
      assert.deepEqual(output.changes(), {
        "test.css": "create",
        "app.css": "create",
      });
      assert.equal(minify(output.readText("app.css")), minify(`
        app { color: white; }
        /* CSS Blocks Start: "TransportA" */
        .a { color: red; }
        /* CSS Blocks End: "TransportA" */

        /* CSS Blocks Start: "TransportB" */
        .b { color: green; }
        /* CSS Blocks End: "TransportB" */

        /* CSS Blocks Start: "TransportC" */
        .c { color: blue; }
        /* CSS Blocks End: "TransportC" */
      `));

      // File Modification
      input.write({
        "test.css": ".foo { display: none; }",
      });
      await output.build();
      assert.deepEqual(output.changes(), {
        "test.css": "change",
      });
      assert.equal(minify(output.readText("app.css")), minify(`
        app { color: white; }
        /* CSS Blocks Start: "TransportA" */
        .a { color: red; }
        /* CSS Blocks End: "TransportA" */

        /* CSS Blocks Start: "TransportB" */
        .b { color: green; }
        /* CSS Blocks End: "TransportB" */

        /* CSS Blocks Start: "TransportC" */
        .c { color: blue; }
        /* CSS Blocks End: "TransportC" */
      `));

      // File Addition
      input.write({
        "new.css": ".foo { display: none; }",
      });
      await output.build();
      assert.deepEqual(output.changes(), {
        "new.css": "create",
      });

      // File Removal
      input.write({
        "new.css": null,
      });
      await output.build();
      assert.deepEqual(output.changes(), {
        "new.css": "unlink",
      });

      // Transport Change
      transportB.css = ".b { color: yellow; }";
      await output.build();
      assert.deepEqual(output.changes(), {
        "app.css": "change",
      });
      assert.equal(minify(output.readText("app.css")), minify(`
        app { color: white; }
        /* CSS Blocks Start: "TransportA" */
        .a { color: red; }
        /* CSS Blocks End: "TransportA" */

        /* CSS Blocks Start: "TransportB" */
        .b { color: yellow; }
        /* CSS Blocks End: "TransportB" */

        /* CSS Blocks Start: "TransportC" */
        .c { color: blue; }
        /* CSS Blocks End: "TransportC" */
      `));

      // NO-OP
      await output.build();
      assert.deepEqual(output.changes(), {});
      assert.equal(minify(output.readText("app.css")), minify(`
      app { color: white; }
      /* CSS Blocks Start: "TransportA" */
      .a { color: red; }
      /* CSS Blocks End: "TransportA" */

      /* CSS Blocks Start: "TransportB" */
      .b { color: yellow; }
      /* CSS Blocks End: "TransportB" */

      /* CSS Blocks Start: "TransportC" */
      .c { color: blue; }
      /* CSS Blocks End: "TransportC" */
    `));
    });
  });
});

import { Block, BlockFactory, StyleMapping } from "@css-blocks/core";
import { GlimmerAnalyzer } from "@css-blocks/glimmer";
import * as assert from "assert";

import { Transport } from "../src/index";

describe("Broccoli Transport Test", () => {
  it("creates, sets, and resets Transport objects", async () => {
    let transport = new Transport("my-id");
    assert.equal(transport.id, "my-id");
    assert.equal(transport.css, "");
    assert.equal(transport.blocks.size, 0);
    assert.equal(transport.analyzer, undefined);
    assert.equal(transport.mapping, undefined);

    transport.css = "foobar";
    transport.analyzer = new GlimmerAnalyzer(new BlockFactory({}), {}, {
      types: {},
      collections: {},
    });
    transport.blocks.add(new Block("foo", "bar", "test"));
    transport.mapping = {} as StyleMapping<"GlimmerTemplates.ResolvedFile">;

    transport.reset();

    assert.equal(transport.id, "my-id");
    assert.equal(transport.css, "");
    assert.equal(transport.blocks.size, 0);
    assert.equal(transport.analyzer, undefined);
    assert.equal(transport.mapping, undefined);

  });
});


import { assert } from "chai";

import { BlockClassSelector } from "../src/interface";

describe("block-class-selector", () => {
  it("converts toString() correctly", async () => {
    let blockClassName = new BlockClassSelector( { class: "image-figure", state: "inverse", subState: "red" });
    assert.equal(blockClassName.toString(), "image-figure[inverse=red]");
  });

  it("converts toString() correctly when there is no state or substate", async () => {
    let blockClassName = new BlockClassSelector( { class: "image-figure" });
    assert.equal(blockClassName.toString(), "image-figure");
  });

  it("converts toString() correctly when there is no class", async () => {
    let blockClassName = new BlockClassSelector( { state: "inverse", subState: "red" });
    assert.equal(blockClassName.toString(), ":scope[inverse=red]");
  });

  it("converts toString() correctly when there is no substate", async () => {
    let blockClassName = new BlockClassSelector( { class: "image-figure", state: "inverse" });
    assert.equal(blockClassName.toString(), "image-figure[inverse]");
  });
});

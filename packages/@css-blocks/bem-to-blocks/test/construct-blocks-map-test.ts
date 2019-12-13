
import { assert } from "chai";

import { constructBlocksMap } from "../src/index";
import { BemSelector, BlockClassSelector } from "../src/interface";

describe("construct-blocks", () => {
  it("converts simple classes to blocks", async () => {
    let sel1 = new BemSelector(".jobs-hero__image-container");
    let sel2  = new BemSelector(".jobs-hero__image-figure");
    let sel3 =  new BemSelector(".jobs-hero__image-figure--inverse");
    let sel4 = new BemSelector(".jobs-hero__image");
    let mockMap = new Map(Object.entries({
      ".jobs-hero__image-container": sel1,
      ".jobs-hero__image-figure": sel2,
      ".jobs-hero__image-figure--inverse": sel3,
      ".jobs-hero__image": sel4,
    }));

    let result = constructBlocksMap(mockMap);
    assert.deepEqual(result.get(sel1), new BlockClassSelector({ class: "image-container" }));
    assert.deepEqual(result.get(sel2), new BlockClassSelector({ class: "image-figure" }));
    assert.deepEqual(result.get(sel3), new BlockClassSelector({ class: "image-figure", state: "inverse" }));
    assert.deepEqual(result.get(sel4), new BlockClassSelector({ class: "image" }));
  });

  it("calculates substates correctly", async () => {
    let sel1 = new BemSelector(".jobs-hero__image--inverse-red");
    let sel2  = new BemSelector(".jobs-hero__image--inverse-black");
    let sel3 =  new BemSelector(".jobs-hero__image--inverse-blue");
    let mockMap = new Map(Object.entries({
      ".jobs-hero__image--inverse-red": sel1,
      ".jobs-hero__image--inverse-black": sel2,
      ".jobs-hero__image--inverse-blue": sel3,
    }));

    let result = constructBlocksMap(mockMap);
    assert.deepEqual(result.get(sel1), new BlockClassSelector({ class: "image", state: "inverse", subState: "red" }));
    assert.deepEqual(result.get(sel2), new BlockClassSelector({ class: "image", state: "inverse", subState: "black" }));
    assert.deepEqual(result.get(sel3), new BlockClassSelector({ class: "image", state: "inverse", subState: "blue" }));
  });

  it("calculates substates correctly when the same sub state is on different elements", async () => {
    let sel1 = new BemSelector(".jobs-hero__image--inverse-red");
    let sel2  = new BemSelector(".jobs-hero__image-container--inverse-black");
    let sel3 =  new BemSelector(".jobs-hero__image--inverse-blue");
    let mockMap = new Map(Object.entries({
      ".jobs-hero__image--inverse-red": sel1,
      ".jobs-hero__image-container--inverse-black": sel2,
      ".jobs-hero__image--inverse-blue": sel3,
    }));

    let result = constructBlocksMap(mockMap);
    assert.deepEqual(result.get(sel1), new BlockClassSelector({ class: "image", state: "inverse", subState: "red" }));
    assert.deepEqual(result.get(sel2), new BlockClassSelector({ class: "image-container", state: "inverse-black" }));
    assert.deepEqual(result.get(sel3), new BlockClassSelector({ class: "image", state: "inverse", subState: "blue" }));
  });

  it("calculates substates correctly when the same sub state is on different blocks", async () => {
    let sel1 = new BemSelector(".jobs-hero__image--inverse-red");
    let sel2  = new BemSelector(".jobs-hero__image-container--inverse-black");
    let sel3 =  new BemSelector(".jobs-hero-something__image--inverse-blue");
    let mockMap = new Map(Object.entries({
      ".jobs-hero__image--inverse-red": sel1,
      ".jobs-hero__image--inverse-black": sel2,
      ".jobs-hero-something__image--inverse-blue": sel3,
    }));

    let result = constructBlocksMap(mockMap);
    assert.deepEqual(result.get(sel1), new BlockClassSelector({ class: "image", state: "inverse-red" }));
    assert.deepEqual(result.get(sel2), new BlockClassSelector({ class: "image-container", state: "inverse-black" }));
    assert.deepEqual(result.get(sel3), new BlockClassSelector({ class: "image", state: "inverse-blue" }));
  });
});

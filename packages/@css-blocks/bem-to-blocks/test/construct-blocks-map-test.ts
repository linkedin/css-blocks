
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

  it("converts another simple block", async () => {
    let sel1 = new BemSelector(".nav");
    let sel2  = new BemSelector(".nav--open");
    let sel3 =  new BemSelector(".nav__item");
    let sel4 = new BemSelector(".nav__item--is-selected");
    let mockMap = new Map(Object.entries({
      ".nav": sel1,
      ".nav--open": sel2,
      ".nav__item": sel3,
      ".nav__item--is-selected": sel4,
    }));

    let result = constructBlocksMap(mockMap);
    assert.deepEqual(result.get(sel1), new BlockClassSelector());
    assert.deepEqual(result.get(sel2), new BlockClassSelector({ state: "open" }));
    assert.deepEqual(result.get(sel3), new BlockClassSelector({ class: "item" }));
    assert.deepEqual(result.get(sel4), new BlockClassSelector({ class: "item", state: "selected"}));
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

  it("calculates substates correctly when some of them have a common selector, not all", async () => {
    let sel1 = new BemSelector(".jobs-hero--disabled");
    let sel2  = new BemSelector(".jobs-hero--size-small");
    let sel3 =  new BemSelector(".jobs-hero--size-large");
    let sel4 =  new BemSelector(".jobs-hero--tilted");

    let mockMap = new Map(Object.entries({
      ".jobs-hero--disabled": sel1,
      ".jobs-hero--size-small": sel2,
      ".jobs-hero--size-large": sel3,
      ".jobs-hero--tilted": sel4,
    }));

    let result = constructBlocksMap(mockMap);
    assert.deepEqual(result.get(sel1), new BlockClassSelector({ class: undefined, state: "disabled" }));
    assert.deepEqual(result.get(sel2), new BlockClassSelector({ state: "size", subState: "small" }));
    assert.deepEqual(result.get(sel3), new BlockClassSelector({ state: "size", subState: "large" }));
    assert.deepEqual(result.get(sel4), new BlockClassSelector({ state: "tilted", subState: undefined }));
  });

  it("calculates substates correctly without a clearly defined separator at the state/substate boundary.", async () => {
    let sel1 = new BemSelector(".myblock__myelement--gross");
    let sel2  = new BemSelector(".myblock__myelement--great");

    let mockMap = new Map(Object.entries({
      ".myblock__myelement--gross": sel1,
      ".myblock__myelement--great": sel2,

    }));

    let result = constructBlocksMap(mockMap);
    assert.deepEqual(result.get(sel1), new BlockClassSelector({ class: "myelement", state: "gross" }));
    assert.deepEqual(result.get(sel2), new BlockClassSelector({ class: "myelement", state: "great" }));
  });

  it("calculates substates correctly when the states have a modifier is-", async () => {
    let sel1 = new BemSelector(".myblock__myelement--is-disabled");
    let sel2  = new BemSelector(".myblock__myelement--is-animating");

    let mockMap = new Map(Object.entries({
      ".myblock__myelement--is-disabled": sel1,
      ".myblock__myelement--is-animating": sel2,
    }));

    let result = constructBlocksMap(mockMap);
    assert.deepEqual(result.get(sel1), new BlockClassSelector({ class: "myelement", state: "disabled" }));
    assert.deepEqual(result.get(sel2), new BlockClassSelector({ class: "myelement", state: "animating" }));
  });

});

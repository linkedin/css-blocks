
import { assert } from "chai";
import * as postcss from "postcss";

import { bemToBlocksPlugin } from "../src/index";

describe("converts BEM to blocks", () => {
  it("converts simple classes to blocks", async () => {
    let output = postcss([bemToBlocksPlugin])
        .process(".jobs-entry__image--inverse-red {color: blue}");

    assert.equal(output.toString(), ".image[inverse-red] {color: blue}");
  });

  it("existing attributes remain unchanged", async () => {
    let output = postcss([bemToBlocksPlugin])
        .process(".jobs-entry__image[state=red] {color: blue}");

    assert.equal(output.toString(), ".image[state=red] {color: blue}");
  });

  it("selector has attributes and a modifier", async () => {
    let output = postcss([bemToBlocksPlugin])
        .process(".jobs-entry__image--big[state=red] {color: blue}");

    assert.equal(output.toString(), ".image[big][state=red] {color: blue}");
  });

  it("comments are left as is", async () => {
    let output = postcss([bemToBlocksPlugin])
        .process(`/* adding a comment here */.jobs-entry__image--big[state=red] {color: blue}`);

    assert.equal(output.toString(), `/* adding a comment here */.image[big][state=red] {color: blue}`);
  });

  it("respects pseudo selectors", async () => {
    let output = postcss([bemToBlocksPlugin])
        .process(".jobs-entry__image--big::before {color: blue}");

    assert.equal(output.toString(), ".image[big]::before {color: blue}");
  });

  it("respects sibling selectors", async () => {
    let output = postcss([bemToBlocksPlugin])
        .process(".jobs-entry__image--big>.jobs-entry__image--small {color: blue}");

    assert.equal(output.toString(), ".image[big]>.image[small] {color: blue}");
  });

  it("respects scss imports", async () => {
    let output = postcss([bemToBlocksPlugin])
        .process(`@import "restyle"; .jobs-entry__image--big[state=red] {color: blue}`);

    assert.equal(output.toString(), `@import "restyle"; .image[big][state=red] {color: blue}`);
  });

  it("respects scss nesting", async () => {
    let output = postcss([bemToBlocksPlugin])
        .process(`@import "restyle"; .jobs-entry__image--big[state=red] {color: blue}`);

    assert.equal(output.toString(), `@import "restyle"; .image[big][state=red] {color: blue}`);
  });

  it("other scss syntax", async () => {
    let output = postcss([bemToBlocksPlugin])
        .process(`
        @mixin artdeco-badge(){
          @keyframes artdecoBadgeAnimationIn1 {
            from { transform: scale(0);}
            to { transform: scale(1.15); }
          }

          @keyframes artdecoBadgeAnimationIn2 {
            from { transform: scale(1.15);}
            to { transform: scale(1); }
          }
        }`);

    assert.equal(output.toString().trim(), `
        @mixin artdeco-badge(){
          @keyframes artdecoBadgeAnimationIn1 {
            from { transform: scale(0);}
            to { transform: scale(1.15); }
          }

          @keyframes artdecoBadgeAnimationIn2 {
            from { transform: scale(1.15);}
            to { transform: scale(1); }
          }
        }`.trim());
  });

  it("replaces substates correctly", async () => {
    let output = postcss([bemToBlocksPlugin])
        .process(`.jobs-entry__image--size-big {color: blue}
        .jobs-entry__image--size-small {color: red}`);

    assert.equal(output.toString(), `.image[size=big] {color: blue}
        .image[size=small] {color: red}`);
  });

  it("replaces substates correctly when the modifier is on the block", async () => {
    let output = postcss([bemToBlocksPlugin])
        .process(`.jobs-entry--size-big {color: blue}
        .jobs-entry--size-small {color: red}`);

    assert.equal(output.toString(), `:scope[size=big] {color: blue}
        :scope[size=small] {color: red}`);
  });
});

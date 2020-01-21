
import { assert } from "chai";
import * as inquirer from "inquirer";
import * as postcss from "postcss";
import * as sinon from "sinon";

import { bemToBlocksPlugin } from "../src/index";

describe("converts BEM to blocks", () => {

  it("converts simple classes to blocks", async () => {
    postcss([bemToBlocksPlugin])
      .process(".jobs-entry__image--inverse-red {color: blue}").then((output) => {
        assert.equal(output.toString(), ".image[inverse-red] {color: blue}");
      }).catch();

  });

  it("existing attributes remain unchanged", async () => {
    postcss([bemToBlocksPlugin])
      .process(".jobs-entry__image[state=red] {color: blue}")
      .then(output => {
        assert.equal(output.toString(), ".image[state=red] {color: blue}");
      }).catch();
  });

  it("selector has attributes and a modifier", async () => {
    postcss([bemToBlocksPlugin])
      .process(".jobs-entry__image--big[state=red] {color: blue}")
      .then(output => {
        assert.equal(output.toString(), ".image[big][state=red] {color: blue}");
      }).catch();
  });

  it("comments are left as is", async () => {
    postcss([bemToBlocksPlugin])
      .process(`/* adding a comment here */.jobs-entry__image--big[state=red] {color: blue}`)
      .then(output => {
        assert.equal(output.toString(), `/* adding a comment here */.image[big][state=red] {color: blue}`);
      })
      .catch();
  });

  it("respects pseudo selectors", async () => {
    postcss([bemToBlocksPlugin])
      .process(".jobs-entry__image--big::before {color: blue}")
      .then(output => {
        assert.equal(output.toString(), ".image[big]::before {color: blue}");
      })
      .catch();
  });

  it("respects sibling selectors", async () => {
    postcss([bemToBlocksPlugin])
      .process(".jobs-entry__image--big>.jobs-entry__image--small {color: blue}")
      .then(output => {
        assert.equal(output.toString(), ".image[big]>.image[small] {color: blue}");
      })
      .catch();
  });

  it("respects scss imports", async () => {
    postcss([bemToBlocksPlugin])
      .process(`@import "restyle"; .jobs-entry__image--big[state=red] {color: blue}`)
      .then(output => {
        assert.equal(output.toString(), `@import "restyle"; .image[big][state=red] {color: blue}`);
      })
      .catch();
  });

  it("respects scss nesting", async () => {
    postcss([bemToBlocksPlugin])
      .process(`@import "restyle"; .jobs-entry__image--big[state=red] {color: blue}`)
      .then(output => {
        assert.equal(output.toString(), `@import "restyle"; .image[big][state=red] {color: blue}`);
      })
      .catch();
  });

  it("other scss syntax", async () => {
    postcss([bemToBlocksPlugin])
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
      }`).then(output => {
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
      }).catch();
  });

  it("replaces substates correctly", async () => {
    postcss([bemToBlocksPlugin])
        .process(`.jobs-entry__image--size-big {color: blue}
        .jobs-entry__image--size-small {color: red}`)
        .then(output => {
          assert.equal(output.toString(), `.image[size="big"] {color: blue}
        .image[size="small"] {color: red}`);
        })
        .catch();
  });

  it("replaces substates correctly when the modifier is on the block", async () => {
    postcss([bemToBlocksPlugin])
      .process(`.jobs-entry--size-big {color: blue}
      .jobs-entry--size-small {color: red}`)
      .then(output => {
        assert.equal(output.toString(), `:scope[size="big"] {color: blue}
      :scope[size="small"] {color: red}`);
      }).catch();
  });

  it("calls inquirer for user input", async() => {

    let stub = sinon.stub(inquirer, "prompt");
    // disabling the rule as it expects a Promise<unknown> & {ui:PromptUI}
    /* tslint:disable:prefer-unknown-to-any */
    stub.onCall(0).returns({block: "my-block"} as any);
    stub.onCall(1).returns({element: "my-elem"} as any);
    stub.onCall(2).returns({modifier: "my-mod"} as any);
    postcss([bemToBlocksPlugin])
        .process(`.CLASSINCAPSTHATISNOTBEM {color: blue}`)
        .then((output) => {
          assert.equal(output.css, ".my-elem[my-mod] {color: blue}");
          assert.equal(stub.calledThrice, true);

        }).catch();
  });
});


import { assert } from "chai";
import * as inquirer from "inquirer";
import * as postcss from "postcss";
import * as sinon from "sinon";

import { bemToBlocksPlugin } from "../src/index";

describe("converts BEM to blocks", () => {

  it("converts simple classes to blocks", async () => {
    return postcss([bemToBlocksPlugin])
      .process(".jobs-entry__image--inverse-red {color: blue}").then((output) => {
        assert.equal(output.toString(), ".image[inverse-red] {color: blue}");
      });
  });

  it("existing attributes remain unchanged", async () => {
    return postcss([bemToBlocksPlugin])
      .process(".jobs-entry__image[state=red] {color: blue}")
      .then(output => {
        assert.equal(output.toString(), ".image[state=red] {color: blue}");
      });
  });

  it("selector has attributes and a modifier", async () => {
    return postcss([bemToBlocksPlugin])
      .process(".jobs-entry__image--big[state=red] {color: blue}")
      .then(output => {
        assert.equal(output.toString(), ".image[big][state=red] {color: blue}");
      });
  });

  it("comments are left as is", async () => {
    return postcss([bemToBlocksPlugin])
      .process(`/* adding a comment here */.jobs-entry__image--big[state=red] {color: blue}`)
      .then(output => {
        assert.equal(output.toString(), `/* adding a comment here */.image[big][state=red] {color: blue}`);
      });
  });

  it("respects pseudo selectors", async () => {
    return postcss([bemToBlocksPlugin])
      .process(".jobs-entry__image--big::before {color: blue}")
      .then(output => {
        assert.equal(output.toString(), ".image[big]::before {color: blue}");
      });
  });

  it("respects sibling selectors", async () => {
    return postcss([bemToBlocksPlugin])
      .process(".jobs-entry__image--big>.jobs-entry__image--small {color: blue}")
      .then(output => {
        assert.equal(output.toString(), ".image[big]>.image[small] {color: blue}");
      });
  });

  it("respects scss imports", async () => {
    return postcss([bemToBlocksPlugin])
      .process(`@import "restyle"; .jobs-entry__image--big[state=red] {color: blue}`)
      .then(output => {
        assert.equal(output.toString(), `@import "restyle"; .image[big][state=red] {color: blue}`);
      });
  });

  it("respects scss nesting", async () => {
    return postcss([bemToBlocksPlugin])
      .process(`@import "restyle"; .jobs-entry__image--big[state=red] {color: blue}`)
      .then(output => {
        assert.equal(output.toString(), `@import "restyle"; .image[big][state=red] {color: blue}`);
      });
  });

  it("other scss syntax", async () => {
    return postcss([bemToBlocksPlugin])
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
      });
  });

  it("replaces substates correctly", async () => {
    return postcss([bemToBlocksPlugin])
      .process(`.jobs-entry__image--size-big {color: blue}
      .jobs-entry__image--size-small {color: red}`)
      .then(output => {
        assert.equal(output.toString(), `.image[size="big"] {color: blue}
      .image[size="small"] {color: red}`);
      });
  });

  it("replaces substates correctly when the modifier is on the block", async () => {
    return postcss([bemToBlocksPlugin])
      .process(`.jobs-entry--size-big {color: blue}
      .jobs-entry--size-small {color: red}`)
      .then(output => {
        assert.equal(output.toString(), `:scope[size="big"] {color: blue}
      :scope[size="small"] {color: red}`);
      });
  });

  it("calls inquirer for user input", async() => {

    let stub = sinon.stub(inquirer, "prompt");
    // disabling the rule as it expects a Promise<unknown> & {ui:PromptUI}
    /* tslint:disable:prefer-unknown-to-any */
    stub.onCall(0).returns({block: "my-block"} as any);
    stub.onCall(1).returns({element: "my-elem"} as any);
    stub.onCall(2).returns({modifier: "my-mod"} as any);
    return postcss([bemToBlocksPlugin])
      .process(`.CLASSINCAPSTHATISNOTBEM {color: blue}`)
      .then((output) => {
        assert.equal(output.css, ".my-elem[my-mod] {color: blue}");
        assert.equal(stub.calledThrice, true);

      });
  });
});

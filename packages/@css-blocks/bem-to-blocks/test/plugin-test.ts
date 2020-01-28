import { assert } from "chai";
import * as inquirer from "inquirer";
import * as sinon from "sinon";

import { processBEMContents } from "../src";

describe("converts BEM to blocks", () => {

  it("converts simple classes to blocks", async () => {
    let result = await processBEMContents(
      "jobs-entry.css",
      ".jobs-entry__image--inverse-red {color: blue}",
    );

    assert.equal(result, ".image[inverse-red] {color: blue}");
  });

  it("converts a simple block", async () => {
    let output = await processBEMContents(
      "nav.css",
      `
        .nav { }
        .nav--open { }
        .nav__item { }
        .nav__item--is-selected { }
      `,
    );
    assert.equal(
      output.trim(),
      `
        :scope { }
        :scope[open] { }
        .item { }
        .item[selected] { }
      `.trim(),
    );
  });

  it("existing attributes remain unchanged", async () => {
    let output = await processBEMContents(
      "test-existing-attributes.css",
      ".jobs-entry__image[state=red] {color: blue}",
    );

    assert.equal(output, ".image[state=red] {color: blue}");
  });

  it("selector has attributes and a modifier", async () => {
    let output = await processBEMContents(
      "attributes-with-modifier.css",
      ".jobs-entry__image--big[state=red] {color: blue}",
    );

    assert.equal(output, ".image[big][state=red] {color: blue}");
  });

  it("comments are left as is", async () => {
    let output = await processBEMContents(
      "comments-test.css",
      "/* adding a comment here */.jobs-entry__image--big[state=red] {color: blue}",
    );

    assert.equal(output, `/* adding a comment here */.image[big][state=red] {color: blue}`);
  });

  it("respects pseudo selectors", async () => {
    let output = await processBEMContents(
      "pseudo-selectors.css",
      ".jobs-entry__image--big::before {color: blue}",
    );

    assert.equal(output, ".image[big]::before {color: blue}");
  });

  it("respects child selectors", async () => {
    let output = await processBEMContents(
      "sibling-selectors.css",
      ".jobs-entry__image--big > .jobs-entry__image--small {color: blue}",
    );

    assert.equal(output, ".image[big] > .image[small] {color: blue}");
  });

  it("respects scss imports", async () => {
    let output = await processBEMContents(
      "imports.scss",
      `@import "restyle"; .jobs-entry__image--big[state=red] {color: blue}`,
    );

    assert.equal(output, `@import "restyle"; .image[big][state=red] {color: blue}`);
  });

  it.skip("respects scss nesting", async () => {
    let output = await processBEMContents(
      "nesting.scss",
      `.jobs-entry__image { &--big {color: blue} }`,
    );

    assert.equal(output, `.image { &[big] {color: blue} }`);
  });

  it("other scss syntax", async () => {
    let output = await processBEMContents(
      "misc.scss",
      `
      @mixin animations() {
        @keyframes animation1 {
          from { transform: scale(0);}
          to { transform: scale(1.15); }
        }

        @keyframes animation2 {
          from { transform: scale(1.15);}
          to { transform: scale(1); }
        }
      }`,
    );

    assert.equal(
      output.trim(),
      `@mixin animations() {
        @keyframes animation1 {
          from { transform: scale(0);}
          to { transform: scale(1.15); }
        }

        @keyframes animation2 {
          from { transform: scale(1.15);}
          to { transform: scale(1); }
        }
      }`.trim(),
    );
  });

  it("replaces substates correctly", async () => {
    let output = await processBEMContents(
      "substates.scss",
      `.jobs-entry__image--size-big {color: blue}
      .jobs-entry__image--size-small {color: red}`,
    );

    assert.equal(output, `.image[size="big"] {color: blue}
      .image[size="small"] {color: red}`);
  });

  it("replaces substates correctly when the modifier is on the block", async () => {
    let output = await processBEMContents(
      "substates.scss",
      `.jobs-entry--size-big {color: blue}
      .jobs-entry--size-small {color: red}`,
    );

    assert.equal(output, `:scope[size="big"] {color: blue}
      :scope[size="small"] {color: red}`);
  });

  it("calls inquirer for user input", async() => {
    let stub = sinon.stub(inquirer, "prompt");
    // disabling the rule as it expects a Promise<unknown> & {ui:PromptUI}
    /* tslint:disable:prefer-unknown-to-any */
    stub.onCall(0).returns({block: "my-block"} as any);
    stub.onCall(1).returns({element: "my-elem"} as any);
    stub.onCall(2).returns({modifier: "my-mod"} as any);
    let output = await processBEMContents(
      "interactive-feedback.scss",
      `.CLASSINCAPSTHATISNOTBEM {color: blue}`,
    );

    assert.equal(output, `.my-elem[my-mod] {color: blue}`);
    assert.equal(stub.calledThrice, true);
  });
});

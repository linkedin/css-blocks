// import { assert } from "chai";
// import { suite, test } from "mocha-typescript";
// import * as postcss from "postcss";
// import { Block, Block } from "../../../src";
// import { Style } from "../../../src/Block/Style";

// class TestNode extends Style<
//   TestNode,   // Self
//   Block, // Root
//   TestNode, // Parent
//   TestSink    // Children
// > {
//   protected newChild(name: string) { return new TestSink(name, this); }
//   cssClass() { return this.name; }
//   asSource() { return this.name; }
//   asSourceAttributes() { return []; }
//   lookup(): undefined { return undefined; }
// }

// class TestSink extends SinkStyle<
//   TestSink,   // Self
//   TestSource, // Root
//   TestNode    // Parent
// > {
//   cssClass() { return this.name; }
//   asSource() { return this.name; }
//   asSourceAttributes() { return []; }
// }

// @suite("Style Node")
// export class StyleNodeTests {

//   // TODO: Make better tests
//   @test "addRuleset saves property concerns for multiple rulesets"() {
//     let block = new Block("my-block", "my-block-id");
//     let source = new BlockClass("my-source", block);
//     assert.equal(source.parent, null);
//     assert.equal(source.base, undefined);
//     assert.equal(source.root, block);
//     assert.deepEqual(source.resolveInheritance(), []);
//     postcss.parse(`
//       .foo {
//         display: inline;
//         float: left;
//       }
//       .bar {
//         display: block;
//         float: right;
//         color: red;
//       }
//       .baz::after {
//         background: blue;
//       }
//     `).walkRules(source.rulesets.addRuleset.bind(source.rulesets, "file.css"));

//     assert.deepEqual([...source.rulesets.getProperties()], ["display", "float", "color"]);
//     assert.deepEqual([...source.rulesets.getProperties("::after")], ["background-color", "background"]);
//     assert.deepEqual([...source.rulesets.getPseudos()], ["::self", "::after"]);
//     assert.deepEqual(source.rulesets.getRulesets("display").size, 2);
//     assert.deepEqual(source.rulesets.getRulesets("background-color").size, 1);
//   }

// }

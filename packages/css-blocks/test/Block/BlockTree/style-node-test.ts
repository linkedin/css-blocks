import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import {
  SinkStyle,
  SourceStyle,
  StyleNode,
} from "../../../src/Block/BlockTree";

class TestSource extends SourceStyle<
  TestSource, // Self
  TestNode    // Children
> {
  newChild(name: string) { return new TestNode(name, this); }
  cssClass() { return this.name; }
  asSource() { return this.name; }
  asSourceAttributes() { return []; }
  lookup(): undefined { return undefined; }
}

class TestNode extends StyleNode<
  TestNode,   // Self
  TestSource, // Root
  TestSource, // Parent
  TestSink    // Children
> {
  newChild(name: string) { return new TestSink(name, this); }
  cssClass() { return this.name; }
  asSource() { return this.name; }
  asSourceAttributes() { return []; }
  lookup(): undefined { return undefined; }
}

class TestSink extends SinkStyle<
  TestSink,   // Self
  TestSource, // Root
  TestNode    // Parent
> {
  cssClass() { return this.name; }
  asSource() { return this.name; }
  asSourceAttributes() { return []; }
}

@suite("Style Node")
export class StyleNodeTests {

  // TODO: Make better tests
  @test "addRuleset saves property concerns for multiple rulesets"() {
    let source = new TestSource("my-source");
    assert.equal(source.parent, null);
    assert.equal(source.base, undefined);
    assert.equal(source.root, source);
    assert.deepEqual(source.resolveInheritance(), []);
    postcss.parse(`
      .foo {
        display: inline;
        float: left;
      }
      .bar {
        display: block;
        float: right;
        color: red;
      }
      .baz::after {
        background: blue;
      }
    `).walkRules(source.rulesets.addRuleset.bind(source.rulesets, "file.css"));

    assert.deepEqual([...source.rulesets.getProperties()], ["display", "float", "color"]);
    assert.deepEqual([...source.rulesets.getProperties("::after")], ["background-color", "background"]);
    assert.deepEqual([...source.rulesets.getPseudos()], ["::self", "::after"]);
    assert.deepEqual(source.rulesets.getRulesets("display").size, 2);
    assert.deepEqual(source.rulesets.getRulesets("background-color").size, 1);
  }

}

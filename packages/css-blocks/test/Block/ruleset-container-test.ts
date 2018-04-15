import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { postcss } from "opticss";

import { Block } from "../../src";

@suite("Ruleset Containers")
export class RulesetContainerTests {
  @test "addRuleset saves property concerns for multiple rulesets"() {
    let b = new Block("name", "filepath");
    let c = b.ensureClass("test");
    let rulesets = c.rulesets;
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
    `).walkRules(rulesets.addRuleset.bind(rulesets, "file.css"));

    assert.deepEqual([...rulesets.getProperties()], ["display", "float", "color"]);
    assert.deepEqual([...rulesets.getProperties("::after")], ["background-color", "background"]);
    assert.deepEqual([...rulesets.getPseudos()], ["::self", "::after"]);
    assert.deepEqual(rulesets.getRulesets("display").size, 2);
    assert.deepEqual(rulesets.getRulesets("background-color").size, 1);
  }

}

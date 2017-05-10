import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import * as postcss from "postcss";

import { Plugin } from "../src/Plugin";
import { Block } from "../src/Block";
import { PluginOptions } from "../src/Options";
import { QueryKeySelector } from "../src/query";

type BlockAndRoot = [Block, postcss.Container];

@suite("Querying")
export class KeyQueryTests {
  private parseBlock(css: string, filename: string, opts?: PluginOptions): Promise<BlockAndRoot> {
    let plugin = new Plugin(postcss, opts);
    let root = postcss.parse(css, {from: filename});
    return plugin.extractBlockDefinition(root, filename, "query-test", false).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }
  @test "the block as a key selector"() {
    let css = `:block { color: red; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let q = new QueryKeySelector(block);
        let result = q.execute(root);
        assert.equal(result.key.length, 1);
    });
  }
  @test "handles psuedoelements"() {
    let css = `:block { color: red; }
               :block::before { content: 'b'; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let q = new QueryKeySelector(block);
        let result = q.execute(root);
        assert.equal(result.key.length, 1);
        assert.equal(result["::before"].length, 1);
    });
  }
  @test "finds states as key selector"() {
    let css = `:state(foo) { color: red; }
               :state(foo) .a { width: 100%; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let q = new QueryKeySelector(block.states[0]);
        let result = q.execute(root);
        assert.equal(result.key.length, 1);
    });
  }
  @test "finds classes as key selector"() {
    let css = `:state(foo) { color: red; }
               :state(foo) .a { width: 100%; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let q = new QueryKeySelector(block.classes[0]);
        let result = q.execute(root);
        assert.equal(result.key.length, 1);
    });
  }
  @test "finds classes as key selector with substates"() {
    let css = `.a { color: red; }
               .a:substate(foo) { width: 100%; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let q = new QueryKeySelector(block.classes[0]);
        let result = q.execute(root);
        assert.equal(result.key.length, 1);
    });
  }
  @test "finds substates as key selector"() {
    let css = `.b:substate(foo) { color: red; }
               .a:substate(foo) { width: 100%; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let q = new QueryKeySelector(block.classes[0].states[0]);
        let result = q.execute(root);
        assert.equal(result.key.length, 1);
    });
  }
}
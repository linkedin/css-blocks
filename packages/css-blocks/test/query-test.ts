import { OptionsReader } from '../src/OptionsReader';
import { assert } from "chai";
import { suite, test, only } from "mocha-typescript";
import * as postcss from "postcss";

import BlockParser from "../src/BlockParser";
import { BlockFactory } from "../src/BlockFactory";
import { Block } from "../src/Block";
import { PluginOptions } from "../src/options";
import { QueryKeySelector } from "../src/query";

type BlockAndRoot = [Block, postcss.Container];

@suite("Querying")
export class KeyQueryTests {
  private parseBlock(css: string, filename: string, opts?: PluginOptions): Promise<BlockAndRoot> {
    let options: PluginOptions = opts || {};
    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader, postcss);
    let blockParser = new BlockParser(options, factory);
    let root = postcss.parse(css, {from: filename});
    return blockParser.parse(root, filename, "query-test").then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }
  @test "the block as a key selector"() {
    let css = `.root { color: red; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let q = new QueryKeySelector(block.rootClass);
        let result = q.execute(root);
        assert.equal(result.main.length, 1);
    });
  }
  @test "handles psuedoelements"() {
    let css = `.root { color: red; }
               .root::before { content: 'b'; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let q = new QueryKeySelector(block.rootClass);
        let result = q.execute(root);
        assert.equal(result.main.length, 1);
        assert.equal(result.other["::before"].length, 1);
    });
  }
  @test "finds states as key selector"() {
    let css = `[state|foo] { color: red; }
               [state|foo] .a { width: 100%; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let state = block.rootClass.allStates()[0];
        assert.equal(state.asSource(), "[state|foo]");
        let q = new QueryKeySelector(state);
        let result = q.execute(root);
        assert.equal(result.main.length, 1);
    });
  }
  @test "finds classes as key selector"() {
    let css = `[state|foo] { color: red; }
               [state|foo] .a { width: 100%; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let q = new QueryKeySelector(block.classes[1]);
        let result = q.execute(root);
        assert.equal(result.main.length, 1);
    });
  }
  @test "finds classes as key selector with class states"() {
    let css = `.a { color: red; }
               .a[state|foo] { width: 100%; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let q = new QueryKeySelector(block.classes[1]);
        let result = q.execute(root);
        assert.equal(result.main.length, 1);
    });
  }

  @test "finds class states as key selector"() {
    let css = `.b[state|foo] { color: red; }
               .a[state|foo] { width: 100%; }`;
    let filename = "query-test.css";
    return this.parseBlock(css, filename).then(([block, root]) => {
        let state = block.classes[1].getState("foo")!;
        assert.equal(state.asSource(), ".b[state|foo]");
        let q = new QueryKeySelector(state);
        let result = q.execute(root);
        assert.deepEqual(result.main.length, 1);
    });
  }
}

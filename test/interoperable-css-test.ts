//import { suite, test, slow, timeout, skip, only } from "mocha-typescript";
//declare function require(name:string):any;
import { suite, test } from "mocha-typescript";
import { assert } from "chai";
import { Block, BlockObject } from "../src/Block";
import { OptionsReader } from "../src/options";
import iCssAdapter, { ExportDictionary }  from "../src/iCssAdapter";
import BEMProcessor from "./util/BEMProcessor";

@suite("Interoperable CSS Adapter")
export class ICssAdapterTest {
  asExportDictionary(block: Block): ExportDictionary {
    let opts = new OptionsReader({});
    let dictionary: ExportDictionary = {};
    block.all().forEach((obj: BlockObject) => {
      dictionary[obj.localName()] = obj.cssClass(opts);
    });
    return dictionary;
  }
  @test "adapts :block"() {
    let block = new Block("foo", "foo.css");
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(":block"), "foo");
  }
  @test "adapts simple state"() {
    let block = new Block("foo", "foo.css");
    block.ensureState({name: "asdf"});
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles("[state|asdf]"), "foo--asdf");
  }
  @test "adapts exclusive state"() {
    let block = new Block("foo", "foo.css");
    block.ensureState({group: "theme", name: "fancy"});
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles("[state|theme=fancy]"), "foo--theme-fancy");
  }
  @test "adapts class"() {
    let block = new Block("foo", "foo.css");
    block.ensureClass("label");
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(".label"), "foo__label");
  }
  @test "adapts substate"() {
    let block = new Block("foo", "foo.css");
    let blockClass = block.ensureClass("label");
    blockClass.ensureState({name: "small"});
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(".label[substate|small]"), "foo__label--small");
  }
  @test "adapts exclusive substate"() {
    let block = new Block("foo", "foo.css");
    let blockClass = block.ensureClass("label");
    blockClass.ensureState({group: "font", name: "small"});
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(".label[substate|font=small]"), "foo__label--font-small");
  }
}

@suite("Interoperable CSS")
export class InteroperableCSSOutput extends BEMProcessor {
  @test "exports block name"() {
    let filename = "foo/bar/test-block.css";
    let inputCSS = `:block {color: red;}`;
    return this.process(filename, inputCSS, {interoperableCSS: true}).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ":export { block: test-block; }\n" +
        ".test-block { color: red; }\n"
      );
    });
  }
  @test "exports state names"() {
    let filename = "foo/bar/test-block.css";
    let inputCSS = `[state|red] {color: red;}
                    [state|theme=blue] {color: blue;}`;
    return this.process(filename, inputCSS, {interoperableCSS: true}).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ":export { block: test-block; theme-blue: test-block--theme-blue; red: test-block--red; }\n" +
        ".test-block--red { color: red; }\n" +
        ".test-block--theme-blue { color: blue; }\n"
      );
    });
  }
  @test "exports class names"() {
    let filename = "foo/bar/test-block.css";
    let inputCSS = `.a {color: red;}
                    .b {color: blue;}`;
    return this.process(filename, inputCSS, {interoperableCSS: true}).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ":export { block: test-block; a: test-block__a; b: test-block__b; }\n" +
        ".test-block__a { color: red; }\n" +
        ".test-block__b { color: blue; }\n"
      );
    });
  }
  @test "exports class states"() {
    let filename = "foo/bar/test-block.css";
    let inputCSS = `.a[substate|big] {color: red;}
                    .b[substate|big] {color: blue;}`;
    return this.process(filename, inputCSS, {interoperableCSS: true}).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ":export { block: test-block; a: test-block__a; a--big: test-block__a--big; b: test-block__b; b--big: test-block__b--big; }\n" +
        ".test-block__a--big { color: red; }\n" +
        ".test-block__b--big { color: blue; }\n"
      );
    });
  }
}
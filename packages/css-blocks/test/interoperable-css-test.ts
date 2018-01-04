//import { suite, test, slow, timeout, skip, only } from "mocha-typescript";
//declare function require(name:string):any;
import { suite, test, only } from "mocha-typescript";
import { assert } from "chai";
import { Block, Style } from "../src/Block";
import { OptionsReader } from "../src/OptionsReader";
import iCssAdapter, { ExportDictionary }  from "../src/iCssAdapter";
import BEMProcessor from "./util/BEMProcessor";

@suite("Interoperable CSS Adapter")
export class ICssAdapterTest {
  asExportDictionary(block: Block): ExportDictionary {
    let opts = new OptionsReader({});
    let dictionary: ExportDictionary = {};
    block.all().forEach((obj: Style) => {
      dictionary[obj.localName()] = obj.cssClass(opts);
    });
    return dictionary;
  }
  @test "adapts .root"() {
    let block = new Block("foo", "foo.css");
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(".root"), "foo");
  }
  @test "adapts simple state"() {
    let block = new Block("foo", "foo.css");
    block.rootClass._ensureState({name: "asdf"});
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles("[state|asdf]"), "foo--asdf");
  }
  @test "adapts exclusive state"() {
    let block = new Block("foo", "foo.css");
    block.rootClass._ensureState({group: "theme", name: "fancy"});
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles("[state|theme=fancy]"), "foo--theme-fancy");
  }
  @test "adapts class"() {
    let block = new Block("foo", "foo.css");
    block.ensureClass("label");
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(".label"), "foo__label");
  }
  @test "adapts class state"() {
    let block = new Block("foo", "foo.css");
    let blockClass = block.ensureClass("label");
    blockClass._ensureState({name: "small"});
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(".label[state|small]"), "foo__label--small");
  }
  @test "adapts exclusive class state"() {
    let block = new Block("foo", "foo.css");
    let blockClass = block.ensureClass("label");
    blockClass._ensureState({group: "font", name: "small"});
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(".label[state|font=small]"), "foo__label--font-small");
  }
}

@suite("Interoperable CSS")
export class InteroperableCSSOutput extends BEMProcessor {
  @test "exports block name"() {
    let filename = "foo/bar/test-block.css";
    let inputCSS = `.root {color: red;}`;
    return this.process(filename, inputCSS, {interoperableCSS: true}).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ":export { root: test-block; }\n" +
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
        ":export { root: test-block; red: test-block--red; theme-blue: test-block--theme-blue; }\n" +
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
        ":export { root: test-block; a: test-block__a; b: test-block__b; }\n" +
        ".test-block__a { color: red; }\n" +
        ".test-block__b { color: blue; }\n"
      );
    });
  }
  @test "exports class states"() {
    let filename = "foo/bar/test-block.css";
    let inputCSS = `.a[state|big] {color: red;}
                    .b[state|big] {color: blue;}`;
    return this.process(filename, inputCSS, {interoperableCSS: true}).then((result) => {
      assert.deepEqual(
        result.css.toString(),
        ":export { root: test-block; a: test-block__a; a--big: test-block__a--big; b: test-block__b; b--big: test-block__b--big; }\n" +
        ".test-block__a--big { color: red; }\n" +
        ".test-block__b--big { color: blue; }\n"
      );
    });
  }
}

//import { suite, test, slow, timeout, skip, only } from "mocha-typescript";
//declare function require(name:string):any;
import { suite, test } from "mocha-typescript";
import { assert } from "chai";
import { Block, BlockObject } from "../src/Block";
import { OptionsReader } from "../src/options";
import iCssAdapter, { ExportDictionary }  from "../src/iCssAdapter";

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
  @test "adapts simple :state"() {
    let block = new Block("foo", "foo.css");
    block.ensureState({name: "asdf"})
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(":state(asdf)"), "foo--asdf");
  }
  @test "adapts exclusive :state"() {
    let block = new Block("foo", "foo.css");
    block.ensureState({group: "theme", name: "fancy"})
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(":state(theme fancy)"), "foo--theme-fancy");
  }
  @test "adapts element"() {
    let block = new Block("foo", "foo.css");
    block.ensureElement("label")
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(".label"), "foo__label");
  }
  @test "adapts substate"() {
    let block = new Block("foo", "foo.css");
    let element = block.ensureElement("label")
    element.ensureState({name: "small"});
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(".label:substate(small)"), "foo__label--small");
  }
  @test "adapts exclusive substate"() {
    let block = new Block("foo", "foo.css");
    let element = block.ensureElement("label")
    element.ensureState({group: "font", name: "small"});
    let styles = iCssAdapter(this.asExportDictionary(block));
    assert.equal(styles(".label:substate(font small)"), "foo__label--font-small");
  }
}

import {
  POSITION_UNKNOWN,
} from "@opticss/element-analysis";
import {
  isAndExpression,
  Template,
} from "@opticss/template-api";
import {
  clean,
  whatever,
} from "@opticss/util";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { Optimizer } from "opticss";
import * as postcss from "postcss";

import { AttrValue, Block, BlockClass } from "../src/Block";
import { BlockCompiler } from "../src/BlockCompiler";
import { BlockFactory } from "../src/BlockParser";
import { TemplateAnalysis } from "../src/TemplateAnalysis";
import { ElementAnalysis } from "../src/TemplateAnalysis/ElementAnalysis";
import { StyleMapping } from "../src/TemplateRewriter/StyleMapping";
import { normalizeOptions } from "../src/normalizeOptions";
import { Options } from "../src/options";

type BlockAndRoot = [Block, postcss.Container];

type Analysis = TemplateAnalysis<"Opticss.Template">;

@suite("Optimization")
export class TemplateAnalysisTests {
  private parseBlock(css: string, filename: string, opts?: Options, blockName = "optimized"): Promise<BlockAndRoot> {
    let options = normalizeOptions(opts);
    let factory = new BlockFactory(options, postcss);
    let root = postcss.parse(css, {from: filename});
    return factory.parse(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }

  private useAttrs(element: ElementAnalysis<whatever, whatever, whatever>, klass: BlockClass) {
    for (let attribute of klass.getAttributes()) {
      if (attribute.hasResolvedValues()) {
        element.addDynamicGroup(klass, attribute, null);
      }
    }
    for (let attrs of klass.booleanAttributeValues()) {
      element.addStaticAttr(klass, attrs);
    }
  }
  private useBlockStyles(
    analysis: Analysis, block: Block, blockName: string,
    useAttrsCallback?: (container: BlockClass, element: ElementAnalysis<whatever, whatever, whatever>) => void,
  ) {
    analysis.blocks[blockName] = block;

    for (let c of block.classes) {
      let element = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(c);
      if (useAttrsCallback) {
        useAttrsCallback(c, element);
      } else {
        this.useAttrs(element, c);
      }
      analysis.endElement(element);
    }
  }
  @test "optimizes css"() {
    let options = normalizeOptions({});
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let css = clean`
      :scope { color: blue; font-size: 20px; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; color: red; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", options).then(([block, _]) => {
      this.useBlockStyles(analysis, block, "", (container, el) => {
        if (container.asSource() === ".asdf") {
          el.addDynamicAttr(container, block.find(".asdf[state|larger]") as AttrValue, true);
        } else {
          this.useAttrs(el, container);
        }
      });
      let optimizerAnalysis = analysis.forOptimizer(options);
      let optimizer = new Optimizer({}, { rewriteIdents: { id: false, class: true} });
      let compiler = new BlockCompiler(postcss, options);
      let compiled = compiler.compile(block, block.stylesheet!, analysis);
      optimizer.addSource({
        content: compiled.toResult({to: "blocks/foo.block.css"}),
      });
      optimizer.addAnalysis(optimizerAnalysis);
      return optimizer.optimize("result.css").then((optimized) => {
        assert.deepEqual(optimized.output.content.toString().trim(), clean`
          .c { font-size: 20px; }
          .d { color: blue; }
          .e { color: red; }
          .f { font-size: 26px; }
        `);
        let blockMapping = new StyleMapping(optimized.styleMapping, [block], options, [analysis]);
        let it = analysis.elements.values();
        let element1 = it.next().value;
        let rewrite1 = blockMapping.rewriteMapping(element1);
        assert.deepEqual([...rewrite1.staticClasses].sort(), ["c", "d", "e"]);
        assert.deepEqual(rewrite1.dynamicClasses, []);
        let element2 = it.next().value;
        let rewrite2 = blockMapping.rewriteMapping(element2);
        assert.deepEqual([...rewrite2.staticClasses].sort(), ["c"]);
        assert.deepEqual([...rewrite2.dynamicClasses].sort(), ["e", "f"]);
        let expr = rewrite2.dynamicClass("e");
        if (isAndExpression(expr)) {
          assert.deepEqual(expr.and.length, 1);
          assert.deepEqual(expr.and[0], block.find(".asdf[state|larger]")!);
        } else {
          assert.isTrue(false, "Expected and expression");
        }
        // This isn't compiling right now :(
        // typedAssert.isType<Partial<BooleanExpression<Style>>, BooleanExpression<Style>, AndExpression<Style>>(isAndExpression, expr).and(expr => {
        //   assert.deepEqual(expr.and.length, 1);
        //   assert.deepEqual(expr.and[0], block.find(".asdf[state|larger]")!);
        // });
      });
    });
  }
}

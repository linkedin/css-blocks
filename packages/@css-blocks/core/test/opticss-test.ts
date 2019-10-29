import {
  POSITION_UNKNOWN,
} from "@opticss/element-analysis";
import {
  Template,
  isAndExpression,
} from "@opticss/template-api";
import {
  clean,
} from "@opticss/util";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { Optimizer } from "opticss";
import { postcss } from "opticss";

import { Analysis, Analyzer } from "../src/Analyzer";
import { ElementAnalysis } from "../src/Analyzer";
import { BlockCompiler } from "../src/BlockCompiler";
import { AttrValue, Block, BlockClass } from "../src/BlockTree";
import { resolveConfiguration } from "../src/configuration";
import { StyleMapping } from "../src/TemplateRewriter/StyleMapping";

@suite("Optimization")
export class TemplateAnalysisTests {

  private useAttrs(element: ElementAnalysis<unknown, unknown, unknown>, klass: BlockClass) {
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
    analysis: Analysis<"Opticss.Template">, block: Block, blockName: string,
    useAttrsCallback?: (container: BlockClass, element: ElementAnalysis<unknown, unknown, unknown>) => void,
  ) {
    analysis.addBlock(blockName, block);

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
    let config = resolveConfiguration({});
    let info = new Template("templates/my-template.hbs");
    let self = this;
    let filename = "blocks/foo.block.css";
    let css = clean`
      :scope { block-alias: my-foo-alias "namewith-quotes"; color: blue; font-size: 20px; }
      :scope[foo] { block-alias: my-foo-alias-red; color: red; }
      .asdf { font-size: 20px; }
      .asdf[larger] { font-size: 26px; color: red; }
    `;
    class TestAnalyzer extends Analyzer<"Opticss.Template"> {
      analyze(): Promise<TestAnalyzer> {
        let analysis = this.newAnalysis(info);
        let root = postcss.parse(css, { from: filename });

        return this.blockFactory.parse(root, filename, "optimized").then((block: Block) => {
          self.useBlockStyles(analysis, block, "", (container, el) => {
            if (container.asSource() === ".asdf") {
              el.addDynamicAttr(container, block.find(".asdf[larger]") as AttrValue, true);
            } else {
              self.useAttrs(el, container);
            }
          });
        }).then(() => {
          return this;
        });
      }
      get optimizationOptions() {
        return {
          rewriteIdents: {
            id: false,
            class: true,
            omitIdents: {
              id: [],
              class: [],
            },
          },
          analyzedAttributes: [],
          analyzedTagnames: false,
        };
      }
    }
    let analyzer = new TestAnalyzer();
    return analyzer.analyze().then(async (analyzer: TestAnalyzer) => {
      let compiler = new BlockCompiler(postcss, config);
      let optimizer = new Optimizer({}, { rewriteIdents: { id: false, class: true} });
      let block = await analyzer.blockFactory.getBlock(filename);
      let compiled = compiler.compile(block, block.stylesheet!, analyzer);
      for (let analysis of analyzer.analyses()) {
        let optimizerAnalysis = analysis.forOptimizer(config);
        optimizer.addSource({
          content: compiled.toResult({to: "blocks/foo.block.css"}),
        });
        optimizer.addAnalysis(optimizerAnalysis);
      }
      return optimizer.optimize("result.css").then(async (optimized) => {
        assert.deepEqual(optimized.output.content.toString().trim(), clean`
          .c { font-size: 20px; }
          .d { color: blue; }
          .e { color: red; }
          .f { font-size: 26px; }
        `);
        let analyses = analyzer.analyses();
        let blockMapping = new StyleMapping<"Opticss.Template">(optimized.styleMapping, [block], config, analyses);
        let it = analyses[0].elements.values();
        let element1 = it.next().value;
        let rewrite1 = blockMapping.rewriteMapping(element1);
        assert.deepEqual([...rewrite1.staticClasses].sort(), ["c", "d", "e", "my-foo-alias", "my-foo-alias-red", "namewith-quotes"]);
        assert.deepEqual(rewrite1.dynamicClasses, []);
        let element2 = it.next().value;
        let rewrite2 = blockMapping.rewriteMapping(element2);
        assert.deepEqual([...rewrite2.staticClasses].sort(), ["c"]);
        assert.deepEqual([...rewrite2.dynamicClasses].sort(), ["e", "f"]);
        let expr = rewrite2.dynamicClass("e");
        if (isAndExpression(expr)) {
          assert.deepEqual(expr.and.length, 1);
          assert.deepEqual(expr.and[0], block.find(".asdf[larger]")!);
        } else {
          assert.isTrue(false, "Expected and expression");
        }
        // This isn't compiling right now :(
        // typedAssert.isType<Partial<BooleanExpression<Style>>, BooleanExpression<Style>, AndExpression<Style>>(isAndExpression, expr).and(expr => {
        //   assert.deepEqual(expr.and.length, 1);
        //   assert.deepEqual(expr.and[0], block.find(".asdf[larger]")!);
        // });
      });
    });
  }
}

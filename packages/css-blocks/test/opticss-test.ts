import {
  POSITION_UNKNOWN,
} from "@opticss/element-analysis";
import {
  AndExpression,
  BooleanExpression,
  isAndExpression,
  Template,
} from "@opticss/template-api";
import {
  assert as typedAssert,
  clean,
  ObjectDictionary,
  whatever,
} from "@opticss/util";
import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { Optimizer } from "opticss";
import * as postcss from "postcss";

import { Block, BlockClass, State, Style } from "../src/Block";
import { BlockCompiler } from "../src/BlockCompiler";
import { BlockFactory } from "../src/BlockFactory";
import { BlockParser } from "../src/BlockParser";
import { OptionsReader } from "../src/OptionsReader";
import { TemplateAnalysis } from "../src/TemplateAnalysis";
import { ElementAnalysis } from "../src/TemplateAnalysis/ElementAnalysis";
import { StyleMapping } from "../src/TemplateRewriter/StyleMapping";
import { SubState } from "../src/index";
import { PluginOptions } from "../src/options";

type BlockAndRoot = [Block, postcss.Container];

type Analysis = TemplateAnalysis<"Opticss.Template">;

@suite("Optimization")
export class TemplateAnalysisTests {
  private parseBlock(css: string, filename: string, opts?: PluginOptions, blockName = "optimized"): Promise<BlockAndRoot> {
    let options: PluginOptions = opts || {};
    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader, postcss);
    let blockParser = new BlockParser(options, factory);
    let root = postcss.parse(css, {from: filename});
    return blockParser.parse(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }
  private useStates(element: ElementAnalysis<whatever, whatever, whatever>, stateContainer: BlockClass) {
    for (let groupName of stateContainer.getGroups()) {
      element.addDynamicGroup(stateContainer, stateContainer.resolveGroup(groupName) as ObjectDictionary<SubState>, null);
    }
    for (let state of stateContainer.booleanStates) {
      element.addStaticState(stateContainer, state);
    }
  }
  private useBlockStyles(
    analysis: Analysis, block: Block, blockName: string,
    useStatesCallback?: (container: BlockClass, element: ElementAnalysis<whatever, whatever, whatever>) => void,
  ) {
    analysis.blocks[blockName] = block;

    for (let c of block.classes) {
      let element = analysis.startElement(POSITION_UNKNOWN);
      element.addStaticClass(c);
      if (useStatesCallback) {
        useStatesCallback(c, element);
      } else {
        this.useStates(element, c);
      }
      analysis.endElement(element);
    }
  }
  @test "optimizes css"() {
    let options: PluginOptions = {};
    let reader = new OptionsReader(options);
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis(info);
    let css = clean`
      .root { color: blue; font-size: 20px; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; color: red; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      this.useBlockStyles(analysis, block, "", (container, el) => {
        if (container.asSource() === ".asdf") {
          el.addDynamicState(container, block.find(".asdf[state|larger]") as State, true);
        } else {
          this.useStates(el, container);
        }
      });
      let optimizerAnalysis = analysis.forOptimizer(reader);
      let optimizer = new Optimizer({}, { rewriteIdents: { id: false, class: true} });
      let compiler = new BlockCompiler(postcss, reader);
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
        let blockMapping = new StyleMapping(optimized.styleMapping, [block], reader, [analysis]);
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
        typedAssert.isType<BooleanExpression<Style>, AndExpression<Style>>(isAndExpression, expr).and(expr => {
          assert.deepEqual(expr.and.length, 1);
          assert.deepEqual(expr.and[0], block.find(".asdf[state|larger]")!);
        });
      });
    });
  }
}

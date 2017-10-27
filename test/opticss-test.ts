import BlockCompiler from '../src/BlockCompiler';
import { StyleMapping } from '../src/TemplateRewriter/StyleMapping';
import { assert } from "chai";
import { suite, test, only } from "mocha-typescript";
import * as postcss from 'postcss';
import { Optimizer, OptiCSSOptions } from "opticss";
import {
  SerializedTemplateAnalysis as SerializedOptimizedAnalysis,
  Template,
  TemplateInfo,
  TemplateIntegrationOptions,
  isAndExpression
} from "@opticss/template-api";
import {
  clean, isType as assertType
} from "@opticss/util";

import * as cssBlocks from '../src/errors';
import BlockParser from "../src/BlockParser";
import { BlockFactory } from "../src/Block/BlockFactory";
import { Importer, ImportedFile } from "../src/importing";
import { Block, BlockObject, BlockClass, State } from "../src/Block";
import { PluginOptions } from "../src/options";
import { OptionsReader } from "../src/OptionsReader";
import { SerializedTemplateAnalysis, TemplateAnalysis } from "../src/TemplateAnalysis";

import { MockImportRegistry } from "./util/MockImportRegistry";
import { assertParseError } from "./util/assertError";

type BlockAndRoot = [Block, postcss.Container];

type Analysis = TemplateAnalysis<"Opticss.Template">;

@suite("Optimization")
export class TemplateAnalysisTests {
  private parseBlock(css: string, filename: string, opts?: PluginOptions, blockName = "optimized"): Promise<BlockAndRoot> {
    let options: PluginOptions = opts || {};
    let factory = new BlockFactory(options, postcss);
    let blockParser = new BlockParser(postcss, options, factory);
    let root = postcss.parse(css, {from: filename});
    return blockParser.parse(root, filename, blockName).then((block) => {
      return <BlockAndRoot>[block, root];
    });
  }
  private useBlockStyles(analysis: Analysis, block: Block, blockName: string) {
    analysis.blocks[blockName] = block;
    analysis.startElement({});
    analysis.addStyle(block);
    for (let states of block.states.groupsOfStates()) {
      if (states.length > 1) {
        analysis.addExclusiveStyles(false, ...states);
      } else {
        analysis.addStyle(states[0], true);
      }
    }
    analysis.endElement();

    for (let c of block.classes) {
      analysis.startElement({});
      analysis.addStyle(c);
      for (let states of c.states.groupsOfStates()) {
        if (states.length > 1) {
          analysis.addExclusiveStyles(false, ...states);
        } else {
          analysis.addStyle(states[0], true);
        }
      }
      analysis.endElement();
    }
  }
  @test "optimizes css"() {
    let options: PluginOptions = {};
    let reader = new OptionsReader(options);
    let info = new Template("templates/my-template.hbs");
    let analysis = new TemplateAnalysis<"Opticss.Template">(info);
    let css = clean`
      .root { color: blue; font-size: 20px; }
      [state|foo] { color: red; }
      .asdf { font-size: 20px; }
      .asdf[state|larger] { font-size: 26px; color: red; }
    `;
    return this.parseBlock(css, "blocks/foo.block.css", reader).then(([block, _]) => {
      this.useBlockStyles(analysis, block, "");
      let optimizerAnalysis = analysis.forOptimizer(reader);
      let optimizer = new Optimizer({}, { rewriteIdents: { id: false, class: true} });
      let compiler = new BlockCompiler(postcss, reader);
      let compiled = compiler.compile(block, block.root!, analysis);
      optimizer.addSource({
        content: compiled.toResult({to: "blocks/foo.block.css"})
      });
      optimizer.addAnalysis(optimizerAnalysis);
      return optimizer.optimize("result.css").then((optimized) => {
        assert.deepEqual(optimized.output.content.toString().trim(), clean`
          .c { font-size: 20px; }
          .d { color: blue; }
          .e { color: red; }
          .f { font-size: 26px; }
        `);
        let blockMapping = new StyleMapping(optimized.styleMapping, reader);
        let it = analysis.elements.values();
        let element1 = it.next().value;
        let rewrite1 = blockMapping.rewriteMapping(element1);
        assert.deepEqual(rewrite1.staticClasses, []);
        assert.deepEqual([...rewrite1.dynamicClasses.keys()].sort(), ['c', 'd', 'e']);
        let element2 = it.next().value;
        let rewrite2 = blockMapping.rewriteMapping(element2);
        assert.deepEqual(rewrite2.staticClasses, []);
        assert.deepEqual([...rewrite2.dynamicClasses.keys()].sort(), ['c', 'e', 'f']);
        let expr = rewrite2.dynamicClasses.get('c')!;
        assertType(isAndExpression, expr).and(andExpr => {
          assert.deepEqual(andExpr.and.length, 1);
          assert.deepEqual(andExpr.and[0], block.find(".asdf")!);
        });
      });
    });
  }
}

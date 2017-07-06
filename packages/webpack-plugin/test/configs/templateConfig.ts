import * as webpack from "webpack";
import * as merge from "webpack-merge";
import * as postcss from "postcss";
import * as fs from "fs";
import * as path from "path";
import { config as defaultOutputConfig } from "./defaultOutputConfig";
import { CssBlocksPlugin, CssAssets } from "../../src/index";
import {
  Block,
  MultiTemplateAnalyzer,
  StyleAnalysis,
  BlockObject,
  BlockParser,
  TemplateInfo,
  MetaTemplateAnalysis,
  TemplateAnalysis,
  SerializedTemplateInfo,
  TemplateInfoFactory,
  TemplateInfoConstructor
} from "css-blocks";
import { BLOCK_FIXTURES_DIRECTORY } from "../util/testPaths";

class TestTemplateInfo extends TemplateInfo {
  index: number;
  constructor(identifier: string, index: number) {
    super(identifier);
    this.index = index;
  }
  serialize(): SerializedTemplateInfo {
    return {
      type: TestTemplateInfo.typeName,
      identifier: this.identifier,
      data: [ this.index ]
    };
  }
  static deserialize(identifier: string, index: number): TestTemplateInfo {
    return new TestTemplateInfo(identifier, index);
  }
  static typeName = "WebpackPlugin.TestTemplateInfo";
}

TemplateInfoFactory.register(TestTemplateInfo.typeName, TestTemplateInfo as TemplateInfoConstructor);

class TestAnalysis extends TemplateAnalysis<TestTemplateInfo> {
  blocks: { [name: string]: Block } = {};
  constructor(template: TestTemplateInfo) {
    super(template);
  }
  addBlock(name: string, block: Block) {
    this.blocks[name] = block;
  }
  eachAnalysis(cb: (a: StyleAnalysis) => void) {
    cb(this);
  }
  wasFound(_style: BlockObject) {
    return false;
  }
  isDynamic(_style: BlockObject) {
    return false;
  }
  areCorrelated(..._styles: BlockObject[]) {
    return false;
  }
  blockDependencies() {
    let deps = new Set<Block>();
    Object.keys(this.blocks).forEach(k => {
      deps.add(this.blocks[k]);
    });
    return deps;
  }
  transitiveBlockDependencies() {
    return this.blockDependencies();
  }
}

class TestMetaTemplateAnalysis extends MetaTemplateAnalysis<TestTemplateInfo> {
  analyses: TemplateAnalysis<TestTemplateInfo>[];
  constructor() {
    super();
    this.analyses.push(new TestAnalysis(new TestTemplateInfo("test.html", 1)));
  }
}

function getBlock(name: string): Promise<Block> {
  let parser = new BlockParser(postcss);
  let filename = path.resolve(BLOCK_FIXTURES_DIRECTORY, name + ".block.css");
  return postcss().process(fs.readFileSync(filename)).then(result => {
    if (result.root) {
      return parser.parse(result.root, filename, name);
    } else {
      throw result.warnings().join("\n");
    }
  });
}

class TestTemplateAnalyzer implements MultiTemplateAnalyzer<TemplateInfo> {
  analysis: TestMetaTemplateAnalysis;
  constructor(a: TestMetaTemplateAnalysis) {
    this.analysis = a;
  }
  analyze(): Promise<MetaTemplateAnalysis<TemplateInfo>> {
    return Promise.resolve(this.analysis);
  }
  reset() {
    // pass
  }
}

export function config(): Promise<webpack.Configuration> {
  let block1 = getBlock("concat-1");
  let block2 = getBlock("concat-2");
  return Promise.all([block1, block2]).then(blocks => {
    let analysis = new TestMetaTemplateAnalysis();
    blocks.forEach((b, i) => {
      analysis.analyses[0].blocks[`concat-${i}`] = b;
    });

    let cssBlocks = new CssBlocksPlugin({
      analyzer: new TestTemplateAnalyzer(analysis)
    });

    return merge(defaultOutputConfig(), {
      entry: "./test/fixtures/javascripts/foo.js",
      output: {
        filename: "bundle.template.js"
      },
      module: {
        rules: [
          {
            test: /\.css$/,
            exclude: /\.block\.css$/,
            use: { loader: "css-loader" }
          }
        ]
      },
      plugins: [
        cssBlocks,
        new CssAssets({
          emitSourceMaps: true,
          inlineSourceMaps: false
        })
      ]
    });
  });
}
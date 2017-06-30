import * as webpack from "webpack";
import * as merge from "webpack-merge";
import * as postcss from "postcss";
import * as fs from "fs";
import * as path from "path";
import { config as defaultOutputConfig } from "./defaultOutputConfig";
import { CssBlocksPlugin } from "../../src/Plugin";
import { Block, TemplateAnalyzer, StyleAnalysis, BlockObject, BlockParser } from "css-blocks";
import { BLOCK_FIXTURES_DIRECTORY } from "../util/testPaths";

// interface TestRewriterResult {
//   blocks?: Block[];
// }

class TestAnalysis implements StyleAnalysis {
  blocks: { [name: string]: Block } = {};
  get template() {
    return {
      path: "asdf.html"
    };
  }
  addBlock(name: string, block: Block) {
    this.blocks[name] = block;
  }
  get stylesFound() {
    return [];
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

class TestTemplateAnalyzer implements TemplateAnalyzer {
  analysis: TestAnalysis;
  constructor(a: TestAnalysis) {
    this.analysis = a;
  }
  analyze(): Promise<TestAnalysis> {
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
    let analysis = new TestAnalysis();
    blocks.forEach((b, i) => analysis.addBlock(`concat-${i}`, b));

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
        cssBlocks
      ]
    });
  });
}
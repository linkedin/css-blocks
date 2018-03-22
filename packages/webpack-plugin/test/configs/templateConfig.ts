import {
  POSITION_UNKNOWN,
} from "@opticss/element-analysis";
import {
  SerializedTemplateInfo,
  TemplateInfo,
  TemplateInfoFactory,
} from "@opticss/template-api";
import { whatever } from "@opticss/util";
import {
  BlockFactory,
  Analyzer,
  resolveConfiguration as resolveBlocksConfiguration,
} from "css-blocks";
import * as path from "path";
import * as postcss from "postcss";
import { Configuration as WebpackConfiguration } from "webpack";
import * as merge from "webpack-merge";

import { CssAssets, CssBlocksPlugin } from "../../src/index";
import { BLOCK_FIXTURES_DIRECTORY } from "../util/testPaths";

import { config as defaultOutputConfig } from "./defaultOutputConfig";

declare module "@opticss/template-api" {
  interface TemplateTypes {
    "WebpackPlugin.TestTemplate": TestTemplateInfo;
  }
}

export class TestTemplateInfo implements TemplateInfo<"WebpackPlugin.TestTemplate"> {
  type: "WebpackPlugin.TestTemplate";
  identifier: string;
  index: number;
  constructor(identifier: string, index: number) {
    this.type = "WebpackPlugin.TestTemplate";
    this.identifier = identifier;
    this.index = index;
  }
  serialize(): SerializedTemplateInfo<"WebpackPlugin.TestTemplate"> {
    return {
      type: this.type,
      identifier: this.identifier,
      data: [ this.index ],
    };
  }
  static deserialize(identifier: string, index: whatever): TestTemplateInfo {
    return new TestTemplateInfo(identifier, <number>index);
  }
}

TemplateInfoFactory.constructors["WebpackPlugin.TestTemplate"] = TestTemplateInfo.deserialize;

class TestAnalyzer extends Analyzer<"WebpackPlugin.TestTemplate"> {
  constructor() {
    super();
    this.newAnalysis(new TestTemplateInfo("test.html", 1));
  }
  analyze(): Promise<Analyzer<"WebpackPlugin.TestTemplate">>{
    return Promise.resolve(this);
  }
}

class TestTemplateAnalyzer extends Analyzer<"WebpackPlugin.TestTemplate"> {
  blockFactory: BlockFactory;
  analysis: TestAnalyzer;
  constructor(a: TestAnalyzer, factory: BlockFactory) {
    super();
    this.analysis = a;
    this.blockFactory = factory;
  }
  analyze(): Promise<Analyzer<"WebpackPlugin.TestTemplate">> {
    return Promise.resolve(this.analysis);
  }
  reset() {
    // pass
  }
}

function fixture(name: string) {
  return path.resolve(BLOCK_FIXTURES_DIRECTORY, name + ".block.css");
}

export function config(): Promise<WebpackConfiguration> {
  let blockOpts = resolveBlocksConfiguration({});
  let factory = new BlockFactory(blockOpts, postcss);
  let block1 = factory.getBlock(fixture("concat-1"));
  let block2 = factory.getBlock(fixture("concat-2"));
  return Promise.all([block1, block2]).then(blocks => {
    let analysis = new TestAnalyzer();
    blocks.forEach((b, i) => {
      analysis.eachAnalysis(a => {
        a.blocks[`concat-${i}`] = b;
        let el = a.startElement(POSITION_UNKNOWN);
        el.addStaticClass(b.rootClass);
        a.endElement(el);
      });
    });

    let cssBlocks = new CssBlocksPlugin({
      outputCssFile: "css-blocks.css",
      analyzer: new TestTemplateAnalyzer(analysis, factory),
    });

    return merge(defaultOutputConfig(), {
      entry: "./test/fixtures/javascripts/foo.js",
      output: {
        filename: "bundle.template.js",
      },
      module: {
        rules: [
          {
            test: /\.css$/,
            exclude: /\.block\.css$/,
            use: { loader: "css-loader" },
          },
        ],
      },
      plugins: [
        cssBlocks,
        new CssAssets({
          emitSourceMaps: true,
          inlineSourceMaps: false,
        }),
      ],
    });
  });
}

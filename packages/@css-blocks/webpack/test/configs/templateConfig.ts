import { BlockFactory, resolveConfiguration } from "@css-blocks/core";
import {
  POSITION_UNKNOWN,
} from "@opticss/element-analysis";
import {
  SerializedTemplateInfo,
  TemplateInfo,
  TemplateInfoFactory,
} from "@opticss/template-api";
import { postcss } from "opticss";
import * as path from "path";
import { Configuration as WebpackConfiguration } from "webpack";
import * as merge from "webpack-merge";

import { CssAssets, CssBlocksPlugin } from "../../src/index";
import { TestAnalyzer } from "../util/TestAnalyzer";
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
  static deserialize(identifier: string, index: unknown): TestTemplateInfo {
    return new TestTemplateInfo(identifier, <number>index);
  }
}

TemplateInfoFactory.constructors["WebpackPlugin.TestTemplate"] = TestTemplateInfo.deserialize;

function fixture(name: string) {
  return path.resolve(BLOCK_FIXTURES_DIRECTORY, name + ".block.css");
}

export function config(): Promise<WebpackConfiguration> {
  let blockOpts = resolveConfiguration({});
  let factory = new BlockFactory(blockOpts, postcss);
  let block1 = factory.getBlock(fixture("concat-1"));
  let block2 = factory.getBlock(fixture("concat-2"));
  return Promise.all([block1, block2]).then(blocks => {
    let analyzer = new TestAnalyzer(new BlockFactory(blockOpts));
    analyzer.newAnalysis(new TestTemplateInfo("test.html", 1));
    blocks.forEach((b, i) => {
      analyzer.eachAnalysis(a => {
        a.addBlock(`concat-${i}`, b);
        let el = a.startElement(POSITION_UNKNOWN);
        el.addStaticClass(b.rootClass);
        a.endElement(el);
      });
    });

    let cssBlocks = new CssBlocksPlugin({
      outputCssFile: "css-blocks.css",
      analyzer,
    });

    let config = {
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
    };

    // The webpack types used by webpack-merge don't agree with ours.
    // tslint:disable-next-line:prefer-unknown-to-any
    return merge(defaultOutputConfig() as any, config as any) as any;
  });
}

import { OptionsReader } from '../src/OptionsReader';
import { assert } from "chai";
import { suite, test, skip } from "mocha-typescript";

import {
  BlockFactory,
  Syntax,
  Preprocessor,
  Preprocessors,
  ProcessedFile,
  annotateCssContentWithSourceMap,
  PluginOptions,
  CssBlockOptionsReadonly,
} from "../src/index";

import {
  MockImporter,
  MockImportRegistry
} from "./util/MockImportRegistry";
import { RawSourceMap } from "source-map";

@suite("Preprocessing")
export class PreprocessorTest {
  @test "raises an error if a file that isn't css is missing a preprocessor."() {
    let registry = new MockImportRegistry();
    registry.registerSource("foo.block.styl", `my-stylus-var = 10px`, Syntax.stylus);
    let options: PluginOptions = {
      importer: registry.importer()
    };
    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader);
    return factory.getBlock("foo.block.styl").then((_block) => {
      throw new Error("exception not raised!");
    },(reason: Error) => {
      assert.equal(reason.message, "No preprocessor provided for stylus.");
    });
  }

  @test "converts a file to css"() {
    let registry = new MockImportRegistry();
    registry.registerSource("foo.block.asdf", `lolwtf`, Syntax.other);
    let preprocessors: Preprocessors = {
      other: (_fullPath: string, content: string, _options: CssBlockOptionsReadonly, _sourceMap?: RawSourceMap | string) => {
        let file: ProcessedFile = {
          content: `.root { block-name: ${content}; color: red; }`
        };
        return Promise.resolve(file);
      }
    };
    let options: PluginOptions = {
      importer: registry.importer(),
      preprocessors
    };
    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader);
    return factory.getBlock("foo.block.asdf").then((block) => {
      assert.equal(block.identifier, "foo.block.asdf");
      assert.equal(block.name, "lolwtf");
    });
  }
  @test "processes css as a second pass when a css preprocessor is available."() {
    let registry = new MockImportRegistry();
    registry.registerSource("foo.block.asdf", `lolwtf`, Syntax.other);
    let preprocessors: Preprocessors = {
      other: (_fullPath: string, content: string, _options: CssBlockOptionsReadonly, _sourceMap?: RawSourceMap | string) => {
        let file: ProcessedFile = {
          content: `.root { block-name: ${content}; color: red; }`
        };
        return Promise.resolve(file);
      },
      css: (_fullPath: string, content: string, _options: CssBlockOptionsReadonly, _sourceMap?: RawSourceMap | string) => {
        let file: ProcessedFile = {
          content: `${content} .injected { width: 100%; }`
        };
        return Promise.resolve(file);
      }

    };
    let options: PluginOptions = {
      importer: registry.importer(),
      preprocessors
    };

    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader);
    return factory.getBlock("foo.block.asdf").then((block) => {
      assert.equal(block.identifier, "foo.block.asdf");
      assert.equal(block.name, "lolwtf");
      let injectedClass = block.find(".injected");
      assert.equal(injectedClass && injectedClass.asSource(), ".injected");
    });
  }
  @test "can disable preprocessor chaining."() {
    let registry = new MockImportRegistry();
    registry.registerSource("foo.block.asdf", `lolwtf`, Syntax.other);
    let preprocessors: Preprocessors = {
      other: (_fullPath: string, content: string, _options: CssBlockOptionsReadonly, _sourceMap?: RawSourceMap | string) => {
        let file: ProcessedFile = {
          content: `.root { block-name: ${content}; color: red; }`
        };
        return Promise.resolve(file);
      },
      css: (_fullPath: string, content: string, _options: CssBlockOptionsReadonly, _sourceMap?: RawSourceMap | string) => {
        let file: ProcessedFile = {
          content: `${content} .injected { width: 100%; }`
        };
        return Promise.resolve(file);
      }

    };
    let options: PluginOptions = {
      importer: registry.importer(),
      preprocessors,
      disablePreprocessChaining: true
    };

    let reader = new OptionsReader(options);
    let factory = new BlockFactory(reader);
    return factory.getBlock("foo.block.asdf").then((block) => {
      assert.equal(block.identifier, "foo.block.asdf");
      assert.equal(block.name, "lolwtf");
      let injectedClass = block.find(".injected");
      assert.isUndefined(injectedClass);
    });
  }
  @skip
  @test "handles input sourcemaps in final output sourcemap"() {
  }
}
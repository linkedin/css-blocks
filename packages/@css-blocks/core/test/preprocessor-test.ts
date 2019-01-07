import { assert } from "chai";
import { skip, suite, test } from "mocha-typescript";
import { RawSourceMap } from "source-map";

import {
  Preprocessors,
  ProcessedFile,
  ResolvedConfiguration,
  Syntax,
} from "../src";

import { setupImporting } from "./util/setupImporting";

@suite("Preprocessing")
export class PreprocessorTest {
  @test "raises an error if a file that isn't css is missing a preprocessor."() {
    let { factory, importer } = setupImporting();
    importer.registerSource("foo.block.styl", `my-stylus-var = 10px`, Syntax.stylus);
    return factory.getBlock("foo.block.styl").then(
      (_block) => {
        throw new Error("exception not raised!");
      },
      (reason: Error) => {
        assert.equal(reason.message, "No preprocessor provided for stylus.");
      });
  }

  @test "converts a file to css"() {
    let preprocessors: Preprocessors = {
      other: (_fullPath: string, content: string, _options: ResolvedConfiguration, _sourceMap?: RawSourceMap | string) => {
        let file: ProcessedFile = {
          content: `:scope { block-name: ${content}; color: red; }`,
        };
        return Promise.resolve(file);
      },
    };
    let { factory, importer } = setupImporting({preprocessors});
    importer.registerSource("foo.block.asdf", `lolwtf`, Syntax.other);
    return factory.getBlock("foo.block.asdf").then((block) => {
      assert.equal(block.identifier, "foo.block.asdf");
      assert.equal(block.name, "lolwtf");
    });
  }
  @test "processes css as a second pass when a css preprocessor is available."() {
    let preprocessors: Preprocessors = {
      other: (_fullPath: string, content: string, _options: ResolvedConfiguration, _sourceMap?: RawSourceMap | string) => {
        let file: ProcessedFile = {
          content: `:scope { block-name: ${content}; color: red; }`,
        };
        return Promise.resolve(file);
      },
      css: (_fullPath: string, content: string, _options: ResolvedConfiguration, _sourceMap?: RawSourceMap | string) => {
        let file: ProcessedFile = {
          content: `${content} .injected { width: 100%; }`,
        };
        return Promise.resolve(file);
      },

    };
    let { factory, importer } = setupImporting({preprocessors});
    importer.registerSource("foo.block.asdf", `lolwtf`, Syntax.other);
    return factory.getBlock("foo.block.asdf").then((block) => {
      assert.equal(block.identifier, "foo.block.asdf");
      assert.equal(block.name, "lolwtf");
      let injectedClass = block.find(".injected");
      assert.equal(injectedClass && injectedClass.asSource(), ".injected");
    });
  }
  @test "can disable preprocessor chaining."() {
    let preprocessors: Preprocessors = {
      other: (_fullPath: string, content: string, _options: ResolvedConfiguration, _sourceMap?: RawSourceMap | string) => {
        let file: ProcessedFile = {
          content: `:scope { block-name: ${content}; color: red; }`,
        };
        return Promise.resolve(file);
      },
      css: (_fullPath: string, content: string, _options: ResolvedConfiguration, _sourceMap?: RawSourceMap | string) => {
        let file: ProcessedFile = {
          content: `${content} .injected { width: 100%; }`,
        };
        return Promise.resolve(file);
      },

    };
    let opts = { preprocessors, disablePreprocessChaining: true };
    let { factory, importer } = setupImporting(opts);
    importer.registerSource("foo.block.asdf", `lolwtf`, Syntax.other);
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

import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { CSSBlocksJSXAnalyzer as Analyzer } from "../../src/Analyzer";
import { testParseFile as parseFile } from "../util";

const path = require("path");

@suite("Dependency Tree Crawling")
export class Test {

  @test "All blocks are discovered in multi-file app from entrypoint"() {
    let base = path.resolve(__dirname, "../../../test/fixtures/basic-multifile");
    return parseFile("index.tsx", { baseDir: base }).then((analyzer: Analyzer) => {
      assert.equal(analyzer.analysisCount(), 2);
      assert.equal(analyzer.getAnalysis(0).blockCount(), 1);
      assert.equal(analyzer.getAnalysis(1).blockCount(), 1);
      assert.equal(analyzer.styleCount(), 3);
    });
  }

  @test "Duplicate blocks are only parsed once"() {
    let base = path.resolve(__dirname, "../../../test/fixtures/duplicate-blocks-multifile");
    return parseFile("index.tsx", { baseDir: base }).then((analyzer: Analyzer) => {
      assert.equal(analyzer.analysisCount(), 2);
      assert.equal(analyzer.blockPromises.size, 1);
      assert.equal(analyzer.styleCount(), 2);
    });
  }

  @test "finds dependents of dependents"() {
    let base = path.resolve(__dirname, "../../../test/fixtures/deep-multifile");
    return parseFile("index.tsx", { baseDir: base }).then((analyzer: Analyzer) => {
      assert.equal(analyzer.analysisCount(), 3);
      assert.equal(analyzer.blockPromises.size, 3);
      assert.equal(analyzer.styleCount(), 4);
    });
  }

  @test "Conflicting local import names don't interfere with each other"() {
    let base = path.resolve(__dirname, "../../../test/fixtures/conflicting-local-multifile");
    return parseFile("index.tsx", { baseDir: base }).then((analyzer: Analyzer) => {
      assert.equal(analyzer.analysisCount(), 2);
      assert.equal(analyzer.blockPromises.size, 2);
      assert.equal(analyzer.styleCount(), 3);
    });
  }
}

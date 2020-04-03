
import { resolveConfiguration } from "@css-blocks/core";
import { assert, expect } from "chai";
import { EyeglassOptions } from "eyeglass";
import Eyeglass = require("eyeglass");
import * as fs from "fs";
import { Result } from "node-sass";
import SassImplementation = require("node-sass");
import * as path from "path";
import * as sinon from "sinon";

import { DirectoryScopedPreprocessor, adaptAll, adaptor } from "../src/";

const fakeSass = {
    render: sinon.spy(),
} as unknown as typeof SassImplementation;
const fakeEyeglass = sinon.spy() as unknown as typeof Eyeglass;

function fixture(relativePath: string): string {
  return path.resolve(__dirname, "..", "..", "test", "fixtures", relativePath);
}

describe("@css-blocks/eyeglass", async () => {

  afterEach(async () => {
    (fakeSass.render as unknown as sinon.SinonSpy).resetHistory();
    (fakeEyeglass as unknown as sinon.SinonSpy).resetHistory();
  });

  it("exports a function named adaptor that returns a function", async () => {
    expect(adaptor).to.be.a("function");
    expect(adaptor(fakeSass, fakeEyeglass, {})).to.be.a("function");
  });

  it("returned function returns a Promise when called", async () => {
    const injector = adaptor(fakeSass, fakeEyeglass, {});
    const result = injector("file", "data", resolveConfiguration({}));

    expect(result).to.be.a("promise");
  });

  it("calls the correct Eyeglass and Sass APIs", async () => {
    const injector = adaptor(fakeSass, fakeEyeglass, {});
    const result = injector("file", "data", resolveConfiguration({}));

    expect(result).to.be.a("promise");
    sinon.assert.calledOnce(fakeSass.render as unknown as sinon.SinonSpy);
    sinon.assert.calledOnce(fakeEyeglass as unknown as sinon.SinonSpy);
  });

  it("injects the correct options while not overriding others", async () => {
    const dummyOptions = {
      file: "wrong.scss",
      data: "wrong",
      sourceMap: false,
      outFile: "wrong.css",
      precision: 42,
    };
    const injector = adaptor(fakeSass, fakeEyeglass, dummyOptions);
    const result = injector("correct.scss", "correct", resolveConfiguration({}));

    expect(result).to.be.a("promise");
    const spiedEyeglass = fakeEyeglass as unknown as sinon.SinonSpy;
    // did it keep the extra argument?
    sinon.assert.alwaysCalledWithMatch(spiedEyeglass, {precision: 42});
    // did it override the right options?
    sinon.assert.alwaysCalledWithMatch(spiedEyeglass, {file: "correct.scss", data: "correct", sourceMap: true, outFile: "correct.css"});
  });

  it("returns the correct data from the render callback", async () => {
    const css = Buffer.from("css-data", "utf8");
    const map = Buffer.from("map-data", "utf8");
    const fakeResult: Result = {
      css,
      map,
      stats: {
        entry: "entry",
        start: 0,
        end: 1,
        duration: 2,
        includedFiles: ["files"],
      },
    };
    const injector = adaptor(fakeSass, fakeEyeglass, {});
    const result = injector("correct.scss", "correct", resolveConfiguration({}));
    const callback = (fakeSass.render as unknown as sinon.SinonSpy).args[0][1];
    callback(undefined, fakeResult);

    const output = await result;

    expect(result).to.be.a("promise");
    expect(callback).to.be.a("function");
    expect(output.content).to.equal(css.toString());
    expect(output.sourceMap).to.equal(map.toString());
    expect(output.dependencies).to.be.an("array");
    expect(output.dependencies && output.dependencies[0]).to.equal("files");
  });

  it("throws on error passed to render callback", async () => {
    const injector = adaptor(fakeSass, fakeEyeglass, {});
    const result = injector("correct.scss", "correct", resolveConfiguration({}));
    const callback = (fakeSass.render as unknown as sinon.SinonSpy).args[0][1];
    callback("test error");
    let output;
    try {
      output = await result;
    } catch (err) {
      expect(err).to.equal("test error");
    }
    expect(output).to.be.an("undefined");
  });

  it("can adapt from several optional adaptors", async () => {
    let package1Dir = fixture("package-1");
    let package1File = fixture("package-1/one.block.scss");
    let package2Dir = fixture("package-2");
    let package2File = fixture("package-2/two.block.scss");
    class Adaptor1 extends DirectoryScopedPreprocessor {
      setupOptions(options: EyeglassOptions): EyeglassOptions {
        return Object.assign({}, options, {outputStyle: "compact"});
      }
    }
    class Adaptor2 extends DirectoryScopedPreprocessor {
      setupOptions(options: EyeglassOptions): EyeglassOptions {
        return Object.assign({}, options, {outputStyle: "expanded"});
      }
    }
    let adaptor1 = new Adaptor1(package1Dir);
    let adaptor2 = new Adaptor2(package2Dir);
    let processor = adaptAll([adaptor1, adaptor2], SassImplementation, Eyeglass, {});
    let result1 = await processor(package1File, fs.readFileSync(package1File, "utf-8"), resolveConfiguration({}));
    assert.equal(result1.content, dedent(`
      :root { name: "uno"; }

      /*# sourceMappingURL=one.block.css.map */`));
    let result2 = await processor(package2File, fs.readFileSync(package2File, "utf-8"), resolveConfiguration({}));
    assert.equal(result2.content, dedent(`
      :root {
        name: "dos";
      }

      /*# sourceMappingURL=two.block.css.map */`));
  });
});

function dedent(s: string): string {
  if (s.startsWith("\n")) {
    s = s.substring(1);
  }
  let lines = s.split("\n");
  let m = lines[0].match(/^\s*/);
  if (!m) return s;
  let indent = m[0].length;
  if (indent === 0) return s;
  for (let i = 0; i < lines.length; i++) {
    lines[i] = lines[i].substring(indent);
  }
  return lines.join("\n");
}

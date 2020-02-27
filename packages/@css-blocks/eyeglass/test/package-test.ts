
import { expect } from "chai";
import Eyeglass from "eyeglass";
import { Result } from "node-sass";
import SassImplementation = require("node-sass");
import * as sinon from "sinon";

import { adaptor } from "../src/";

const fakeSass = {
    render: sinon.spy(),
} as unknown as typeof SassImplementation;
const fakeEyeglass = sinon.spy() as unknown as typeof Eyeglass;

// this is used later to generate test data.
function string2buffer(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
  const view = new Uint16Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    view[i] = str.charCodeAt(i);
  }
  return buf;
}

describe("@css-blocks/eyeglass", async () => {

  afterEach(async () => {
    (fakeSass.render as unknown as sinon.SinonSpy).resetHistory();
    (fakeEyeglass as unknown as sinon.SinonSpy).resetHistory();
  });

  it("exports a function named adaptor that returns a function", async () => {
    expect(adaptor).to.be.a("function");
    expect(adaptor(fakeSass, fakeEyeglass)).to.be.a("function");
  });

  it("returned function returns a Promise when called", async () => {
    const injector = adaptor(fakeSass, fakeEyeglass);
    const result = injector("file", "data");

    expect(result).to.be.a("promise");
  });

  it("calls the correct Eyeglass and Sass APIs", async () => {
    const injector = adaptor(fakeSass, fakeEyeglass);
    const result = injector("file", "data");

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
    const result = injector("correct.scss", "correct");

    expect(result).to.be.a("promise");
    const spiedEyeglass = fakeEyeglass as unknown as sinon.SinonSpy;
    // did it keep the extra argument?
    sinon.assert.alwaysCalledWithMatch(spiedEyeglass, {precision: 42});
    // did it override the right options?
    sinon.assert.alwaysCalledWithMatch(spiedEyeglass, {file: "correct.scss", data: "correct", sourceMap: true, outFile: "correct.css"});
  });

  it("returns the correct data from the render callback", async () => {
    const css = Buffer.from(string2buffer("css-data"));
    const map = Buffer.from(string2buffer("map-data"));
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
    const injector = adaptor(fakeSass, fakeEyeglass);
    const result = injector("correct.scss", "correct");
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
    const injector = adaptor(fakeSass, fakeEyeglass);
    const result = injector("correct.scss", "correct");
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
});

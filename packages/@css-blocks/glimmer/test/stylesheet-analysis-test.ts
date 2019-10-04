import { SerializedElementAnalysis } from "@css-blocks/core";
import { ObjectDictionary } from "@opticss/util";
import { assert } from "chai";

import { GlimmerAnalyzer } from "../src";

import { fixture, moduleConfig } from "./fixtures";

type ElementsAnalysis = ObjectDictionary<SerializedElementAnalysis>;

describe("Stylesheet analysis", function() {
  it("analyzes styles from the implicit block", function() {
    let analyzer = new GlimmerAnalyzer({}, {}, moduleConfig);
    return analyzer.analyze(fixture("styled-app"), ["my-app"]).then((analyzer: GlimmerAnalyzer) => {
      let analysis = analyzer.getAnalysis(0);
      let serializedAnalysis = analysis.serialize();
      assert.equal(analysis.template.identifier, "template:/styled-app/components/my-app");
      assert.deepEqual(serializedAnalysis.blocks, {
        "default": fixture("styled-app/src/ui/components/my-app/stylesheet.css"),
      });
      assert.deepEqual(serializedAnalysis.stylesFound, [".editor", ".editor[disabled]" , ":scope", ":scope[is-loading]"]);
      let expected: ElementsAnalysis = {
        a: { tagName: "div", staticStyles: [ 2, 3 ], dynamicClasses: [], dynamicAttributes: [], sourceLocation: { start: { line: 1, "filename": "template:/styled-app/components/my-app" }, end: { line: 1, "filename": "template:/styled-app/components/my-app" } } },
        b: { tagName: "page-banner", staticStyles: [], dynamicClasses: [], dynamicAttributes: [], sourceLocation: { start: { line: 2, column: 2, "filename": "template:/styled-app/components/my-app" }, end: { line: 2, column: 2, "filename": "template:/styled-app/components/my-app" } } },
        c: { tagName: "text-editor", staticStyles: [0, 1], dynamicClasses: [], dynamicAttributes: [], sourceLocation: { start: { line: 3, column: 2, "filename": "template:/styled-app/components/my-app" }, end: { line: 3, column: 2, "filename": "template:/styled-app/components/my-app" } }},
      };
      assert.deepEqual(serializedAnalysis.elements, expected);

      // // deserialize and re-serialize to make sure it creates the same representation.
      // let factory = new BlockFactory(analyzer.project.cssBlocksOpts, postcss);
      // return TemplateAnalysis.deserialize<TEMPLATE_TYPE>(serializedAnalysis, factory).then(recreatedAnalysis => {
      //   let reserializedAnalysis = recreatedAnalysis.serialize();
      //   assert.deepEqual(reserializedAnalysis, serializedAnalysis);
      // });
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });

  it("analyzes styles from a referenced block", function() {
    let projectDir = fixture("styled-app");
    let analyzer = new GlimmerAnalyzer({}, {}, moduleConfig);
    return analyzer.analyze(projectDir, ["with-multiple-blocks"]).then((analyzer: GlimmerAnalyzer) => {
      let analysis = analyzer.getAnalysis(0).serialize();
      assert.equal(analysis.template.identifier, "template:/styled-app/components/with-multiple-blocks");
      assert.deepEqual(analysis.blocks, {
        "default": fixture("styled-app/src/ui/components/with-multiple-blocks/stylesheet.css"),
        "h": fixture("styled-app/src/ui/components/with-multiple-blocks/header.css"),
      });
      assert.deepEqual(analysis.stylesFound, [".world", ".world[thick]", ":scope", "h.emphasis", "h.emphasis[extra]", "h:scope"]);
      assert.deepEqual(analysis.elements, {
        a: { tagName: "div", staticStyles: [2], dynamicClasses: [], dynamicAttributes: [], sourceLocation: { start: { line: 1, "filename": "template:/styled-app/components/with-multiple-blocks" }, end: { line: 1, "filename": "template:/styled-app/components/with-multiple-blocks" } } },
        b: { tagName: "h1", staticStyles: [5], dynamicClasses: [], dynamicAttributes: [], sourceLocation: { start: { line: 2, column: 2, "filename": "template:/styled-app/components/with-multiple-blocks" }, end: { line: 2, column: 2, "filename": "template:/styled-app/components/with-multiple-blocks" } } },
        c: { tagName: "span", staticStyles: [0, 1, 3, 4], dynamicClasses: [], dynamicAttributes: [], sourceLocation: { start: { line: 2, column: 21, "filename": "template:/styled-app/components/with-multiple-blocks" }, end: { line: 2, column: 21, "filename": "template:/styled-app/components/with-multiple-blocks" } } },
      });
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });

  it("analyzes styles from built-ins", function() {
    let projectDir = fixture("styled-app");
    let analyzer = new GlimmerAnalyzer({}, {}, moduleConfig);
    return analyzer.analyze(projectDir, ["with-link-to"]).then((analyzer: GlimmerAnalyzer) => {
      let analysis = analyzer.getAnalysis(0).serialize();
      assert.equal(analysis.template.identifier, "template:/styled-app/components/with-link-to");
      assert.deepEqual(analysis.blocks, {
        "default": fixture("styled-app/src/ui/components/with-link-to/stylesheet.css"),
        "external": fixture("styled-app/src/ui/components/with-link-to/external.css"),
        "util": fixture("styled-app/src/ui/components/with-link-to/util.css"),
      });
      assert.deepEqual(analysis.stylesFound, [
        ".link-1",
        ".link-2",
        ".link-2[active]",
        ".link-4",
        ".link-4[active]",
        ".link-4[disabled]",
        ".link-4[loading]",
        ":scope",
        "external.link-3",
        "external.link-3[active]",
        "util.util",
      ]);
      assert.deepEqual(analysis.elements, {
        "a": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "filename": "template:/styled-app/components/with-link-to",
              "line": 1,
            },
            "start": {
              "filename": "template:/styled-app/components/with-link-to",
              "line": 1,
            },
          },
          "staticStyles": [
            7,
          ],
          "tagName": "div",
        },
        "b": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 2,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 2,
            },
          },
          "staticStyles": [
            0,
          ],
          "tagName": "link-to",
        },
        "c": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 3,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 3,
            },
          },
          "staticStyles": [
            0,
            10,
          ],
          "tagName": "link-to",
        },
        "d": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 5,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 5,
            },
          },
          "staticStyles": [
            1,
          ],
          "tagName": "link-to",
        },
        "e": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 5,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 5,
            },
          },
          "staticStyles": [
            1,
            2,
          ],
          "tagName": "link-to",
        },
        "f": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 6,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 6,
            },
          },
          "staticStyles": [
            1,
          ],
          "tagName": "link-to",
        },
        "g": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 6,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 6,
            },
          },
          "staticStyles": [
            1,
            2,
          ],
          "tagName": "link-to",
        },
        "h": {
          "dynamicAttributes": [],
          "dynamicClasses": [
            {
              "condition": true,
              "whenTrue": [
                1,
              ],
            },
          ],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 8,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 8,
            },
          },
          "staticStyles": [],
          "tagName": "link-to",
        },
        "i": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 8,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 8,
            },
          },
          "staticStyles": [
            1,
            2,
          ],
          "tagName": "link-to",
        },
        "j": {
          "dynamicAttributes": [],
          "dynamicClasses": [
            {
              "condition": true,
              "whenTrue": [
                1,
              ],
            },
          ],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 9,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 9,
            },
          },
          "staticStyles": [],
          "tagName": "link-to",
        },
        "k": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 9,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 9,
            },
          },
          "staticStyles": [
            1,
            2,
          ],
          "tagName": "link-to",
        },
        "l": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 11,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 11,
            },
          },
          "staticStyles": [
            8,
          ],
          "tagName": "link-to",
        },
        "m": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 11,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 11,
            },
          },
          "staticStyles": [
            8,
            9,
          ],
          "tagName": "link-to",
        },
        "n": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 12,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 12,
            },
          },
          "staticStyles": [
            8,
          ],
          "tagName": "link-to",
        },
        "o": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 12,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 12,
            },
          },
          "staticStyles": [
            8,
            9,
          ],
          "tagName": "link-to",
        },
        "p": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 14,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 14,
            },
          },
          "staticStyles": [
            8,
          ],
          "tagName": "link-to",
        },
        "q": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 14,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 14,
            },
          },
          "staticStyles": [
            8,
            9,
          ],
          "tagName": "link-to",
        },
        "r": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 15,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 15,
            },
          },
          "staticStyles": [
            8,
          ],
          "tagName": "link-to",
        },
        "s": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 15,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 15,
            },
          },
          "staticStyles": [
            8,
            9,
          ],
          "tagName": "link-to",
        },
        "t": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 17,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 17,
            },
          },
          "staticStyles": [
            3,
          ],
          "tagName": "link-to",
        },
        "u": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 17,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 17,
            },
          },
          "staticStyles": [
            3,
            4,
          ],
          "tagName": "link-to",
        },
        "v": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 17,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 17,
            },
          },
          "staticStyles": [
            3,
            6,
          ],
          "tagName": "link-to",
        },
        "w": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 17,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 17,
            },
          },
          "staticStyles": [
            3,
            5,
          ],
          "tagName": "link-to",
        },
        "x": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 18,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 18,
            },
          },
          "staticStyles": [
            3,
          ],
          "tagName": "link-to",
        },
        "y": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 18,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 18,
            },
          },
          "staticStyles": [
            3,
            4,
          ],
          "tagName": "link-to",
        },
        "z": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 18,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 18,
            },
          },
          "staticStyles": [
            3,
            6,
          ],
          "tagName": "link-to",
        },
        "A": {
          "dynamicAttributes": [],
          "dynamicClasses": [],
          "sourceLocation": {
            "end": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 18,
            },
            "start": {
              "column": 2,
              "filename": "template:/styled-app/components/with-link-to",
              "line": 18,
            },
          },
          "staticStyles": [
            3,
            5,
          ],
          "tagName": "link-to",
        },
      });
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });

  it("analyzes styles from a referenced block with dynamic state", function() {
    let projectDir = fixture("styled-app");
    let analyzer = new GlimmerAnalyzer({}, {}, moduleConfig);
    return analyzer.analyze(projectDir, ["with-dynamic-states"]).then((analyzer: GlimmerAnalyzer) => {
      let analysis = analyzer.getAnalysis(0).serialize();
      assert.equal(analysis.template.identifier, "template:/styled-app/components/with-dynamic-states");
      assert.deepEqual(analysis.blocks, {
        "default": fixture("styled-app/src/ui/components/with-dynamic-states/stylesheet.css"),
        "h": fixture("styled-app/src/ui/components/with-dynamic-states/header.css"),
      });
      assert.deepEqual(analysis.stylesFound, [
        ".world",
        ".world[thick]",
        ":scope",
        "h.emphasis",
        "h.emphasis[style=bold]",
        "h.emphasis[style=italic]",
        "h:scope",
      ]);
      assert.deepEqual(analysis.elements, {
        a: {
          tagName: "div",
          staticStyles: [ 2 ],
          dynamicClasses: [],
          dynamicAttributes: [],
          sourceLocation: { start: { line: 1, "filename": "template:/styled-app/components/with-dynamic-states" }, end: { line: 1, "filename": "template:/styled-app/components/with-dynamic-states" } },
        },
        b: {
          tagName: "h1",
          staticStyles: [ 6 ],
          dynamicClasses: [],
          dynamicAttributes: [],
          sourceLocation: { start: { line: 2, column: 2, "filename": "template:/styled-app/components/with-dynamic-states" }, end: { line: 2, column: 2, "filename": "template:/styled-app/components/with-dynamic-states" } },
        },
        c: {
          tagName: "span",
          staticStyles: [ 0, 3 ],
          dynamicClasses: [],
          dynamicAttributes: [
            { condition: true, value: [ 1 ] },
            { stringExpression: true, group: { bold: 4, italic: 5 }, value: [] },
          ],
          sourceLocation: { start: { line: 2, column: 21, "filename": "template:/styled-app/components/with-dynamic-states" }, end: { line: 2, column: 21, "filename": "template:/styled-app/components/with-dynamic-states" } },
        },

      });
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });

  it("analyzes styles from a referenced block with dynamic classes", function() {
    let projectDir = fixture("styled-app");
    let analyzer = new GlimmerAnalyzer({}, {}, moduleConfig);
    return analyzer.analyze(projectDir, ["with-dynamic-classes"]).then((analyzer) => {
      let analysis = analyzer.getAnalysis(0).serialize();
      assert.equal(analysis.template.identifier, "template:/styled-app/components/with-dynamic-classes");
      assert.deepEqual(analysis.blocks, {
        "default": fixture("styled-app/src/ui/components/with-dynamic-classes/stylesheet.css"),
        "h": fixture("styled-app/src/ui/components/with-dynamic-classes/header.css"),
        "t": fixture("styled-app/src/ui/components/with-dynamic-classes/typography.css"),
      });
      assert.deepEqual(analysis.stylesFound, [
        ".planet",
        ".world",
        ".world[thick]",
        ":scope",
        "h.emphasis",
        "h.emphasis[style=bold]",
        "h.emphasis[style=italic]",
        "h:scope",
        "t.underline",
      ]);
      assert.deepEqual(analysis.elements, {
        a: {
          tagName: "div",
          staticStyles: [ 3 ],
          dynamicClasses: [],
          dynamicAttributes: [],
          sourceLocation: { start: { line: 1, "filename": "template:/styled-app/components/with-dynamic-classes" }, end: { line: 1, "filename": "template:/styled-app/components/with-dynamic-classes" } },
        },
        b: {
          tagName: "h1",
          staticStyles: [ 7 ],
          dynamicClasses: [],
          dynamicAttributes: [],
          sourceLocation: { start: { line: 2, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" }, end: { line: 2, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" } },
        },
        c: {
          tagName: "span",
          staticStyles: [ 4, 8 ],
          dynamicClasses: [ {condition: true, whenTrue: [ 1 ]} ],
          dynamicAttributes: [
            { condition: true, value: [ 2 ], container: 1 },
            { stringExpression: true, group: { bold: 5, italic: 6 }, value: [] },
          ],
          sourceLocation: { start: { line: 2, column: 21, "filename": "template:/styled-app/components/with-dynamic-classes" }, end: { line: 2, column: 21, "filename": "template:/styled-app/components/with-dynamic-classes" } },
        },
        d: {
          tagName: "div",
          staticStyles: [],
          dynamicClasses: [ { condition: true, whenTrue: [ 1 ], whenFalse: [ 0 ]} ],
          dynamicAttributes: [],
          sourceLocation: { start: { line: 3, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" }, end: { line: 3, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" } },
        },
        e: {
          tagName: "div",
          staticStyles: [],
          dynamicClasses: [ { condition: true, whenTrue: [ 0 ], whenFalse: [ 1 ]} ],
          dynamicAttributes: [],
          sourceLocation: { start: { line: 4, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" }, end: { line: 4, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" } },
        },
        f: {
          tagName: "div",
          staticStyles: [],
          dynamicClasses: [ { condition: true, whenFalse: [ 1 ]} ],
          dynamicAttributes: [],
          sourceLocation: { start: { line: 5, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" }, end: { line: 5, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" } },
        },
      });
    }).catch((error) => {
      console.error(error);
      throw error;
    });
  });

});

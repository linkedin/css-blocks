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
      assert.deepEqual(serializedAnalysis.stylesFound, [".editor", ".editor[state|disabled]" , ":scope", ":scope[state|is-loading]"]);
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
      assert.deepEqual(analysis.stylesFound, [".world", ".world[state|thick]", ":scope", "h.emphasis", "h.emphasis[state|extra]", "h:scope"]);
      assert.deepEqual(analysis.elements, {
        a: { tagName: "div", staticStyles: [2], dynamicClasses: [], dynamicAttributes: [], sourceLocation: { start: { line: 1, "filename": "template:/styled-app/components/with-multiple-blocks" }, end: { line: 1, "filename": "template:/styled-app/components/with-multiple-blocks" } } },
        b: { tagName: "h1", staticStyles: [5], dynamicClasses: [], dynamicAttributes: [], sourceLocation: { start: { line: 2, column: 2, "filename": "template:/styled-app/components/with-multiple-blocks" }, end: { line: 2, column: 2, "filename": "template:/styled-app/components/with-multiple-blocks" } } },
        c: { tagName: "span", staticStyles: [0, 1, 3, 4], dynamicClasses: [], dynamicAttributes: [], sourceLocation: { start: { line: 2, column: 23, "filename": "template:/styled-app/components/with-multiple-blocks" }, end: { line: 2, column: 23, "filename": "template:/styled-app/components/with-multiple-blocks" } } },
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
        ".world[state|thick]",
        ":scope",
        "h.emphasis",
        "h.emphasis[state|style=bold]",
        "h.emphasis[state|style=italic]",
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
          sourceLocation: { start: { line: 2, column: 23, "filename": "template:/styled-app/components/with-dynamic-states" }, end: { line: 2, column: 23, "filename": "template:/styled-app/components/with-dynamic-states" } },
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
        ".world",
        ".world[state|thick]",
        ":scope",
        "h.emphasis",
        "h.emphasis[state|style=bold]",
        "h.emphasis[state|style=italic]",
        "h:scope",
        "t.underline",
      ]);
      assert.deepEqual(analysis.elements, {
        a: {
          tagName: "div",
          staticStyles: [ 2 ],
          dynamicClasses: [],
          dynamicAttributes: [],
          sourceLocation: { start: { line: 1, "filename": "template:/styled-app/components/with-dynamic-classes" }, end: { line: 1, "filename": "template:/styled-app/components/with-dynamic-classes" } },
        },
        b: {
          tagName: "h1",
          staticStyles: [ 6 ],
          dynamicClasses: [],
          dynamicAttributes: [],
          sourceLocation: { start: { line: 2, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" }, end: { line: 2, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" } },
        },
        c: {
          tagName: "span",
          staticStyles: [ 3, 7 ],
          dynamicClasses: [ {condition: true, whenTrue: [ 0 ]} ],
          dynamicAttributes: [
            { condition: true, value: [ 1 ], container: 0 },
            { stringExpression: true, group: { bold: 4, italic: 5 }, value: [] },
          ],
          sourceLocation: { start: { line: 2, column: 23, "filename": "template:/styled-app/components/with-dynamic-classes" }, end: { line: 2, column: 23, "filename": "template:/styled-app/components/with-dynamic-classes" } },
        },
        d: {
          tagName: "div",
          staticStyles: [],
          dynamicClasses: [ { condition: true, whenTrue: [ 0 ], whenFalse: [ 3 ]} ],
          dynamicAttributes: [],
          sourceLocation: { start: { line: 3, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" }, end: { line: 3, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" } },
        },
        e: {
          tagName: "div",
          staticStyles: [],
          dynamicClasses: [ { condition: true, whenTrue: [ 3 ], whenFalse: [ 0 ]} ],
          dynamicAttributes: [],
          sourceLocation: { start: { line: 4, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" }, end: { line: 4, column: 2, "filename": "template:/styled-app/components/with-dynamic-classes" } },
        },
        f: {
          tagName: "div",
          staticStyles: [],
          dynamicClasses: [ { condition: true, whenFalse: [ 0 ]} ],
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

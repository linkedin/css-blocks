import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { outdent } from "outdent";

import { BlockCompiler, BlockDefinitionCompiler, INLINE_DEFINITION_FILE } from "../../src";
import { REGEXP_COMMENT_DEFINITION_REF } from "../../src/PrecompiledDefinitions";
import { setupImporting } from "../util/setupImporting";

@suite("Acceptance Test - Definition Files Full Workflow")
export class AcceptanceTestDefinitionFilesFullWorkflow {

  @test async "Process basic CSS Blocks source file and parse from definition file, using mock importer"() {
    // Setup our infrastructure... we need an importer, compiler, and parser ready to go.
    let { imports, config, factory, postcss } = setupImporting();
    const blockDfnCompiler = new BlockDefinitionCompiler(postcss, (_b, p) => p.replace(".block", ""), config);
    const compiler = new BlockCompiler(postcss, config);
    compiler.setDefinitionCompiler(blockDfnCompiler);

    // Part 1: Given a basic CSS Blocks source file, generate a definition file.
    imports.registerSource(
      "/foo/bar/source.block.css",
      outdent`
        :scope { background-color: #FFF; }
        :scope[toggled] { color: #000; }
        :scope[foo="bar"] { border-top-color: #F00; }
        .item { width: 100px; }
        .item[toggled] { height: 100px; }
        .item[foo="bar"] { min-width: 100px; }
        .item + .item { border-left-color: #F00; }
        :scope[toggled] .item { border-right-color: #F00; }
        :scope[toggled] .item[foo="bar"] { border-bottom-color: #F00; }
      `,
    );
    const originalBlock = await factory.getBlockFromPath("/foo/bar/source.block.css");

    const { css: cssTree, definition: definitionTree } = compiler.compileWithDefinition(originalBlock, originalBlock.stylesheet!, new Set(), "/foo/bar/source.block.d.css");
    const compiledCss = cssTree.toString();
    const definition = definitionTree.toString();

    // Test that the compiled content that we just generated is as expected.
    assert.equal(
      outdent`
        ${compiledCss}
      `,
      outdent`
        /*#css-blocks ${originalBlock.guid}*/
        .source { background-color: #FFF; }
        .source--toggled { color: #000; }
        .source--foo-bar { border-top-color: #F00; }
        .source__item { width: 100px; }
        .source__item--toggled { height: 100px; }
        .source__item--foo-bar { min-width: 100px; }
        .source__item + .source__item { border-left-color: #F00; }
        .source--toggled .source__item { border-right-color: #F00; }
        .source--toggled .source__item--foo-bar { border-bottom-color: #F00; }
        /*#blockDefinitionURL=/foo/bar/source.block.d.css*/
        /*#css-blocks end*/
      `,
      "Compiled CSS contents match expected output",
    );
    assert.equal(
      outdent`
        ${definition}
      `,
      outdent`
        @block-syntax-version 1;
        :scope {
            block-id: "${originalBlock.guid}";
            block-name: "source";
            block-class: source;
            block-interface-index: 0
        }
        :scope[toggled] {
            block-class: source--toggled;
            block-interface-index: 2
        }
        :scope[foo="bar"] {
            block-class: source--foo-bar;
            block-interface-index: 4
        }
        .item {
            block-class: source__item;
            block-interface-index: 5
        }
        .item[toggled] {
            block-class: source__item--toggled;
            block-interface-index: 7
        }
        .item[foo="bar"] {
            block-class: source__item--foo-bar;
            block-interface-index: 9
        }
      `,
      "Compiled definition contents match expected output",
    );

    // Part 2: Reset the importer and factory instances and try importing
    //         the compiled css and definition data we just created.
    imports.reset();
    factory.reset();

    imports.registerCompiledCssSource(
      "/foo/bar/source.css",
      compiledCss,
      "/foo/bar/source.block.d.css",
      definition,
    );
    const reconstitutedBlock = await factory.getBlockFromPath("/foo/bar/source.css");

    // And now some checks to validate that we were able to reconstitute accurately.
    assert.equal(reconstitutedBlock.guid, originalBlock.guid, "GUIDs of original and reconstituted blocks match");
    assert.equal(reconstitutedBlock.name, originalBlock.name, "Names of original and reconstituted blocks match");

    const expectedProperties = {
      "source": {
        "::self": [
          "background-color",
        ],
      },
      "source--toggled": {
        "::self": [
          "color",
        ],
      },
      "source--foo-bar": {
        "::self": [
          "border-top-color",
        ],
      },
      "source__item": {
        "::self": [
          "width",
          "border-left-color",
          "border-right-color",
        ],
      },
      "source__item--toggled": {
        "::self": [
          "height",
        ],
      },
      "source__item--foo-bar": {
        "::self": [
          "min-width",
          "border-bottom-color",
        ],
      },
    };
    const expectedFoundClasses = Object.keys(expectedProperties);
    const foundClasses = reconstitutedBlock.presetClassesMap(true);
    assert.deepEqual(
      Object.keys(foundClasses),
      expectedFoundClasses,
      "Class nodes on reconstituted block matches expected list of classes",
    );
    expectedFoundClasses.forEach(expectedClass => {
      Object.keys(expectedProperties[expectedClass]).forEach(psuedo => {
        assert.deepEqual(
          [...foundClasses[expectedClass].rulesets.getProperties(psuedo)].sort(),
          expectedProperties[expectedClass][psuedo].sort(),
          `Properties on reconstituted class node ${expectedClass}${psuedo} match expected list`,
        );
      });
    });
  }

  @test async "Process basic CSS Blocks source file and parse from embedded definitions, using mock importer"() {
    // Setup our infrastructure... we need an importer, compiler, and parser ready to go.
    let { imports, config, factory, postcss } = setupImporting();
    const blockDfnCompiler = new BlockDefinitionCompiler(postcss, (_b, p) => p.replace(".block", ""), config);
    const compiler = new BlockCompiler(postcss, config);
    compiler.setDefinitionCompiler(blockDfnCompiler);

    // Part 1: Given a basic CSS Blocks source file, generate a definition file.
    imports.registerSource(
      "/foo/bar/source.block.css",
      outdent`
        :scope { background-color: #FFF; }
        :scope[toggled] { color: #000; }
        :scope[foo="bar"] { border-top-color: #F00; }
        .item { width: 100px; }
        .item[toggled] { height: 100px; }
        .item[foo="bar"] { min-width: 100px; }
        .item + .item { border-left-color: #F00; }
        :scope[toggled] .item { border-right-color: #F00; }
        :scope[toggled] .item[foo="bar"] { border-bottom-color: #F00; }
      `,
    );
    const originalBlock = await factory.getBlockFromPath("/foo/bar/source.block.css");

    const { css: cssTree } = compiler.compileWithDefinition(originalBlock, originalBlock.stylesheet!, new Set(), INLINE_DEFINITION_FILE);
    const compiledCss = cssTree.toString();

    // Test that the compiled content that we just generated is as expected.
    // Because the GUID isn't fixed, and a part of the base64 encoded blob, we'll
    // need to remove it from the tested output and validate it separately.
    const embeddedDfnRegexResult = REGEXP_COMMENT_DEFINITION_REF.exec(compiledCss);
    if (!embeddedDfnRegexResult) {
      assert.fail(false, true, "Expected to find embedded definition data");
      return; // This isn't necessary, but TypeScript doesn't recognize that assert.fail() always throws.
    }
    const compiledCssNoDfn = compiledCss.replace(embeddedDfnRegexResult[0], "");
    assert.equal(
      outdent`
        ${compiledCssNoDfn}
      `,
      outdent`
        /*#css-blocks ${originalBlock.guid}*/
        .source { background-color: #FFF; }
        .source--toggled { color: #000; }
        .source--foo-bar { border-top-color: #F00; }
        .source__item { width: 100px; }
        .source__item--toggled { height: 100px; }
        .source__item--foo-bar { min-width: 100px; }
        .source__item + .source__item { border-left-color: #F00; }
        .source--toggled .source__item { border-right-color: #F00; }
        .source--toggled .source__item--foo-bar { border-bottom-color: #F00; }
        /*#css-blocks end*/
      `,
      "Compiled CSS contents match expected output",
    );
    assert.equal(
      outdent`
        ${Buffer.from(embeddedDfnRegexResult[1].split(",")[1], "base64").toString("utf-8")}
      `,
      outdent`
        @block-syntax-version 1;
        :scope {
            block-id: "${originalBlock.guid}";
            block-name: "source";
            block-class: source;
            block-interface-index: 0
        }
        :scope[toggled] {
            block-class: source--toggled;
            block-interface-index: 2
        }
        :scope[foo="bar"] {
            block-class: source--foo-bar;
            block-interface-index: 4
        }
        .item {
            block-class: source__item;
            block-interface-index: 5
        }
        .item[toggled] {
            block-class: source__item--toggled;
            block-interface-index: 7
        }
        .item[foo="bar"] {
            block-class: source__item--foo-bar;
            block-interface-index: 9
        }
      `,
      "Unencoded definition data matches expected output",
    );

    // Part 2: Reset the importer and factory instances and try importing
    //         the compiled css and definition data we just created.
    imports.reset();
    factory.reset();

    imports.registerSource(
      "/foo/bar/source.css",
      compiledCss,
      undefined,
      true,
    );
    const reconstitutedBlock = await factory.getBlockFromPath("/foo/bar/source.css");

    // And now some checks to validate that we were able to reconstitute accurately.
    assert.equal(reconstitutedBlock.guid, originalBlock.guid, "GUIDs of original and reconstituted blocks match");
    assert.equal(reconstitutedBlock.name, originalBlock.name, "Names of original and reconstituted blocks match");

    const expectedProperties = {
      "source": {
        "::self": [
          "background-color",
        ],
      },
      "source--toggled": {
        "::self": [
          "color",
        ],
      },
      "source--foo-bar": {
        "::self": [
          "border-top-color",
        ],
      },
      "source__item": {
        "::self": [
          "width",
          "border-left-color",
          "border-right-color",
        ],
      },
      "source__item--toggled": {
        "::self": [
          "height",
        ],
      },
      "source__item--foo-bar": {
        "::self": [
          "min-width",
          "border-bottom-color",
        ],
      },
    };
    const expectedFoundClasses = Object.keys(expectedProperties);
    const foundClasses = reconstitutedBlock.presetClassesMap(true);
    assert.deepEqual(
      Object.keys(foundClasses),
      expectedFoundClasses,
      "Class nodes on reconstituted block matches expected list of classes",
    );
    expectedFoundClasses.forEach(expectedClass => {
      Object.keys(expectedProperties[expectedClass]).forEach(psuedo => {
        assert.deepEqual(
          [...foundClasses[expectedClass].rulesets.getProperties(psuedo)].sort(),
          expectedProperties[expectedClass][psuedo].sort(),
          `Properties on reconstituted class node ${expectedClass}${psuedo} match expected list`,
        );
      });
    });
  }
}

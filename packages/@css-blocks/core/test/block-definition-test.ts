import { assert } from "chai";
import { suite, test } from "mocha-typescript";
import { postcss } from "opticss";

import * as cssBlocks from "../src";
import { Block, BlockCompiler, BlockFactory } from "../src";
import { BlockDefinitionCompiler } from "../src/BlockCompiler/BlockDefinitionCompiler";

import { BEMProcessor } from "./util/BEMProcessor";
import { setupImporting } from "./util/setupImporting";

function lines(text: string): Array<string> {
  return text.split("\n").map(l => l.trim()).filter(Boolean);
}

function clean(text: string): string {
  return lines(text).join(" ").replace(/\s+/g, " ");
}

async function compileBlockWithDefinition(factory: BlockFactory, blockFilename: string): Promise<{block: Block; cssResult: postcss.Result; definitionResult: postcss.Result}> {
  let config = factory.configuration;
  let importer = config.importer;
  let block = await factory.getBlock(importer.identifier(null, blockFilename, config));
  let definitionCompiler = new BlockDefinitionCompiler(postcss, (_b, p) => p.replace(".block", ""), config);
  let compiler = new BlockCompiler(postcss, config);
  compiler.setDefinitionCompiler(definitionCompiler);
  let definitionFilename = blockFilename.replace(".block", ".block.d");
  let {css, definition} = compiler.compileWithDefinition(block, block.stylesheet!, new Set(), definitionFilename);
  let cssFilename = blockFilename.replace(".block", "");
  let cssResult = css.toResult({to: cssFilename});
  let definitionResult = definition.toResult({to: definitionFilename});
  return {block, cssResult, definitionResult};
}

@suite("Block Factory")
export class BlockFactoryTests extends BEMProcessor {
  assertError(errorType: typeof cssBlocks.CssBlockError, message: string, promise: postcss.LazyResult) {
    return promise.then(
      () => {
        assert(false, `Error ${errorType.name} was not raised.`);
      },
      (reason) => {
        assert(reason instanceof errorType, reason.toString());
        assert.deepEqual(reason.message, message);
      });
  }

  @test async "can generate a definition"() {
    let { imports, factory } = setupImporting();
    let filename = "test-block.block.css";
    imports.registerSource(
      filename,
      `:scope { color: purple; }
       :scope[large] { font-size: 20px; }
       .foo   { float: left; block-alias: foo "another-foo"; }
       .foo[size=small] { font-size: 5px; }`,
    );
    let {block, cssResult, definitionResult} = await compileBlockWithDefinition(factory, filename);
    assert.deepEqual(
      clean(cssResult.css),
      clean(`/*#css-blocks ${block.guid}*/
       .test-block { color: purple; }
       .test-block--large { font-size: 20px; }
       .test-block__foo   { float: left;   }
       .test-block__foo--size-small { font-size: 5px; }
       /*#blockDefinitionURL=test-block.block.d.css*/
       /*#css-blocks end*/`),
    );
    assert.deepEqual(
      clean(definitionResult.css),
      clean(`@block-syntax-version 1;
       :scope { block-id: "${block.guid}"; block-name: "test-block"; block-class: test-block; block-interface-index: 0 }
       :scope[large] { block-class: test-block--large; block-interface-index: 2 }
       .foo { block-class: test-block__foo; block-interface-index: 3; block-alias: foo another-foo }
       .foo[size="small"] { block-class: test-block__foo--size-small; block-interface-index: 5 }
      `));
  }

  @test async "can generate a definition with block-global declarations."() {
    let { imports, factory } = setupImporting();
    let filename = "test-block.block.css";
    imports.registerSource(
      filename,
      `@block-global [large];
       @block-global [mode=active];`,
    );
    let {block, definitionResult} = await compileBlockWithDefinition(factory, filename);
    assert.deepEqual(
      clean(definitionResult.css),
      clean(`@block-syntax-version 1;
       @block-global [large];
       @block-global [mode="active"];
       :scope { block-id: "${block.guid}"; block-name: "test-block"; block-class: test-block; block-interface-index: 0 }
       :scope[large] { block-class: test-block--large; block-interface-index: 2 }
       :scope[mode="active"] { block-class: test-block--mode-active; block-interface-index: 4 }
      `));
  }

  @test async "can generate a definition with a block reference"() {
    let { imports, factory } = setupImporting();
    imports.registerSource(
      "foo.block.css",
      `:scope { color: blue; }`,
    );
    imports.registerSource(
      "bar/bip.block.css",
      `:scope { color: orange; }`,
    );
    imports.registerSource(
      "bar/baz.block.css",
      `:scope { color: red; }`,
    );
    imports.registerSource(
      "bar.block.css",
      `@export (default as bip) from "./bar/bip.block.css";
       @export (default as baz) from "./bar/baz.block.css"`,
    );
    let filename = "test-block.block.css";
    imports.registerSource(
      filename,
      `@block foo from "./foo.block.css";
       @block bar, (bip, baz as zab) from "./bar.block.css";
       :scope { color: purple; }
       `,
    );
    let {block, cssResult, definitionResult} = await compileBlockWithDefinition(factory, filename);
    assert.deepEqual(
      clean(cssResult.css),
      clean(`/*#css-blocks ${block.guid}*/
       .test-block { color: purple; }
       /*#blockDefinitionURL=test-block.block.d.css*/
       /*#css-blocks end*/`),
    );
    assert.deepEqual(
      clean(definitionResult.css),
      clean(`@block-syntax-version 1;
       @block foo from "./foo.css";
       @block bar, (bip, baz as zab) from "./bar.css";
       :scope { block-id: "${block.guid}"; block-name: "test-block"; block-class: test-block; block-interface-index: 0 }`));
  }

  @test async "can generate a definition with style composition"() {
    let { imports, factory } = setupImporting();
    imports.registerSource(
      "foo.block.css",
      `:scope[oceanic] { color: blue; }
       :scope[forrest] { color: green; }
      `,
    );
    imports.registerSource(
      "bar/bip.block.css",
      `.orange { color: orange; }`,
    );
    imports.registerSource(
      "bar/baz.block.css",
      `:scope { color: red; }`,
    );
    imports.registerSource(
      "bar.block.css",
      `@block bip from "./bar/bip.block.css";
       @export (default as bip) from "./bar/bip.block.css";
       @export (default as baz) from "./bar/baz.block.css";
       .lemon {
         color: yellow;
       }`,
    );
    let filename = "test-block.block.css";
    imports.registerSource(
      filename,
      `@block foo from "./foo.block.css";
       @block bar, (bip, baz as zab) from "./bar.block.css";
       :scope {
         composes: foo[oceanic];
       }
       .nav {
         composes: foo, bip.orange;
       }
       .nav[open] {
         composes: bar.lemon;
       }
       .nav[position=top] {
         composes: foo[forrest];
       }
       .nav[position=top][open] {
         composes: foo[oceanic], foo[forrest];
       }
       `,
    );
    let {block, definitionResult} = await compileBlockWithDefinition(factory, filename);
    assert.deepEqual(
      clean(definitionResult.css),
      clean(`@block-syntax-version 1;
       @block foo from "./foo.css";
       @block bar, (bip, baz as zab) from "./bar.css";
       :scope { block-id: "${block.guid}"; block-name: "test-block"; composes: foo[oceanic]; block-class: test-block; block-interface-index: 0 }
       .nav { composes: foo, bip.orange; block-class: test-block__nav; block-interface-index: 1 }
       .nav[open] { composes: bar.lemon; block-class: test-block__nav--open; block-interface-index: 3 }
       .nav[position="top"] { composes: foo[forrest]; block-class: test-block__nav--position-top; block-interface-index: 5 }
       .nav[position="top"][open] { composes: foo[oceanic], foo[forrest] }
       `));
  }
}

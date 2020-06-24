import { assert } from "chai";
import { readFileSync } from "fs-extra";
import { suite, test } from "mocha-typescript";

import { CssBlockError, InvalidBlockSyntax } from "../../src";
import { assertError } from "../util/assertError";
import { BEMProcessor } from "../util/BEMProcessor";
import { MockImportRegistry } from "../util/MockImportRegistry";

const compiledCssFixture = readFileSync("test/fixtures/compiledFileImporting/externaldef/nav.block.css", { encoding: "utf8" });

function registerReferencedSources(registry: MockImportRegistry) {
  registry.registerSource(
    "foo/shared/link.block.css",
    ":scope { font-weight: bold; }",
  );
  registry.registerSource(
    "foo/shared/list.block.css",
    ":scope {} :scope[type=ordered] {} :scope[type=unordered] {} :scope[type=inline] {} :scope[type=horizontal] {} .item {} .item[last] {}",
  );
  registry.registerSource(
    "foo/shared/item.block.css",
    ":scope {}",
  );
}

@suite("Definition File Processing")
export class DefinitionFileProcessing extends BEMProcessor {

  @test "Processing a Compiled CSS file results in something sensible"() {
    const registry = new MockImportRegistry();
    registerReferencedSources(registry);

    const filename = "foo/bar/nav.block.css";
    const inputCss = compiledCssFixture;
    const parseConfig = {
      importer: registry.importer(),
    };
    const mockConfigOpts = {
      dfnFiles: [filename],
    };

    // TODO: The expected string is a bunch of gobbledygook right now that should be cleaned up later by the Compiler.
    return this.process(filename, inputCss, parseConfig, mockConfigOpts).then((result) => {
      assert.deepEqual(
        result.css.toString().trim(),
        '.nav-7d97e { inherited-styles: "list[type=ordered]" 1, "list[type=unordered]" 2, "list[type=inline]" 3, "list[type=horizontal]" 4, "list.item" 5, "list.item[last]" 6; }\n.nav-7d97e__entry { block-class: nav-7d97e__entry; }\n.nav-7d97e__entry--active { block-class: nav-7d97e__entry--active; font-weight: resolve-self(  ); }\n.link.nav-7d97e__entry--active { font-weight: resolve-self(  ); }',
      );
    });
  }

  @test "It errors out if no block ID is given"() {
    const registry = new MockImportRegistry();
    registerReferencedSources(registry);

    const filename = "foo/bar/nav.block.css";
    const inputCss = `@block-syntax-version: 1;
                      :scope { block-class: "nav-7d97e"; block-name: nav; }`;
    const parseConfig = {
      importer: registry.importer(),
    };
    const mockConfigOpts = {
      dfnFiles: [filename],
    };

    return assertError(
      InvalidBlockSyntax,
      "Expected block-id to be declared in definition's :scope rule. (foo/bar/nav.block.css:2:23)",
      this.process(filename, inputCss, parseConfig, mockConfigOpts),
    );
  }

  @test "It errors out if no block name is given"() {
    const registry = new MockImportRegistry();
    registerReferencedSources(registry);

    const filename = "foo/bar/nav.block.css";
    const inputCss = `@block-syntax-version: 1;
                      :scope { block-id: "7d97e"; block-class: "nav-7d97e"; }`;
    const parseConfig = {
      importer: registry.importer(),
    };
    const mockConfigOpts = {
      dfnFiles: [filename],
    };

    return assertError(
      InvalidBlockSyntax,
      "block-name is expected to be declared in definition file\'s :scope rule. (foo/bar/nav.block.css:2:23)",
      this.process(filename, inputCss, parseConfig, mockConfigOpts),
    );
  }

  @test "It errors out if :scope selector doesn't declare a block-class"() {
    const registry = new MockImportRegistry();
    registerReferencedSources(registry);

    const filename = "foo/bar/nav.block.css";
    const inputCss = `@block-syntax-version: 1;
                      :scope { block-id: "7d97e"; block-name: nav; }`;
    const parseConfig = {
      importer: registry.importer(),
    };
    const mockConfigOpts = {
      dfnFiles: [filename],
    };

    return assertError(
      CssBlockError,
      "Style node :scope doesn't have a preset block class after parsing definition file. You may need to declare this style node in the definition file. (foo/bar/nav.block.css)",
      this.process(filename, inputCss, parseConfig, mockConfigOpts),
    );
  }

  @test "It errors out if an element doesn't declare a block class"() {
    const registry = new MockImportRegistry();
    registerReferencedSources(registry);

    const filename = "foo/bar/nav.block.css";
    const inputCss = `@block-syntax-version: 1;
                      :scope { block-id: "7d97e"; block-class: nav-7d97e; block-name: nav; }
                      .entry { }
                      .entry[active] { block-class: nav-7d97e__entry--active; }`;
    const parseConfig = {
      importer: registry.importer(),
    };
    const mockConfigOpts = {
      dfnFiles: [filename],
    };

    return assertError(
      CssBlockError,
      "Style node .entry doesn't have a preset block class after parsing definition file. You may need to declare this style node in the definition file. (foo/bar/nav.block.css)",
      this.process(filename, inputCss, parseConfig, mockConfigOpts),
    );
  }

  @test "It errors out if a modifier doesn't declare a block class"() {
    const registry = new MockImportRegistry();
    registerReferencedSources(registry);

    const filename = "foo/bar/nav.block.css";
    const inputCss = `@block-syntax-version: 1;
                      :scope { block-id: "7d97e"; block-class: nav-7d97e; block-name: nav; }
                      .entry { block-class: nav-7d97e__entry; }
                      .entry[active] { }`;
    const parseConfig = {
      importer: registry.importer(),
    };
    const mockConfigOpts = {
      dfnFiles: [filename],
    };

    return assertError(
      CssBlockError,
      "Style node .entry[active] doesn't have a preset block class after parsing definition file. You may need to declare this style node in the definition file. (foo/bar/nav.block.css)",
      this.process(filename, inputCss, parseConfig, mockConfigOpts),
    );
  }

  @test "It errors out if a declared block-class isn't a valid class name"() {
    const registry = new MockImportRegistry();
    registerReferencedSources(registry);

    const filename = "foo/bar/nav.block.css";
    const inputCss = `@block-syntax-version: 1;
                      :scope { block-id: "7d97e"; block-class: ¯\\_(ツ)_/¯; block-name: nav; }`;
    const parseConfig = {
      importer: registry.importer(),
    };
    const mockConfigOpts = {
      dfnFiles: [filename],
    };

    return assertError(
      CssBlockError,
      "¯\\_(ツ)_/¯ isn't a valid class name. (foo/bar/nav.block.css:2:51)",
      this.process(filename, inputCss, parseConfig, mockConfigOpts),
    );
  }
}

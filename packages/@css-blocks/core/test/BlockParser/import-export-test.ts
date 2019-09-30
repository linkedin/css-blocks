import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { assertError } from "../util/assertError";
import { BEMProcessor } from "../util/BEMProcessor";
import { indented } from "../util/indented";
import { MockImportRegistry } from "../util/MockImportRegistry";

const { InvalidBlockSyntax } = require("../util/postcss-helper");

@suite("Block Import and Exports")
export class BlockImportExport extends BEMProcessor {
  @test "can import another block"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/imported.css",
      `:scope { color: purple; }
       :scope[large] { font-size: 20px; }
       :scope[theme=red] { color: red; }
       .foo   { float: left;   }
       .foo[small] { font-size: 5px; }
       .foo[font=fancy] { font-family: fancy; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block imported from "./imported.css";
                    @block-debug imported to comment;
                    :scope { color: red; }
                    .b[big] {color: blue;}`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("foo/bar/imported.css");
      assert.deepEqual(
        result.css.toString().trim(),
        indented`
          /* Source: foo/bar/imported.css
           * :scope (.imported)
           *  states:
           *  ├── :scope[large] (.imported--large)
           *  └── :scope[theme=red] (.imported--theme-red)
           *  └── .foo (.imported__foo)
           *       states:
           *       ├── .foo[font=fancy] (.imported__foo--font-fancy)
           *       └── .foo[small] (.imported__foo--small)
           */
          .test-block { color: red; }
          .test-block__b--big { color: blue; }`,
      );
    });
  }

  @test "can import another block under a local alias using as syntax"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: phoebe; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block (default as imported) from "./imported.css";
                    @block-debug imported to comment;`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("foo/bar/imported.css");
      assert.deepEqual(
        result.css.toString().trim(),
        indented`
          /* Source: foo/bar/imported.css
           * :scope (.phoebe)
           */`,
      );
    });
  }

  @test "if blocks specify name independently of filename, imported name is still used for ref locally"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: snow-flake; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block foobar from "./imported.css";
                    @block-debug foobar to comment;`;

    return this.process(filename, inputCSS, {importer: imports.importer()}).then((result) => {
      imports.assertImported("foo/bar/imported.css");
      assert.deepEqual(
        result.css.toString().trim(),
        indented`
          /* Source: foo/bar/imported.css
           * :scope (.snow-flake)
           */`,
      );
    });
  }

  @test "local block names in double quotes in @block fail parse with helpful error"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: block; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block "snow-flake" from "./imported.css";
                    @block-debug block to comment;`;

    return assertError(
      InvalidBlockSyntax,
      `Illegal block name in import. ""snow-flake"" is not a legal CSS identifier. (foo/bar/test-block.css:1:1)`,
      this.process(filename, inputCSS, {importer: imports.importer()}),
    );
  }

  @test "local block names in single quotes in @block fail parse with helpful error"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: block; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block 'snow-flake' from "./imported.css";
                    @block-debug snow-flake to comment;`;

    return assertError(
      InvalidBlockSyntax,
      `Illegal block name in import. "'snow-flake'" is not a legal CSS identifier. (foo/bar/test-block.css:1:1)`,
      this.process(filename, inputCSS, {importer: imports.importer()}),
    );

  }

  @test "doesn't allow non-css-ident names in import"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: block; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block 123 from "./imported.css";`;

    return assertError(
      InvalidBlockSyntax,
      `Illegal block name in import. "123" is not a legal CSS identifier. (foo/bar/test-block.css:1:1)`,
      this.process(filename, inputCSS, {importer: imports.importer()}));
  }

  @test "requires from statement in @block"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: block; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block "./imported.css";`;

    return assertError(
      InvalidBlockSyntax,
      'Malformed block reference: `@block "./imported.css"` (foo/bar/test-block.css:1:1)',
      this.process(filename, inputCSS, {importer: imports.importer()}));
  }

  @test async "able to export under same alias"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    imports.registerSource(
      "imported.css",
      `
        @block a from "./a.css";
        :scope { block-name: block-b; }
        @export a;
      `,
    );

    let inputCSS = `@block ( a ) from "./imported.css";
                    @block-debug a to comment;`;
    let result = await this.process("test.css", inputCSS, {importer: imports.importer()});
    return assert.deepEqual(
      result.css.trim(),
      indented`
      /* Source: a.css
       * :scope (.block-a)
       */`,
    );
  }

  @test async "able to export under external alias of same name"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    imports.registerSource(
      "imported.css",
      `
        @block a from "./a.css";
        :scope { block-name: imported-block; }
        @export ( a as a );
      `,
    );

    let inputCSS = `@block ( a ) from "./imported.css";
                    @block-debug a to comment;`;
    let result = await this.process("test.css", inputCSS, {importer: imports.importer()});
    return assert.deepEqual(
      result.css.trim(),
      indented`
        /* Source: a.css
         * :scope (.block-a)
         */`,
    );
  }

  @test async "able to export under external alias of different name"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    imports.registerSource(
      "imported.css",
      `
        @block a from "./a.css";
        :scope { block-name: imported-block; }
        @export ( a as foo );
      `,
    );

    let inputCSS = `@block ( foo ) from "./imported.css";
                    @block-debug foo to comment;`;
    let result = await this.process("test.css", inputCSS, {importer: imports.importer()});
    return assert.deepEqual(
      result.css.trim(),
      indented`
        /* Source: a.css
         * :scope (.block-a)
         */`,
    );
  }

  @test async "exports rely on imported alias"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    imports.registerSource(
      "imported.css",
      `
        @block ( default as foo ) from "./a.css";
        :scope { block-name: imported-block; }
        @export ( foo as bar );
      `,
    );

    let inputCSS = `@block ( bar ) from "./imported.css";
                    @block-debug bar to comment;`;
    let result = await this.process("test.css", inputCSS, {importer: imports.importer()});
    return assert.deepEqual(
      result.css.trim(),
      indented`
       /* Source: a.css
        * :scope (.block-a)
        */`);
  }

  @test async "able to export multiple blocks under external alias of different name"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    imports.registerSource(
      "b.css",
      `:scope { block-name: block-b; }`,
    );
    imports.registerSource(
      "imported.css",
      `
        @block a from "./a.css";
        @block b from "./b.css";
        :scope { block-name: imported-block; }
        @export ( a as foo, b as bar );
      `,
    );

    let inputCSS = `@block ( foo, bar ) from "./imported.css";
                    @block-debug foo to comment;
                    @block-debug bar to comment;`;
    let result = await this.process("test.css", inputCSS, {importer: imports.importer()});
    return assert.deepEqual(
      result.css.trim(),
      indented`
        /* Source: a.css
         * :scope (.block-a)
         */
        /* Source: b.css
         * :scope (.block-b)
         */`,
    );
  }
  @test async "able to export without parens"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    imports.registerSource(
      "b.css",
      `:scope { block-name: block-b; }`,
    );
    imports.registerSource(
      "imported.css",
      `
        @block a from "./a.css";
        @block b from "./b.css";
        :scope { block-name: imported-block; }
        @export a as foo, b as bar;
      `,
    );

    let inputCSS = `@block ( foo, bar ) from "./imported.css";
                    @block-debug foo to comment;
                    @block-debug bar to comment;`;
    let result = await this.process("test.css", inputCSS, {importer: imports.importer()});
    return assert.equal(
      result.css.trim(),
      indented`
        /* Source: a.css
         * :scope (.block-a)
         */
        /* Source: b.css
         * :scope (.block-b)
         */`,
    );
  }

  @test async "able to export multiple blocks using mixed methods"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    imports.registerSource(
      "b.css",
      `:scope { block-name: block-b; }`,
    );
    imports.registerSource(
      "imported.css",
      `
        @block a from "./a.css";
        @block b from "./b.css";
        :scope { block-name: imported-block; }
        @export a, ( b as bar );
      `,
    );

    let inputCSS = `@block ( a, bar ) from "./imported.css";
                    @block-debug a to comment;
                    @block-debug bar to comment;`;
    let result = await this.process("test.css", inputCSS, {importer: imports.importer()});
    return assert.equal(
      result.css.trim(),
      indented`
        /* Source: a.css
         * :scope (.block-a)
         */
        /* Source: b.css
         * :scope (.block-b)
         */`,
    );
  }

  @test async "multiple export calls work"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    imports.registerSource(
      "b.css",
      `:scope { block-name: block-b; }`,
    );
    imports.registerSource(
      "imported.css",
      `
        @block a from "./a.css";
        @block b from "./b.css";
        :scope { block-name: imported-block; }
        @export a;
        @export ( b as bar );

      `,
    );

    let inputCSS = `@block ( a, bar ) from "./imported.css";
                    @block-debug a to comment;
                    @block-debug bar to comment;`;
    let result = await this.process("test.css", inputCSS, {importer: imports.importer()});
    return assert.equal(
      result.css.trim(),
      indented`
        /* Source: a.css
         * :scope (.block-a)
         */
        /* Source: b.css
         * :scope (.block-b)
         */`,
    );
  }

  @test async "export formats may be mixed and matched"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    imports.registerSource(
      "b.css",
      `:scope { block-name: block-b; }`,
    );
    imports.registerSource(
      "c.css",
      `:scope { block-name: block-c; }`,
    );
    imports.registerSource(
      "imported.css",
      `
        @block a from "./a.css";
        @block b from "./b.css";
        @block c from "./c.css";

        :scope { block-name: imported-block; }

        @export ( b as bar ), a, ( c as baz );
      `,
    );

    let inputCSS = `@block ( a, bar, baz ) from "./imported.css";
                    @block-debug a to comment;
                    @block-debug bar to comment;
                    @block-debug baz to comment;`;
    let result = await this.process("test.css", inputCSS, {importer: imports.importer()});
    return assert.equal(
      result.css.trim(),
      indented`
        /* Source: a.css
         * :scope (.block-a)
         */
        /* Source: b.css
         * :scope (.block-b)
         */
        /* Source: c.css
         * :scope (.block-c)
         */`,
    );
  }

  @test async "export from works as expected"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    imports.registerSource(
      "b.css",
      `:scope { block-name: block-b; }`,
    );
    imports.registerSource(
      "c.css",
      `:scope { block-name: block-c; }`,
    );
    imports.registerSource(
      "imported.css",
      `
        :scope { block-name: imported-block; }

        @export a from "./a.css";
        @export ( default as bar ) from "./b.css";
        @export ( default as baz ) from "./c.css";
      `,
    );

    let inputCSS = `@block imported, ( a, bar, baz ) from "./imported.css";
                    @block-debug imported to comment;
                    @block-debug a to comment;
                    @block-debug bar to comment;
                    @block-debug baz to comment;`;
    let result = await this.process("test.css", inputCSS, {importer: imports.importer()});
    return assert.equal(
      result.css.trim(),
      indented`
        /* Source: imported.css
         * :scope (.imported-block)
         */
        /* Source: a.css
         * :scope (.block-a)
         */
        /* Source: b.css
         * :scope (.block-b)
         */
        /* Source: c.css
         * :scope (.block-c)
         */`,
    );
  }

  @test async "default is a reserved word – bare imports"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `@block default from "./a.css";`;

    return assertError(
      InvalidBlockSyntax,
      `Default Block from "./a.css" must be aliased to a unique local identifier. (test.css:1:1)`,
      this.process("test.css", inputCSS, {importer: imports.importer()}),
    );
  }

  @test async "immediately re-exported blocks are not available locally"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `
      @export a from "./a.css";
      :scope { block-name: imported-block; extends: a; }
    `;

    return assertError(
      InvalidBlockSyntax,
      `No Block named "a" found in scope. (test.css:3:44)`,
      this.process("test.css", inputCSS, {importer: imports.importer()}),
    );
  }

  @test async "default is a reserved word – named imports"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `@block ( a as default ) from "./a.css";`;

    return assertError(
      InvalidBlockSyntax,
      `Cannot import "a" as reserved word "default" (test.css:1:1)`,
      this.process("test.css", inputCSS, {importer: imports.importer()}),
    );
  }

  @test async "html is a reserved word – named imports"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `@block ( a as html ) from "./a.css";`;

    return assertError(
      InvalidBlockSyntax,
      `Cannot import "a" as reserved word "html" (test.css:1:1)`,
      this.process("test.css", inputCSS, {importer: imports.importer()}),
    );
  }

  @test async "html filename is a reserved word – named imports"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "html.block.css",
      `:scope { color: red; }`,
    );

    let inputCSS = `@block html from "./html.block.css";`;

    return assertError(
      InvalidBlockSyntax,
      `Cannot import "default" as reserved word "html" (test.css:1:1)`,
      this.process("test.css", inputCSS, {importer: imports.importer()}),
    );
  }

  @test async "default is a reserved word – bare exports"() {
    let imports = new MockImportRegistry();

    let inputCSS = `
      :scope {
        block-name: imports;
      }
      @export default;
    `;

    return assertError(
      InvalidBlockSyntax,
      `Unnecessary re-export of default Block. (test.css:5:7)`,
      this.process("test.css", inputCSS, {importer: imports.importer()}),
    );
  }

  @test async "svg is a reserved word – bare exports"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "images.block.css",
      `:scope { color: red; }`,
    );

    let inputCSS = `
      @export (default as svg) from "./images.block.css";
    `;

    return assertError(
      InvalidBlockSyntax,
      `Cannot export "default" as reserved word "svg" (test.css:2:7)`,
      this.process("test.css", inputCSS, {importer: imports.importer()}),
    );
  }

  @test async "default is a reserved word – named exports"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `
      @block a from "./a.css";
      @export ( a as default );
    `;

    return assertError(
      InvalidBlockSyntax,
      `Cannot export "a" as reserved word "default" (test.css:3:7)`,
      this.process("test.css", inputCSS, {importer: imports.importer()}),
    );
  }

  @test async "Block export must be an identifier"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `
      @block a from "./a.css";
      @export ( a as 123 );
    `;

    return assertError(
      InvalidBlockSyntax,
      `Illegal block name in import. "123" is not a legal CSS identifier. (test.css:3:7)`,
      this.process("test.css", inputCSS, {importer: imports.importer()}),
    );
  }

  @test async "throws error for unknown Blocks – export"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `@export nonexistant;`;

    return assertError(
      InvalidBlockSyntax,
      `Cannot export Block "nonexistant". No Block named "nonexistant" in "test.css". (test.css:1:1)`,
      this.process("test.css", inputCSS, {importer: imports.importer()}),
    );
  }

  @test async "throws error for unknown Blocks – import"() {
    let imports = new MockImportRegistry();
    imports.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `@block ( nonexistant ) from "./a.css";`;

    return assertError(
      InvalidBlockSyntax,
      `Cannot import Block "nonexistant". No Block named "nonexistant" exported by "./a.css". (test.css:1:1)`,
      this.process("test.css", inputCSS, {importer: imports.importer()}),
    );
  }
}

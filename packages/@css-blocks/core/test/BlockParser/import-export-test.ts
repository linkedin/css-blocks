import * as path from "path";

import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { InvalidBlockSyntax, MockImporter } from "../../src";

import { BEMProcessor } from "../util/BEMProcessor";

const ROOT = path.join(__dirname, "../../..");

@suite("Block Import and Exports")
export class BlockImportExport extends BEMProcessor {
  @test "can import another block"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "foo/bar/imported.css",
      `:scope { color: purple; }
       :scope[state|large] { font-size: 20px; }
       :scope[state|theme=red] { color: red; }
       .foo   { float: left;   }
       .foo[state|small] { font-size: 5px; }
       .foo[state|font=fancy] { font-family: fancy; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block imported from "./imported.css";
                    @block-debug imported to comment;
                    :scope { color: red; }
                    .b[state|big] {color: blue;}`;

    return this.process(filename, inputCSS, { importer }).then((result) => {
      importer.assertImported("foo/bar/imported.css");
      assert.deepEqual(
        result.css.toString(),
        `/* Source: foo/bar/imported.css\n` +
        "   :scope => .imported\n" +
        "   .foo => .imported__foo\n" +
        "   .foo[state|font=fancy] => .imported__foo--font-fancy\n" +
        "   .foo[state|small] => .imported__foo--small\n" +
        "   :scope[state|large] => .imported--large\n" +
        "   :scope[state|theme=red] => .imported--theme-red */\n" +
        ".test-block { color: red; }\n" +
        ".test-block__b--big { color: blue; }\n",
      );
    });
  }

  @test "can import another block under a local alias using as syntax"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: phoebe; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block (default as imported) from "./imported.css";
                    @block-debug imported to comment;`;

    return this.process(filename, inputCSS, { importer }).then((result) => {
      importer.assertImported("foo/bar/imported.css");
      assert.deepEqual(
        result.css.toString(),
        `/* Source: foo/bar/imported.css\n   :scope => .phoebe */\n`,
      );
    });
  }

  @test "if blocks specify name independently of filename, imported name is still used for ref locally"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: snow-flake; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block foobar from "./imported.css";
                    @block-debug foobar to comment;`;

    return this.process(filename, inputCSS, { importer }).then((result) => {
      importer.assertImported("foo/bar/imported.css");
      assert.deepEqual(
        result.css.toString(),
        `/* Source: foo/bar/imported.css\n` +
        "   :scope => .snow-flake */\n",
      );
    });
  }

  @test "local block names in double quotes in @block fail parse with helpful error"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: block; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block "snow-flake" from "./imported.css";
                    @block-debug block to comment;`;

    return this.assertError(
      InvalidBlockSyntax,
      `Illegal block name in import. ""snow-flake"" is not a legal CSS identifier. (foo/bar/test-block.css:1:1)`,
      this.process(filename, inputCSS, { importer }),
    );
  }

  @test "local block names in single quotes in @block fail parse with helpful error"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: block; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block 'snow-flake' from "./imported.css";
                    @block-debug snow-flake to comment;`;

    return this.assertError(
      InvalidBlockSyntax,
      `Illegal block name in import. "'snow-flake'" is not a legal CSS identifier. (foo/bar/test-block.css:1:1)`,
      this.process(filename, inputCSS, { importer }),
    );

  }

  @test "doesn't allow non-css-ident names in import"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: block; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block 123 from "./imported.css";`;

    return this.assertError(
      InvalidBlockSyntax,
      `Illegal block name in import. "123" is not a legal CSS identifier. (foo/bar/test-block.css:1:1)`,
      this.process(filename, inputCSS, { importer }));
  }

  @test "requires from statement in @block"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "foo/bar/imported.css",
      `:scope { block-name: block; }`,
    );

    let filename = "foo/bar/test-block.css";
    let inputCSS = `@block "./imported.css";`;

    return this.assertError(
      InvalidBlockSyntax,
      'Malformed block reference: `@block "./imported.css"` (foo/bar/test-block.css:1:1)',
      this.process(filename, inputCSS, { importer }));
  }

  @test async "able to export under same alias"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    importer.registerSource(
      "imported.css",
      `
        @block a from "./a.css";
        :scope { block-name: block-b; }
        @export a;
      `,
    );

    let inputCSS = `@block ( a ) from "./imported.css";
                    @block-debug a to comment;`;
    let result = await this.process("test.css", inputCSS, { importer });
    return assert.equal(
      result.css,
      `/* Source: a.css\n   :scope => .block-a */\n`,
    );
  }

  @test async "able to export under external alias of same name"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    importer.registerSource(
      "imported.css",
      `
        @block a from "./a.css";
        :scope { block-name: imported-block; }
        @export ( a as a );
      `,
    );

    let inputCSS = `@block ( a ) from "./imported.css";
                    @block-debug a to comment;`;
    let result = await this.process("test.css", inputCSS, { importer });
    return assert.equal(
      result.css,
      `/* Source: a.css\n   :scope => .block-a */\n`,
    );
  }

  @test async "able to export under external alias of different name"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    importer.registerSource(
      "imported.css",
      `
        @block a from "./a.css";
        :scope { block-name: imported-block; }
        @export ( a as foo );
      `,
    );

    let inputCSS = `@block ( foo ) from "./imported.css";
                    @block-debug foo to comment;`;
    let result = await this.process("test.css", inputCSS, { importer });
    return assert.equal(
      result.css,
      `/* Source: a.css\n   :scope => .block-a */\n`,
    );
  }

  @test async "exports rely on imported alias"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    importer.registerSource(
      "imported.css",
      `
        @block ( default as foo ) from "./a.css";
        :scope { block-name: imported-block; }
        @export ( foo as bar );
      `,
    );

    let inputCSS = `@block ( bar ) from "./imported.css";
                    @block-debug bar to comment;`;
    let result = await this.process("test.css", inputCSS, { importer });
    return assert.equal(
      result.css,
      `/* Source: a.css\n   :scope => .block-a */\n`,
    );
  }

  @test async "able to export multiple blocks under external alias of different name"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    importer.registerSource(
      "b.css",
      `:scope { block-name: block-b; }`,
    );
    importer.registerSource(
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
    let result = await this.process("test.css", inputCSS, { importer });
    return assert.equal(
      result.css,
      `/* Source: a.css\n   :scope => .block-a */\n` +
      `/* Source: b.css\n   :scope => .block-b */\n`,
    );
  }
  @test async "able to export without parens"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    importer.registerSource(
      "b.css",
      `:scope { block-name: block-b; }`,
    );
    importer.registerSource(
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
    let result = await this.process("test.css", inputCSS, { importer });
    return assert.equal(
      result.css,
      `/* Source: a.css\n   :scope => .block-a */\n` +
      `/* Source: b.css\n   :scope => .block-b */\n`,
    );
  }

  @test async "able to export multiple blocks using mixed methods"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    importer.registerSource(
      "b.css",
      `:scope { block-name: block-b; }`,
    );
    importer.registerSource(
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
    let result = await this.process("test.css", inputCSS, { importer });
    return assert.equal(
      result.css,
      `/* Source: a.css\n   :scope => .block-a */\n` +
      `/* Source: b.css\n   :scope => .block-b */\n`,
    );
  }

  @test async "multiple export calls work"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    importer.registerSource(
      "b.css",
      `:scope { block-name: block-b; }`,
    );
    importer.registerSource(
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
    let result = await this.process("test.css", inputCSS, { importer });
    return assert.equal(
      result.css,
      `/* Source: a.css\n   :scope => .block-a */\n` +
      `/* Source: b.css\n   :scope => .block-b */\n`,
    );
  }

  @test async "export formats may be mixed and matched"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );
    importer.registerSource(
      "b.css",
      `:scope { block-name: block-b; }`,
    );
    importer.registerSource(
      "c.css",
      `:scope { block-name: block-c; }`,
    );
    importer.registerSource(
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
    let result = await this.process("test.css", inputCSS, { importer });
    return assert.equal(
      result.css,
      `/* Source: a.css\n   :scope => .block-a */\n` +
      `/* Source: b.css\n   :scope => .block-b */\n` +
      `/* Source: c.css\n   :scope => .block-c */\n`,
    );
  }

  @test async "default is a reserved word – bare imports"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `@block default from "./a.css";`;

    return this.assertError(
      InvalidBlockSyntax,
      `Default Block from "./a.css" must be aliased to a unique local identifier. (test.css:1:1)`,
      this.process("test.css", inputCSS, { importer }),
    );
  }

  @test async "default is a reserved word – named imports"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `@block ( a as default ) from "./a.css";`;

    return this.assertError(
      InvalidBlockSyntax,
      `Can not import "a" as reserved word "default" (test.css:1:1)`,
      this.process("test.css", inputCSS, { importer }),
    );
  }

  @test async "default is a reserved word – bare exports"() {
    let importer = new MockImporter(ROOT);

    let inputCSS = `
      :scope {
        block-name: imports;
      }
      @export default;
    `;

    return this.assertError(
      InvalidBlockSyntax,
      `Unnecessary re-export of default Block. (test.css:5:7)`,
      this.process("test.css", inputCSS, { importer }),
    );
  }

  @test async "default is a reserved word – named exports"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `
      @block a from "./a.css";
      @export ( a as default );
    `;

    return this.assertError(
      InvalidBlockSyntax,
      `Can not export "a" as reserved word "default" (test.css:3:7)`,
      this.process("test.css", inputCSS, { importer }),
    );
  }

  @test async "Block export must be an identifier"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `
      @block a from "./a.css";
      @export ( a as 123 );
    `;

    return this.assertError(
      InvalidBlockSyntax,
      `Illegal block name in import. "123" is not a legal CSS identifier. (test.css:3:7)`,
      this.process("test.css", inputCSS, { importer }),
    );
  }

  @test async "throws error for unknown Blocks – export"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `@export nonexistant;`;

    return this.assertError(
      InvalidBlockSyntax,
      `Can not export Block "nonexistant". No Block named "nonexistant" in "test.css". (test.css:1:1)`,
      this.process("test.css", inputCSS, { importer }),
    );
  }

  @test async "throws error for unknown Blocks – import"() {
    let importer = new MockImporter(ROOT);
    importer.registerSource(
      "a.css",
      `:scope { block-name: block-a; }`,
    );

    let inputCSS = `@block ( nonexistant ) from "./a.css";`;

    return this.assertError(
      InvalidBlockSyntax,
      `Can not import Block "nonexistant". No Block named "nonexistant" exported by "./a.css". (test.css:1:1)`,
      this.process("test.css", inputCSS, { importer }),
    );
  }
}

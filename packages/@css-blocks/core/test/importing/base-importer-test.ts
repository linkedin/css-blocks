import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { ImportedFile, Syntax } from "../../src";
import { BaseImporter } from "../../src/importing/BaseImporter";
import { ImportedCompiledCssFileContents } from "../../src/importing/Importer";

class FakeImporter extends BaseImporter {
  identifier(): string {
    throw new Error("Method not implemented.");
  }
  import(): Promise<ImportedFile> {
    throw new Error("Method not implemented.");
  }
  defaultName(): string {
    throw new Error("Method not implemented.");
  }
  filesystemPath(): string | null {
    throw new Error("Method not implemented.");
  }
  debugIdentifier(): string {
    throw new Error("Method not implemented.");
  }
  syntax(): Syntax {
    throw new Error("Method not implemented.");
  }
  callIsCompiledBlockCSS(contents: string): boolean {
    return this.isCompiledBlockCSS(contents);
  }
  callSegmentizeCompiledBlockCSS(contents: string): ImportedCompiledCssFileContents {
    return this.segmentizeCompiledBlockCSS(contents);
  }
}

const compiledSourceContents =
`
// Pre-block content!
/*#css-blocks test-block*/
.test-block {
  color: #F00;
}
/*#blockDefinitionURL=test-block.block*/
/*#css-blocks end*/
// Post-block content!
`;

const plainCssContents =
`
.test-block {
  color: #F00;
}
`;

@suite("importing/BaseImporter")
export class CompiledCommentsTests {

  @test "isCompiledBlockCSS > Returns true if all comments are present"() {
    const importer = new FakeImporter();
    assert.ok(importer.callIsCompiledBlockCSS(compiledSourceContents));
  }

  @test "isCompiledBlockCSS > Returns false if comments are not present"() {
    const importer = new FakeImporter();
    assert.notOk(importer.callIsCompiledBlockCSS(plainCssContents));
  }

  @test "segmentizeCompiledBlockCSS > Breaks apart compiled source file into proper segments"() {
    const importer = new FakeImporter();
    const result = importer.callSegmentizeCompiledBlockCSS(compiledSourceContents);

    assert.equal(result.pre.trim(), "// Pre-block content!", "Pre-block content matches");
    assert.equal(result.blockId, "test-block", "Block ID matches");
    assert.equal(result.blockCssContents.trim(), plainCssContents.trim(), "Block contents matches");
    assert.equal(result.definitionUrl, "test-block.block", "Definition URL matches");
    assert.equal(result.post.trim(), "// Post-block content!", "Post-block content matches");
  }

  @test "segmentizeCompiledBlockCSS > Throws if the file contents aren't a compiled CSS source"() {
    const importer = new FakeImporter();
    assert.throw(() => {
      importer.callSegmentizeCompiledBlockCSS(plainCssContents);
    });
  }

}

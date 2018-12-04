import { assert } from "chai";
import * as fs from "fs";
import { suite, test } from "mocha-typescript";
import * as path from "path";

import mock from "../src/testing/transient-fs";

@suite("transient-fs")
export class TransientFsTest {
  @test "can write and clean up files"() {
    mock({
      "a-file.txt": "file content",
    });
    let contents = fs.readFileSync("a-file.txt", "utf-8");
    assert.equal(contents, "file content");
    mock.restore();
    assert.isFalse(fs.existsSync("a-file.txt"));
  }
  @test "can write and clean up directories and files"() {
    mock({
      "a-dir": {
        "a-file.txt": "file content",
      },
      "another-dir": {
        "file-2.txt": "file content two",
      },
      "top-file.txt": "file content three",
    });
    let contents = fs.readFileSync(path.join("a-dir", "a-file.txt"), "utf-8");
    assert.equal(contents, "file content");
    contents = fs.readFileSync(path.join("another-dir", "file-2.txt"), "utf-8");
    assert.equal(contents, "file content two");
    contents = fs.readFileSync("top-file.txt", "utf-8");
    assert.equal(contents, "file content three");
    mock.restore();
    assert.isFalse(fs.existsSync("a-dir"));
    assert.isFalse(fs.existsSync("a-dir/a-file.txt"));
    assert.isFalse(fs.existsSync("another-dir"));
    assert.isFalse(fs.existsSync("another-dir/file-2.txt"));
    assert.isFalse(fs.existsSync("top-file.txt"));
  }
  @test "can restore no files"() {
    assert.equal(mock._files.length, 0);
    mock.restore();
  }
}

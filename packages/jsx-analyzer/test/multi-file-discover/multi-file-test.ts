import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import { MetaAnalysis } from '../../src/utils/Analysis';
import { parseFile } from '../../src/index';

const path = require('path');

@suite('Dependnecy Tree Crawling')
export class Test {

  @test 'All blocks are discovered in multi-file app from entrypoint'(){
    let base = path.resolve(__dirname, '../../../test/fixtures/basic-multifile');
    return parseFile('index.tsx', { baseDir: base }).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.fileCount(), 2);
      assert.equal(Object.keys(analysis.getAnalysis(0).blocks).length, 1);
      assert.equal(Object.keys(analysis.getAnalysis(1).blocks).length, 1);
      assert.equal(analysis.getStyles().size, 4);
    });
  }

  @test 'Duplicate blocks are only parsed once'(){
    let base = path.resolve(__dirname, '../../../test/fixtures/duplicate-blocks-multifile');
    return parseFile('index.tsx', { baseDir: base }).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.fileCount(), 2);
      assert.equal(analysis.blockCount(), 1);
      assert.equal(analysis.blockPromisesCount(), 1);
      assert.equal(analysis.getStyles().size, 3);
    });
  }

  @test 'Dependency Tree Crawling finds dependents of dependents'(){
    let base = path.resolve(__dirname, '../../../test/fixtures/deep-multifile');
    return parseFile('index.tsx', { baseDir: base }).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.fileCount(), 3);
      assert.equal(analysis.blockCount(), 3);
      assert.equal(analysis.blockPromisesCount(), 3);
      assert.equal(analysis.getStyles().size, 5);
    });
  }

  @test 'Conflicting local import names don\'t interfere with each other'(){
    let base = path.resolve(__dirname, '../../../test/fixtures/conflicting-local-multifile');
    return parseFile('index.tsx', { baseDir: base }).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.fileCount(), 2);
      assert.equal(analysis.blockCount(), 2);
      assert.equal(analysis.getStyles().size, 4);
    });
  }
}

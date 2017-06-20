import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import Analysis from '../../src/utils/Analysis';
import { parseFile } from '../../src/index';

const path = require('path');

@suite('Dependnecy Tree Crawling')
export class Test {

  @test 'All blocks are discovered in multi-file app from entrypoint'(){
    let base = path.resolve(__dirname, '../../../test/fixtures/basic-multifile');
    return parseFile('index.tsx', { baseDir: base }).then((analysis: Analysis) => {
      assert.equal(Object.keys(analysis.blocks).length, 2);
      assert.equal(analysis.stylesFound.size, 4);
      assert.equal(analysis.files.length, 2);
    });
  }

  @test 'Duplicate blocks are only parsed once'(){
    let base = path.resolve(__dirname, '../../../test/fixtures/duplicate-blocks-multifile');
    return parseFile('index.tsx', { baseDir: base }).then((analysis: Analysis) => {
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(Object.keys(analysis.blockPromises).length, 1);
      assert.equal(analysis.stylesFound.size, 3);
      assert.equal(analysis.files.length, 2);
    });
  }

  @test 'Dependency Tree Crawling finds dependents of dependents'(){
    let base = path.resolve(__dirname, '../../../test/fixtures/deep-multifile');
    return parseFile('index.tsx', { baseDir: base }).then((analysis: Analysis) => {
      assert.equal(Object.keys(analysis.blocks).length, 3);
      assert.equal(Object.keys(analysis.blockPromises).length, 3);
      assert.equal(analysis.stylesFound.size, 5);
      assert.equal(analysis.files.length, 3);
    });
  }

  @test 'Conflicting local import names don\'t interfere with each other'(){
    let base = path.resolve(__dirname, '../../../test/fixtures/conflicting-local-multifile');
    return parseFile('index.tsx', { baseDir: base }).then((analysis: Analysis) => {
      assert.equal(Object.keys(analysis.blocks).length, 2);
      assert.equal(analysis.stylesFound.size, 4);
      assert.equal(analysis.files.length, 2);
    });
  }
}

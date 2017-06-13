import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import Analysis from '../../src/Analysis';
import { parse } from '../../src/index';

const mock = require('mock-fs');

@suite('Inline Objstr Class Styles')
export class Test {

  @test 'Inline objstrs with classes are tracked when applied'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      <div class={ objstr({ [bar.foo]: 'bar', biz: 'baz' }) }></div>;
    `
    ).then((analysis: Analysis) => {
      mock.restore();
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 1);
      let styleIter = analysis.stylesFound.entries();
      assert.equal(styleIter.next().value[0].asSource(), '.foo');
      assert.equal(analysis.styleCorrelations.length, 1);
      assert.equal(analysis.styleCorrelations[0].size, 1);
    });
  }

  @test 'Multiple classes from the same block on objstrs are tracked when applied'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; } .baz { color: red; }'
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      <div class={ objstr({ [bar.foo]: 'bar', [bar.baz]: 'baz', biz: 'baz' }) }></div>;
    `
    ).then((analysis: Analysis) => {
      mock.restore();
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 2);
      let styleIter = analysis.stylesFound.entries();
      assert.equal(styleIter.next().value[0].asSource(), '.foo');
      assert.equal(styleIter.next().value[0].asSource(), '.baz');
      assert.equal(analysis.styleCorrelations.length, 1);
      assert.equal(analysis.styleCorrelations[0].size, 2);
    });
  }

  @test 'Multiple classes from differnet blocks on objstrs are tracked when applied'(){
    mock({
      'foo.block.css': '.root { color: red; } .biz { color: blue; } .baz { color: red; }',
      'bar.block.css': '.root { color: red; } .biz { color: blue; } .baz { color: red; }'
    });

    return parse(`
      import foo from 'foo.block.css';
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      <div class={objstr( { [foo.biz]: 'bar', [bar.baz]: 'baz', [foo.baz]: 'baz', [bar.biz]: 'baz', biz: 'baz' } )}></div>;
    `
    ).then((analysis: Analysis) => {
      mock.restore();
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 2);
      assert.equal(analysis.stylesFound.size, 4);
      let styleIter = analysis.stylesFound.entries();
      assert.equal(styleIter.next().value[0].asSource(), '.biz');
      assert.equal(styleIter.next().value[0].asSource(), '.baz');
      assert.equal(styleIter.next().value[0].asSource(), '.baz');
      assert.equal(styleIter.next().value[0].asSource(), '.biz');
      assert.equal(analysis.styleCorrelations.length, 1);
      assert.equal(analysis.styleCorrelations[0].size, 4);
    });
  }

  @test 'Non-computed properties on objstr calls are ignored'(){
    mock({
      'foo.block.css': '.root { color: red; } .biz { color: blue; } .baz { color: red; }',
    });

    return parse(`
      import foo from 'foo.block.css';
      import objstr from 'obj-str';
      <div class={objstr({ 'foo.biz': 'bar' })}></div>;
    `
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 0);
    });
  }

  @test 'Inline Objstr function name may be renamed at import'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css';
      import * as foobar from 'obj-str';
      <div class={foobar({ [bar.foo]: 'bar', biz: 'baz' })}></div>;
    `
  ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 1);
    });
  }

  @test 'Objstr call throws if objstr is not imported'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css';
      <div class={ objstr({ [bar.foo]: 'bar', biz: 'baz' }) }></div>;
    `
  ).catch((err: Error) => {
      mock.restore();
      assert.equal(err.message, `Variable "objstr" is undefined`);
    });
  }

  @test 'Objstr lookup understands scope'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      () => {
        let objstr = function(){};
        <div class={ objstr({ [bar.foo]: 'bar', biz: 'baz' }) }></div>;
      }
    `
  ).catch((err: Error) => {
      mock.restore();
      assert.equal(err.message, `Class attribute value 'style' must be either an 'objstr' call, or a Block reference`);
    });
  }

}

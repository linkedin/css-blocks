import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import { MetaAnalysis } from '../../src/utils/Analysis';
import { testParse as parse } from '../util';

const mock = require('mock-fs');

@suite('Dynamic Styles')
export class Test {

  @test 'Objstr where value is a literal are not marked dynamic'(){
    mock({
      'bar.block.css': `
        .str { color: red; }
        .int { color: blue; }
        .bool { color: blue; }
        .null { color: blue; }
        .regexp { color: blue; }
        .template { color: blue; }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let val = 'test';
      function render(){
        let style = objstr({
          [bar]: 'static root',
          [bar.str]: 'str',
          [bar.int]: 1,
          [bar.bool]: true,
          [bar.null]: null,
          [bar.regexp]: /regexp/,
          [bar.template]: \`template\`
        });
        return ( <div class={style}></div> );
      }`
    ).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getStyles().size, 7);
      assert.equal(analysis.getDynamicStyles().size, 0);
    });
  }

  @test 'Objstr where value is a not a literal are marked dynamic'(){
    mock({
      'bar.block.css': `
        .expr { color: red; }
        .equality { color: blue; }
        .bool { color: blue; }
        .new { color: blue; }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let val = 'test';
      function render(){
        let style = objstr({
          [bar]: alert(),
          [bar.expr]: val,
          [bar.equality]: val === test,
          [bar.bool]: val && val,
          [bar.new]: new Object()
        });
        return ( <div class={style}></div> );
      }`
    ).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getStyles().size, 5);
      assert.equal(analysis.getDynamicStyles().size, 5);
    });
  }

  @test 'Inline objstr where value is a literal are not marked dynamic'(){
    mock({
      'bar.block.css': `
        .str { color: red; }
        .int { color: blue; }
        .bool { color: blue; }
        .null { color: blue; }
        .regexp { color: blue; }
        .template { color: blue; }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let val = 'test';
      function render(){
        return ( <div class={objstr( { [bar]: 'static root', [bar.str]: 'str', [bar.int]: 1, [bar.bool]: true, [bar.null]: null, [bar.regexp]: /regexp/, [bar.template]: \`template\` })}></div> );
      }`
    ).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getStyles().size, 7);
      assert.equal(analysis.getDynamicStyles().size, 0);
    });
  }

  @test 'Inline objstr where value is a not a literal are marked dynamic'(){
    mock({
      'bar.block.css': `
        .expr { color: red; }
        .equality { color: blue; }
        .bool { color: blue; }
        .new { color: blue; }
      `
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';
      let val = 'test';
      function render(){
        return ( <div class={ objstr({ [bar]: alert(), [bar.expr]: val, [bar.equality]: val === test, [bar.bool]: val && val, [bar.new]: new Object() }) }></div> );
      }`
    ).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getStyles().size, 5);
      assert.equal(analysis.getDynamicStyles().size, 5);
    });
  }
}

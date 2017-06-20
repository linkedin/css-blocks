import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';
import Analysis from '../../src/utils/Analysis';
import { parse } from '../../src/index';

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
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 7);
      assert.equal(analysis.dynamicStyles.size, 0);
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
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 5);
      assert.equal(analysis.dynamicStyles.size, 5);
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
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 7);
      assert.equal(analysis.dynamicStyles.size, 0);
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
    ).then((analysis: Analysis) => {
      mock.restore();
      assert.equal(Object.keys(analysis.blocks).length, 1);
      assert.equal(analysis.stylesFound.size, 5);
      assert.equal(analysis.dynamicStyles.size, 5);
    });
  }
}

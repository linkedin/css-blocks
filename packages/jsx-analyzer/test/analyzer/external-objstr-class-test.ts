import { assert } from 'chai';
import { suite, test, skip } from 'mocha-typescript';
import { MetaAnalysis } from '../../src/utils/Analysis';
import { testParse as parse } from '../util';

const mock = require('mock-fs');

@suite('Analyzer | External Objstr Class Styles')
export class Test {

  @skip
  @test 'Classes on objstrs are tracked when applied'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr({
        [bar.foo]: 'bar',
        biz: 'baz'
      });

      <div class={style}></div>;
    `
    ).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 1);
      // TODO
      // let styleIter = analysis.getAnalysis(0).stylesFound.entries();
      // assert.equal(styleIter.next().value[0].asSource(), '.foo');
      assert.equal(analysis.getAnalysis(0).elementCount(), 1);
      assert.equal(analysis.getAnalysis(0).getElement(0).static.size, 1);
    });
  }

  @test 'Empty objstr calls throw'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr();

      <div class={style}></div>;
    `
    ).catch((err: Error) => {
      mock.restore();
      assert.equal(err.message, '[css-blocks] AnalysisError: First argument passed to "objstr" call must be an object literal. (5:18)');
    });
  }

  @test 'Objstr calls with non-object-literal input throw'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr(foobar);

      <div class={style}></div>;
    `
    ).catch((err: Error) => {
      mock.restore();
      assert.equal(err.message, '[css-blocks] AnalysisError: First argument passed to "objstr" call must be an object literal. (5:18)');
    });
  }

  @skip
  @test 'Multiple classes from the same block on objstrs are tracked when applied'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; } .baz { color: red; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr({
        [bar.foo]: 'bar',
        [bar.baz]: 'baz',
        biz: 'baz'
      });

      <div class={style}></div>;
    `
    ).then((analysis: MetaAnalysis) => {
      mock.restore();
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 2);
      // TODO
      // let styleIter = analysis.getAnalysis(0).stylesFound.entries();
      // assert.equal(styleIter.next().value[0].asSource(), '.foo');
      // assert.equal(styleIter.next().value[0].asSource(), '.baz');
      assert.equal(analysis.getAnalysis(0).elementCount(), 1);
      assert.equal(analysis.getAnalysis(0).getElement(0).static.size, 2);
    });
  }

  @skip
  @test 'Multiple classes from differnet blocks on objstrs are tracked when applied'(){
    mock({
      'foo.block.css': '.root { color: red; } .biz { color: blue; } .baz { color: red; }',
      'bar.block.css': '.root { color: red; } .biz { color: blue; } .baz { color: red; }'
    });

    return parse(`
      import foo from 'foo.block.css'
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr({
        [foo.biz]: 'bar',
        [bar.baz]: 'baz',
        [foo.baz]: 'baz',
        [bar.biz]: 'baz',
        biz: 'baz'
      });

      <div class={style}></div>;
    `
    ).then((analysis: MetaAnalysis) => {
      mock.restore();
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 2);
      assert.equal(analysis.getAnalysis(0).styleCount(), 4);
      // TODO
      // let styleIter = analysis.getAnalysis(0).stylesFound.entries();
      // assert.equal(styleIter.next().value[0].asSource(), '.biz');
      // assert.equal(styleIter.next().value[0].asSource(), '.baz');
      // assert.equal(styleIter.next().value[0].asSource(), '.baz');
      // assert.equal(styleIter.next().value[0].asSource(), '.biz');
      assert.equal(analysis.getAnalysis(0).elementCount(), 1);
      assert.equal(analysis.getAnalysis(0).getElement(0).static.size, 4);
    });
  }

  @test 'Non-computed properties on objstr calls are ignored'(){
    mock({
      'foo.block.css': '.root { color: red; } .biz { color: blue; } .baz { color: red; }',
    });

    return parse(`
      import foo from 'foo.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        'foo.biz': 'bar'
      });

      <div class={style}></div>;
    `
    ).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 0);
    });
  }

  @test 'Objstr function name may be renamed at import'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      import * as foobar from 'obj-str';

      let style = foobar({
        [bar.foo]: 'bar',
        biz: 'baz'
      });

      <div class={style}></div>;
    `
  ).then((analysis: MetaAnalysis) => {
      mock.restore();
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 1);
    });
  }

  @test 'Objstr call throws if objstr is not imported'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'

      let style = objstr({
        [bar.foo]: 'bar',
        biz: 'baz'
      });

      <div class={style}></div>;
    `
  ).catch((err: Error) => {
      mock.restore();
      assert.equal(err.message, `Variable "objstr" is undefined`);
    });
  }

  @test 'Overly complex expressions to reference a CSS Block throw'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      function test(){ return 'foo'; }

      let style = objstr({
        [bar[test()]]: 'bar',
        biz: 'baz'
      });

      <div class={style}></div>;
    `
  ).catch((err: Error) => {
      mock.restore();
      assert.equal(err.message, `Cannot parse overly complex expression to reference a CSS Block.`);
    });
  }

  @test 'Objstr lookup understands scope'(){
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }'
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr({
        [bar.foo]: 'bar',
        biz: 'baz'
      });

      () => {
        let style = 'foo';
        <div class={style}></div>;
      }
    `
  ).catch((err: Error) => {
      mock.restore();
      assert.equal(err.message, 'Class attribute value "style" must be either an "objstr" call, or a Block reference');
    });
  }

}

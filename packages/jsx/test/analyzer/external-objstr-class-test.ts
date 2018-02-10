import { assert } from 'chai';
import { suite, test } from 'mocha-typescript';

import { MetaAnalysis } from '../../src/utils/Analysis';
import { testParse as parse } from '../util';

const mock = require('mock-fs');

@suite('Analyzer | External Objstr Class Styles')
export class Test {
  after() {
    mock.restore();
  }

  @test 'Can set className dynamically'() {
    mock({
      'bar.block.css': `
        .root { color: red; }
        .foo { color: blue; }
        .foo[state|happy] { color: balloons; }
      `,
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      function doesSomething(element) {
        element.className = objstr({
          [bar.foo]: true,
        });
        let style = objstr({
          [bar.foo]: true,
          [bar.foo.happy()]: true
        });
        element.className = bar;
        element.className = style;
      }
    `,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      assert.deepEqual(analysis.stylesFound, ['bar.foo', 'bar.foo[state|happy]', 'bar.root']);

      let aAnalysis = analysis.elements.a;
      assert.deepEqual(aAnalysis.dynamicClasses, []);
      assert.deepEqual(aAnalysis.dynamicStates, []);
      assert.deepEqual(aAnalysis.staticStyles, [0]);

      let bAnalysis = analysis.elements.b;
      assert.deepEqual(bAnalysis.dynamicClasses, []);
      assert.deepEqual(bAnalysis.dynamicStates, []);
      assert.deepEqual(bAnalysis.staticStyles, [2]);

      let cAnalysis = analysis.elements.c;
      assert.deepEqual(cAnalysis.dynamicClasses, []);
      assert.deepEqual(cAnalysis.dynamicStates, []);
      assert.deepEqual(cAnalysis.staticStyles, [0, 1]);
    });
  }

  @test 'Classes on objstr calls are tracked when applied'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }',
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr({
        [bar.foo]: true,
      });

      <div class={style}></div>;
    `,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0]);
      assert.deepEqual(analysis.stylesFound, ['bar.foo']);
    });
  }

  @test 'Empty objstr calls throw'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }',
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr();

      <div class={style}></div>;
    `,
    ).catch((err: Error) => {
      assert.equal(err.message, '[css-blocks] AnalysisError: First argument passed to "objstr" call must be an object literal. (5:18)');
    });
  }

  @test 'Objstr calls with non-object-literal input throw'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }',
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr(foobar);

      <div class={style}></div>;
    `,
    ).then(
      (analysis: MetaAnalysis) => {
        assert.ok(false, 'should not have succeeded.');
      },
      (err) => {
        assert.equal(err.message, '[css-blocks] AnalysisError: First argument passed to "objstr" call must be an object literal. (5:18)');
      });
  }

  @test 'Multiple classes from the same block on objstr calls are an error.'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; } .baz { color: red; }',
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr({
        [bar.foo]: true,
        [bar.baz]: true,
      });

      <div class={style}></div>;
    `,
    ).then(
      (analysis: MetaAnalysis) => {
        assert.ok(false, 'should not have succeeded.');
      },
      (err) => {
        assert.equal(err.message, '[css-blocks] TemplateError: Classes "baz" and "foo" from the same block are not allowed on the same element at the same time. (:10:6)');
      });
  }

  @test 'Multiple classes from different blocks on objstr calls are tracked when applied'() {
    mock({
      'foo.block.css': '.root { color: red; } .biz { color: blue; } .baz { color: red; }',
      'bar.block.css': '.root { color: red; } .biz { color: blue; } .baz { color: red; }',
    });

    return parse(`
      import foo from 'foo.block.css'
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr({
        [foo.biz]: true,
        [bar.biz]: true,
      });

      <div class={style}></div>;
    `,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, [0, 1]);
      assert.deepEqual(analysis.stylesFound, ['bar.biz', 'foo.biz']);
    });
  }

  @test 'An objstr call with no css-block styles are allowed'() {
    mock({
      'foo.block.css': '.root { color: red; } .biz { color: blue; } .baz { color: red; }',
    });

    return parse(`
      import foo from 'foo.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        'abc': 'bar',
        'def': true,
      });

      <div class={style}></div>;
    `,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, []);
      assert.deepEqual(analysis.stylesFound, []);
    });
  }

  @test 'Objstr function name may be renamed at import'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }',
    });

    return parse(`
      import bar from 'bar.block.css'
      import foobar from 'obj-str';

      let style = foobar({
        [bar.foo]: true,
      });

      <div class={style}></div>;
    `,
  ).then((analysis: MetaAnalysis) => {
      assert.equal(analysis.blockDependencies().size, 1);
      assert.equal(analysis.getAnalysis(0).styleCount(), 1);
    });
  }

  @test 'Objstr call throws if objstr is not imported'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }',
    });

    return parse(`
      import bar from 'bar.block.css'

      let style = objstr({
        [bar.foo]: true,
      });

      <div class={style}></div>;
    `,
    ).then(
      (analysis: MetaAnalysis) => {
        assert.ok(false, 'should not have succeeded.');
      },
      (err) => {
        assert.equal(err.message, `[css-blocks] AnalysisError: Undefined function for styling: objstr (4:18)`);
      });
  }

  @test 'cannot set objstr to a new function'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }',
    });

    return parse(`
      import objstr from 'obj-str';
      import bar from 'bar.block.css'

      objstr = (obj) => '';

      let style = objstr({
        [bar.foo]: true,
      });

      <div class={style}></div>;
    `,
    ).then(
      (analysis: MetaAnalysis) => {
        assert.ok(false, 'should not have succeeded.');
      },
      (err) => {
        assert.equal(err.message, `[css-blocks] AnalysisError: Cannot override the objstr import of 'obj-str' (5:6)`);
      });
  }

  @test 'Overly complex expressions to reference a CSS Block throw'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }',
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
    `,
    ).then((analysis: MetaAnalysis) => {
      assert.ok(false, 'should not have succeeded.');
    },     (err) => {
      assert.equal(err.message, `[css-blocks] MalformedBlockPath: Nested expressions are not allowed in block expressions. (8:9)`);
    });
  }

  @test 'Objstr lookup understands scope'() {
    mock({
      'bar.block.css': '.root { color: red; } .foo { color: blue; }',
    });

    return parse(`
      import bar from 'bar.block.css'
      import objstr from 'obj-str';

      let style = objstr({
        [bar.foo]: true,
      });

      () => {
        let style = 'foo';
        <div class={style}></div>;
      }
    `,
    ).then((metaAnalysis: MetaAnalysis) => {
      let result = metaAnalysis.serialize();
      let analysis = result.analyses[0];
      let elementAnalysis = analysis.elements.a;
      assert.deepEqual(elementAnalysis.dynamicClasses, []);
      assert.deepEqual(elementAnalysis.dynamicStates, []);
      assert.deepEqual(elementAnalysis.staticStyles, []);
      assert.deepEqual(analysis.stylesFound, []);
    });
  }
}

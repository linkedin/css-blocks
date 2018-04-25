import { assert } from "chai";
import { suite, test } from "mocha-typescript";

import { CSSBlocksJSXAnalyzer as Analyzer } from "../../src/Analyzer";
import { testParse as parse } from "../util";

const mock = require("mock-fs");

@suite("Analyzer | Is able to parse typed files")
export class Test {
  after() {
    mock.restore();
  }

  @test "Is able to parse vanilla without a `jsx` extension."() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let style = objstr({
        [bar.pretty]: true,
        [bar.pretty.color("yellow")]: true
      });

      <div class={style}></div>;`,
                 "test-file.js",
                 { types: "none" },
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      assert.deepEqual(analysis.stylesFound, ["bar.pretty", "bar.pretty[state|color=yellow]"]);
    });
  }

  @test "Is able to parse typescript"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      function fooGood<T extends { x: number }>(obj: T): T {
        console.log(Math.abs(obj.x));
        return obj;
      }

      let color: string = "yellow";
      let isPretty: boolean = true;

      let num = (1 + 1) as number;

      let style = objstr({
        [bar.pretty]: isPretty,
        [bar.pretty.color(color)]: true
      });

      <div class={style}></div>;`,
                 "test-file.tsx",
                 { types: "typescript" },
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      assert.deepEqual(analysis.stylesFound, ["bar.pretty", "bar.pretty[state|color=yellow]"]);
    });
  }

  @test "Is able to parse flow"() {
    mock({
      "bar.block.css": `
        :scope { color: blue; }
        .pretty { color: red; }
        .pretty[state|color=yellow] {
          color: yellow;
        }
      `,
    });

    return parse(`
      import bar from 'bar.block.css';
      import objstr from 'obj-str';

      let color: string = "yellow";
      let isPretty: boolean = true;
      let num = (1 + 1 : number);

      function fooGood<T: { x: number }>(obj: T): T {
        console.log(Math.abs(obj.x));
        return obj;
      }

      /*::
        type MyAlias = {
          foo: number,
          bar: boolean,
          baz: string,
        };
      */

      let style = objstr({
        [bar.pretty]: isPretty,
        [bar.pretty.color(color)]: true
      });

      <div class={style}></div>;`,
                 "test-file.jsx",
                 { types: "flow" },
    ).then((analyzer: Analyzer) => {
      let result = analyzer.serialize();
      let analysis = result.analyses[0];
      assert.deepEqual(analysis.stylesFound, ["bar.pretty", "bar.pretty[state|color=yellow]"]);
    });
  }

}

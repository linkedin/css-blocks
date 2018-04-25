import { Data } from './index';

const data: Data = {
  cssExample: `
    .a {
      background-color: #ed2651;
      border: 0;
      border-radius: 2px;
      box-sizing: border-box;
      color: white;
      height: 24px;
      line-height: 24px;
      padding: 0 16px;
    }

    .b { overflow: hidden; }

    .c {
      background-color: white;
      color: #2e184a;
    }

    .d {
      line-height: 16px;
      padding: 0px 8px;
    }

    .e {
      width: 16px;
      margin-right: 8px;
    }

    .f { height: 16px; }

    /*
      Unused class \`.button__icon--animate\` has been removed
    */`,

  cssTooltips: [
    { label: "1", value: "All class names are minified", y: 2.4, x: 10 },
    { label: "2", value: "Any shared properties are pulled out into atomic classes", y: 23.4, x: 6 },
    { label: "3", value: "All un-used classes are removed completly!", y: 65.4, x: 8.2 }
  ],

  jsxExample: `
    import React from 'react';
    import objstr from 'obj-str';


    export default function Button({size, inverse, icon, children}){

      const style = objstr({
        ['a b']: true,
        ['c']: inverse,
        ['d f']: size === 'small'
      });

      return (
        <button className={style}>
          {icon && <span className='b e f'>{icon}</span>}
          {children}
        </button>
      );

    }`,

    jsxTooltips: [
      { label: "1", value: "Your templates are rewritten to use the optimized styles", y: 7.6, x: 6 }
    ],

    glimmerExample: `
      <button class={{🦄🦄🦄
        'a b'
        (if inverse 'c')
        (if (eq size 'small') 'd f')
      }}>
        {{#if icon}}
          <span class="b e f">
            {{icon}}
          </span>
        {{/if}}
        {{yield}}
      </button>
      `,

    glimmerTooltips: [
      { label: "1", value: "Your templates are rewritten to use the optimized styles and template logic", y: 6.6, x: 4.8 }
    ],
};

export default data;

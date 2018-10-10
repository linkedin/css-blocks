import { Data } from './index';

const data: Data = {
  cssExample: `
    .button {
      background-color: #ed2651;
      border: 0;
      border-radius: 2px;
      box-sizing: border-box;
      color: white;
      height: 24px;
      line-height: 24px;
      overflow: hidden;
      padding: 0 16px;
    }

    .button--inverse {
      background-color: white;
      color: #ed2651;
    }

    .button--size-small {
      height: 16px;
      line-height: 16px;
      padding: 0px 8px;
    }

    .button__icon {
      width: 16px;
      margin-right: 8px;
      overflow: hidden;
      height: 16px;
    }

    .button__icon--animate {
      animation: 3s ease-in 1s icon-animation;
    }`,

  cssTooltips: [
    { label: '1', value: "Every stylesheet is assigned a unique namespace", x: 14.2, y: 2.5 },
    { label: '2', value: "Your states and classes are rewritten to BEM style selectors", x: 21.6, y: 27.6 }
  ],

  jsxExample: `
    import React from 'react';
    import objstr from 'obj-str';


    export default function Button({size, inverse, icon, children}){

      const style = objstr({
        ['button']: true,
        ['button--inverse']: inverse,
        ['button--size-small']: size === 'small'
      });

      return (
        <button className={style}>
          {icon && <span className='button__icon'>{icon}</span>}
          {children}
        </button>
      );

    }`,

    jsxTooltips: [
      { label: '1', value: "The block import is removed. Blocks don't deliver their own runtime!", y: 7.6, x: 6 },
      { label: '2', value: "All styles are replaced inline with the static compiled class", y: 17.1, x: 6.2 }
    ],

    glimmerExample: `
      <button class={{🦄🦄🦄
        'button'
        (if inverse 'button--inverse')
        (if (eq size 'small') 'button--size-small')
      }}>
        {{#if icon}}
          <span class="button__icon">
            {{icon}}
          </span>
        {{/if}}
        {{yield}}
      </button>
      `,

    glimmerTooltips: [
      { label: '1', value: "Our real runtime is tiny and not very human readable, but is guaranteed to maintain your app logic", y: 6.6, x: 4.8 },
      { label: '2', value: "All styles are replaced inline with the static compiled class", y: 17.1, x: 6.2 }
    ],
};

export default data;

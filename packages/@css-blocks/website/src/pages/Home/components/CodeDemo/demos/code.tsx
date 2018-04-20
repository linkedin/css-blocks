import { Data } from './index';

const data: Data = {
  cssExample: `
    :scope {
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

    :scope[state|inverse] {
      background-color: white;
      color: #ed2651;
    }

    :scope[state|size=small] {
      height: 16px;
      line-height: 16px;
      padding: 0px 8px;
    }

    .icon {
      height: 16px;
      margin-right: 8px;
      overflow: hidden;
      width: 16px;
    }

    .icon[state|animate] {
      animation: 3s ease-in 1s icon-animation;
    }`,
  cssTooltips: [
    { label: "1", value: "Every component stylesheet may have a root style", y: 2.4, x: 13.3 },
    { label: "2", value: "Root styles may be modified by states", y: 27.6, x: 26 },
    { label: "3", value: "States may have one or more substate values", y: 38.2, x: 28.7 },
    { label: "4", value: "Blocks may contain other classes to be applied to sub-elements", y: 50.7, x: 12.7 },
    { label: "5", value: "Classes may also have states and substates", y: 65.4, x: 25.2 }
  ],
  jsxExample: `
    import React from 'react';
    import objstr from 'obj-str';
    import styles from 'button.block.css';

    export default function Button({size, inverse, icon, children}){

      const style = objstr({
        [styles]: true,
        [styles.inverse()]: inverse,
        [styles.size(size)]: true
      });

      return (
        <button class={style}>
          {icon && <span class={styles.icon}>{icon}</span>}
          {children}
        </button>
      );

    }`,

    jsxTooltips: [
      { label: "1", value: "Import your styles directly into your component", y: 6.7, x: 38.4 },
      { label: "2", value: "Use your imported block, classes and states just like any other class", y: 15, x: 26.6 },
      { label: "3", value: "Apply block classes to sub elements", y: 34.5, x: 33.2 }
    ],

    glimmerExample: `
    <button class="root" state:inverse={{inverse}} state:size={{size}}>
      {{#if icon}}
        <span class="icon">
          {{icon}}
        </span>
      {{/if}}
      {{yield}}
    </button>
    `
}

export default data;
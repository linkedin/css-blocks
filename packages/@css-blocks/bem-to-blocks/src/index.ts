import * as fs from "fs-extra";
import * as postcss from "postcss";
import * as parser from "postcss-selector-parser";

import { BemSelector, BlockClassSelector } from "./interface";
import { findLcs } from "./utils";
export declare type PostcssAny = unknown;

type BemSelectorMap = Map<string, BemSelector>;
type ElementToBemSelectorMap = Map<string, BemSelector[]>;
type BlockToBemSelectorMap  = Map<string, ElementToBemSelectorMap>;
type BemToBlockClassMap  = WeakMap<BemSelector, BlockClassSelector>;

const EMPTY_ELEMENT_PLACEHOLDER = "EMPTY-ELEMENT-PLACEHOLDER";

export function convertBemToBlocks(files: Array<string>): Promise<void>[] {
  let promises: Promise<void>[] = [];
  files.forEach(file => {
    fs.readFile(file, (_err, css) => {
      let output = postcss([bemToBlocksPlugin])
        .process(css, { from: file });
      // rewrite the file with the processed output
      promises.push(fs.writeFile(file, output.toString()));
    });
  });
  return promises;
}

/**
 * Iterates through a cache of bemSelectors and returns a map of bemSelector to
 * the blockClassName. This function optimises the states and subStates from the
 * name of the modifier present in the BEM selector
 * @param bemSelectorCache weakmap - BemSelectorMap
    BemSelector {
      block: 'jobs-hero',
      element: 'image-container',
      modifier: undefined }
    =>
    BlockClassName {
      class: // name of the element if present. If this is not present, then it is on the :scope
      state: // name of the modifiers HCF
      subState: // null if HCF is null
    }, // written to a file with blockname.block.css
 */
export function constructBlocksMap(bemSelectorCache: BemSelectorMap): BemToBlockClassMap {
  let blockListMap: BlockToBemSelectorMap = new Map();
  let resultMap: BemToBlockClassMap = new WeakMap();

  // create the resultMap and the blockListMap
  for (let bemSelector of bemSelectorCache.values()) {
    // create the new blockClass instance
    let blockClass: BlockClassSelector = new BlockClassSelector();
    if (bemSelector.element) {
      blockClass.class = bemSelector.element;
    }
    if (bemSelector.modifier) {
      blockClass.state = bemSelector.modifier;
    }
    // add this blockClass to the resultMap
    resultMap.set(bemSelector, blockClass);

    // add this selector to the blockList based on the block, and then the
    // element value
    let block = blockListMap.get(bemSelector.block);
    if (block) {
      if (bemSelector.element) {
        if (block.has(bemSelector.element)) {
          (block.get(bemSelector.element) as BemSelector[]).push(bemSelector);
        } else {
          block.set(bemSelector.element, new Array(bemSelector));
        }
      } else {
        // the modifier is on the block itself
        if (block.has(EMPTY_ELEMENT_PLACEHOLDER)) {
          (block.get(EMPTY_ELEMENT_PLACEHOLDER) as BemSelector[]).push(bemSelector);
        } else {
          block.set(EMPTY_ELEMENT_PLACEHOLDER, new Array(bemSelector));
        }
      }
    } else {
      // if there is no existing block, create the elementMap and the add it to
      // the blockMap
      let elementListMap = new Map();
      if (bemSelector.element) {
        elementListMap.set(bemSelector.element, new Array(bemSelector));
      } else {
        elementListMap.set(EMPTY_ELEMENT_PLACEHOLDER, new Array(bemSelector));
      }
      blockListMap.set(bemSelector.block, elementListMap);
    }
  }

  // optimize the blocks for sub-states, iterate through the blocks
  for (let elementListMap of blockListMap.values()) {
    // iterate through the elements
    for (let selList of elementListMap.values()) {
      let lcs: string;
      // find the longest common substring(LCS) in the list of selectors
      let modifiers = selList.length && selList.filter(sel => sel.modifier !== undefined);
      if (modifiers) {
        if (modifiers.length > 1) {
          lcs = findLcs(modifiers.map(sel => sel.modifier as string));
        }
        // update the states and substates with the LCS
        modifiers.forEach(sel => {
          let blockClass = resultMap.get(sel);
          if (blockClass && lcs) {
            blockClass.subState = (blockClass.state as string).replace(lcs, "");
            blockClass.state = lcs.replace(/-$/, "");
          }
        });
      }
    }
  }
  // TODO: detect if there is a scope node, if not create a new empty scope node
  return resultMap;
}


/**
 * PostCSS plugin for transforming BEM to CSS blocks
 */
export const bemToBlocksPlugin: postcss.Plugin<PostcssAny> = postcss.plugin("bem-to-blocks-plugin", (options) => {
  options = options || {};

  return (root, result) => {
    const bemSelectorCache: BemSelectorMap = new Map();


    const buildCache: parser.ProcessorFn = (selectors) => {
      selectors.walk((selector) => {
          // only iterate through classes
          if (parser.isClassName(selector)) {
            let bemSelector = new BemSelector(selector.value);
            if (bemSelector) {
              // add it to the cache so it's available for the next pass
              bemSelectorCache.set(selector.value, bemSelector);
            } else {
              console.error(`${selector} does not comply with BEM standards. Consider a refactor`);
            }
          }
      });
    };

    const rewriteSelectors: parser.ProcessorFn = (selectors) => {
      selectors.walk((selector) => {
        // we only need to modify class names. We can ignore everything else,
        // like existing attributes, pseudo selectors, comments, imports,
        // exports, etc
        if (parser.isClassName(selector)) {

          let bemSelector = bemSelectorCache.get(selector.value);
          // get the block class from the bemSelector
          let blockClassName = bemSelector && bemToBlockClassMap.get(bemSelector);

          // if the selector was previously cached
          if (blockClassName) {
            let stripSelector = false;

            if (blockClassName.class) {
              selector.value =  blockClassName.class;
            } else {
              //prepend a :scope node before this and remove this node later
              let newScopeNode = parser.pseudo({
                value: ":scope",
              });
              if (selector.parent) {
                selector.parent.insertBefore(selector, newScopeNode);
              }
              stripSelector = true;
            }

            if (blockClassName.state) {
              let newAttrNode = parser.attribute({
                attribute: blockClassName.state,
                quoteMark: null,
                operator: blockClassName.subState ? "=" : undefined,
                value: blockClassName.subState,
                raws: {},
              });

              // insert this new node after the current node
              if (selector.parent) {
                selector.parent.insertAfter(selector, newAttrNode)
              }

              // strip the selector in the end if we replaced it with a pseudo
              // class
              if (stripSelector) {
                selector.remove();
              }
            }
          }
        }
      });
      return selectors.toString();
    };

    // in this pass, we collect all the selectors
    root.walkRules(rule => {
      parser(buildCache).processSync(rule.selector);
    });

    // convert selectors to block selectors
    let bemToBlockClassMap: BemToBlockClassMap = constructBlocksMap(bemSelectorCache);

    // rewrite into a CSS block
    root.walkRules(rule => {
      // iterate through each rule
      rule.selector = parser(rewriteSelectors).processSync(rule.selector);
    });

    result.root = root;
  };
});

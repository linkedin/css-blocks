import { AST, TransformASTPluginFactory, TransformASTPlugin, Syntax } from '@glimmer/syntax';
import {
  Block,
  State,
  BlockClass,
  BlockObject,
  PluginOptionsReader as CssBlocksOptionsReader,
  TemplateRewriter,
  StyleMapping
} from "css-blocks";

type StateContainer = Block | BlockClass;

const STATE = /state:(.*)/;

export interface RewriterOptions {
  plugins?: {
    ast?: TransformASTPluginFactory[]
  };
  block: Block | null;
  cssBlocks: {
    styleMapping: StyleMapping | null;
  };
}

export function rewriteAdapter(styleMapping) {
    if (styleMapping) {
      return [Rewriter, { cssBlocks: { styleMapping } }];
    } else {
      return [Rewriter, { cssBlocks: { styleMapping: null } }];
    }
  }

export class Rewriter implements TransformASTPlugin, TemplateRewriter {
  syntax: Syntax;
  block: Block | undefined;
  options: RewriterOptions;
  styleMapping: StyleMapping | null;
  cssBlocksOpts: CssBlocksOptionsReader;
  constructor(options: RewriterOptions) {
    this.options = options;
    this.styleMapping = options.cssBlocks.styleMapping;
    let defaultBlock = this.styleMapping && this.styleMapping.blocks[""];
    this.cssBlocksOpts = new CssBlocksOptionsReader();
    if (defaultBlock) {
      this.block = defaultBlock;
    }
  }
  transform(program: AST.Program): AST.Program {
    let elementCount = 0;
    let self: Rewriter = this;
    if (!self.block) return program;
    let block: Block = self.block;
    this.syntax.traverse(program, {
      ElementNode(node) {
        elementCount++;
        let atRootElement = (elementCount === 1);
        let classObjects: StateContainer[] = [];
        node.attributes.forEach((n) => {
          if (n.name === "class") {
            classObjects = self.processClass(n, block);
          }
        });
        let states: State[] = [];
        let addedRoot = false;
        node.attributes.forEach((n) => {
          if (n.name.match(STATE)) {
            let stateContainers: StateContainer[] = classObjects ? classObjects.slice() : [];
            if (atRootElement) {
              stateContainers.unshift(block);
            }
            if (stateContainers.length > 0) {
              let state = self.processState(RegExp.$1, n, block, stateContainers);
              if (state) {
                if (state.parent === self.block) {
                  addedRoot = true;
                }
                states.push(state);
              }
            }
          }
        });
        let classAttr = node.attributes.find(n => n.name === "class");
        if (addedRoot) classObjects.push(block);
        let objects = new Set<BlockObject>([...classObjects, ...states]);
        let newClassValue = [...objects].map(o => o.cssClass(self.cssBlocksOpts)).join(" ");
        if (!classAttr) {
          classAttr = self.syntax.builders.attr("class", self.syntax.builders.text(newClassValue));
          node.attributes.push(classAttr);
        } else {
          classAttr.value = self.syntax.builders.text(newClassValue);
        }
      }
    });
    return program;
  }
  private processClass(node: AST.AttrNode, block: Block): StateContainer[] {
    let blockObjects: StateContainer[] = [];
    if (node.value.type === "TextNode") {
      let classNames = (<AST.TextNode>node.value).chars.split(/\s+/);
      classNames.forEach((name) => {
        let found = block.find(name) || block.find(`.${name}`);
        if (found) {
          blockObjects.push(<Block | BlockClass>found);
        }
      });
    }
    return blockObjects;
  }
  private processState(stateName: string, node: AST.AttrNode, block: Block, stateContainers: StateContainer[]): State | null {
    let blockName: string | undefined;
    let md = stateName.match(/^([^\.]+)\.([^\.]+)$/);
    let stateBlock = block;
    if (md && md.index === 0) {
      blockName = md[1];
      stateName = md[2];
      let tStateBlock = block.getReferencedBlock(blockName);
      if (tStateBlock) {
        stateBlock = tStateBlock;
      } else {
        return null;
      }
    }

    let container = stateContainers.find((c) => c.block === stateBlock);
    if (!container) {
      return null;
    }
    let substateName: string | null = null;
    if (node.value && node.value.type === "TextNode" && node.value.chars) {
      substateName = node.value.chars;
      let state = container.states.getState(substateName, stateName);
      if (state) {
        return state;
      } else {
        return null;
      }
    } else if (node.value && node.value.type !== "TextNode") {
      // dynamic stuff will go here
      return null;
    } else {
      let state = container.states.getState(stateName);
      if (state) {
        return state;
      } else {
        return null;
      }
    }
  }
}
import {
  AST,
  ASTPlugin,
  ASTPluginEnvironment,
  Syntax,
  NodeVisitor
} from '@glimmer/syntax';
import {
  Block,
  State,
  BlockClass,
  BlockObject,
  PluginOptionsReader as CssBlocksOptionsReader,
  TemplateRewriter,
  MetaStyleMapping,
  StyleMapping
} from "css-blocks";
import {
  ResolvedFile
} from "./project";

type StateContainer = Block | BlockClass;

const STATE = /state:(.*)/;
export function loaderAdapter(loaderContext: any): ASTPlugin {
  let cssFileNames = Object.keys(loaderContext.cssBlocks.mappings);
  let styleMapping: StyleMapping<ResolvedFile> | undefined = undefined;
  let block: Block | undefined = undefined;
  cssFileNames.forEach(filename => {
    let metaMapping: MetaStyleMapping<ResolvedFile> = loaderContext.cssBlocks.mappings[filename];
    let mapping = metaMapping.templates.get(loaderContext.resourcePath);
    if (mapping) {
      if (styleMapping) {
        throw Error("Multiple css blocks outputs use this template and I don't know how to handle that yet.");
      }
      let blockNames = Object.keys(mapping.blocks);
      blockNames.forEach(n => {
        let b = (<StyleMapping<ResolvedFile>>mapping).blocks[n];
        if (n === "") {
          block = b;
        }
        loaderContext.dependency(b.source);
      });
      styleMapping = mapping;
    }
  });
  if (styleMapping && block) {
    return (env: ASTPluginEnvironment) => {
      let rewriter = new Rewriter(env.syntax, <StyleMapping<ResolvedFile>>styleMapping, <Block>block);
      return {
        name: "css-blocks",
        visitors: {
          ElementNode(node) {
            rewriter.ElementNode(node);
          }
        }
      };
    };
  } else {
    return (_env: ASTPluginEnvironment) => {
      return {
        name: "css-blocks-noop",
        visitors: {}
      };
    };
  }
}

export class Rewriter implements TemplateRewriter, NodeVisitor {
  elementCount: number;
  syntax: Syntax;
  block: Block;
  styleMapping: StyleMapping<ResolvedFile> | null;
  cssBlocksOpts: CssBlocksOptionsReader;
  constructor(syntax: Syntax, styleMapping: StyleMapping<ResolvedFile>, defaultBlock: Block) {
    this.syntax = syntax;
    this.styleMapping = styleMapping;
    this.cssBlocksOpts = new CssBlocksOptionsReader();
    this.block = defaultBlock;
    this.elementCount = 0;
  }
  ElementNode(node: AST.ElementNode) {
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);
    let classObjects: StateContainer[] = [];
    node.attributes.forEach((n) => {
      if (n.name === "class") {
        classObjects = this.processClass(n, this.block);
      }
    });
    let states: State[] = [];
    let addedRoot = false;
    node.attributes.forEach((n) => {
      if (n.name.match(STATE)) {
        let stateContainers: StateContainer[] = classObjects ? classObjects.slice() : [];
        if (atRootElement) {
          stateContainers.unshift(this.block);
        }
        if (stateContainers.length > 0) {
          let state = this.processState(RegExp.$1, n, this.block, stateContainers);
          if (state) {
            if (state.parent === this.block) {
              addedRoot = true;
            }
            states.push(state);
          }
        }
        node.attributes = node.attributes.filter((an) => an !== n);
      }
    });
    let classAttr = node.attributes.find(n => n.name === "class");
    if (addedRoot) classObjects.push(this.block);
    let objects = new Set<BlockObject>([...classObjects, ...states]);
    let newClassValue = [...objects].map(o => o.cssClass(this.cssBlocksOpts)).join(" ");
    if (!classAttr) {
      classAttr = this.syntax.builders.attr("class", this.syntax.builders.text(newClassValue));
      node.attributes.push(classAttr);
    } else {
      classAttr.value = this.syntax.builders.text(newClassValue);
    }
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

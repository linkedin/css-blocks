import * as debugGenerator from "debug";
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
  PluginOptions as CssBlocksOpts,
  TemplateRewriter,
  MetaStyleMapping,
  StyleMapping
} from "css-blocks";
import {
  ResolvedFile
} from "./GlimmerProject";
// import {
//   selectorCount
// } from "./utils";

type StateContainer = Block | BlockClass;

const debug = debugGenerator("css-blocks:glimmer");

interface MappingAndBlock {
  mapping: StyleMapping<ResolvedFile>;
  block: Block;
}
const STATE = /state:(.*)/;

type LoaderContext = {
  dependency(dep: string): void;
};

function trackBlockDependencies(loaderContext: LoaderContext, block: Block, options: CssBlocksOptionsReader) {
  let sourceFile = options.importer.filesystemPath(block.identifier, options);
  if (sourceFile !== null) {
    loaderContext.dependency(sourceFile);
  }
  block.dependencies.forEach(dep => {
    loaderContext.dependency(dep);
  });
}

export function loaderAdapter(loaderContext: any): Promise<ASTPlugin> {
  debug(`loader adapter. Got loader context for css-blocks:`, loaderContext.cssBlocks);
  let cssFileNames = Object.keys(loaderContext.cssBlocks.mappings);
  let options = new CssBlocksOptionsReader(loaderContext.cssBlocks.compilationOptions);
  let metaMappingPromises = new Array<Promise<MetaStyleMapping<ResolvedFile>>>();
  cssFileNames.forEach(filename => {
    metaMappingPromises.push(loaderContext.cssBlocks.mappings[filename]);
  });
  let thisMappingPromise: Promise<MappingAndBlock | undefined> = Promise.all(metaMappingPromises).then(metaMappings => {
    let mappingAndBlock: MappingAndBlock | undefined = undefined;
    metaMappings.forEach(metaMapping => {
      let mapping = metaMapping.templates.get(loaderContext.resourcePath);
      if (mapping) {
        if (mappingAndBlock) {
          throw Error("Multiple css blocks outputs use this template and I don't know how to handle that yet.");
        }
        let blockNames = Object.keys(mapping.blocks);
        blockNames.forEach(n => {
          let block = (<StyleMapping<ResolvedFile>>mapping).blocks[n];
          if (n === "" && mapping && block) {
            mappingAndBlock = {
              block,
              mapping
            };
          }
          trackBlockDependencies(loaderContext, block, options);
          block.transitiveBlockDependencies().forEach(blockDep => {
            trackBlockDependencies(loaderContext, blockDep, options);
          });
        });
      }
    });
    return mappingAndBlock;
  });
  let pluginPromise: Promise<ASTPlugin> = thisMappingPromise.then(mappingAndBlock => {
    let astPlugin: ASTPlugin;
    if (mappingAndBlock) {
        astPlugin = (env: ASTPluginEnvironment) => {
          let rewriter = new Rewriter(env.syntax, mappingAndBlock.mapping, mappingAndBlock.block, loaderContext.cssBlocks.compilationOptions);
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
      astPlugin = (_env: ASTPluginEnvironment) => {
        return {
          name: "css-blocks-noop",
          visitors: {}
        };
      };
    }
    return astPlugin;
  });
  return pluginPromise;
}

export class Rewriter implements TemplateRewriter, NodeVisitor {
  elementCount: number;
  syntax: Syntax;
  block: Block;
  styleMapping: StyleMapping<ResolvedFile>;
  cssBlocksOpts: CssBlocksOptionsReader;
  constructor(syntax: Syntax, styleMapping: StyleMapping<ResolvedFile>, defaultBlock: Block, cssBlocksOpts: CssBlocksOpts) {
    this.syntax = syntax;
    this.styleMapping = styleMapping;
    this.cssBlocksOpts = new CssBlocksOptionsReader(cssBlocksOpts);
    this.block = defaultBlock;
    this.elementCount = 0;
  }
  ElementNode(node: AST.ElementNode) {
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);
    let classObjects: StateContainer[] = [];
    // If there are root styles, we add them on the root element implicitly. The rewriter will add the block's root class.
    // if (atRootElement) {
    //   let query = new QueryKeySelector(this.block);
    //   if (this.block.root) {
    //     let res = query.execute(this.block.root, this.block);
    //     if (selectorCount(res) > 0) {
    //       classObjects.unshift(this.block);
    //     }
    //   }
    // }
    if (atRootElement) {
      classObjects.unshift(this.block);
    }
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
    if (objects.size > 0) {
      let newClassValue = this.styleMapping.mapObjects(...objects).join(" ");
      if (!classAttr) {
        classAttr = this.syntax.builders.attr("class", this.syntax.builders.text(newClassValue));
        node.attributes.push(classAttr);
      } else {
        classAttr.value = this.syntax.builders.text(newClassValue);
      }
    }
  }
  private processClass(node: AST.AttrNode, block: Block): StateContainer[] {
    let blockObjects: StateContainer[] = [];
    if (node.value.type === "TextNode") {
      let classNames = (<AST.TextNode>node.value).chars.split(/\s+/);
      classNames.forEach((name) => {
        let found = block.lookup(name) || block.lookup(`.${name}`);
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

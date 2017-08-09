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
  debug(`loader adapter for:`, loaderContext.resourcePath);
  // debug(`loader adapter. Got loader context for css-blocks:`, loaderContext.cssBlocks);
  let cssFileNames = Object.keys(loaderContext.cssBlocks.mappings);
  let options = new CssBlocksOptionsReader(loaderContext.cssBlocks.compilationOptions);
  let metaMappingPromises = new Array<Promise<MetaStyleMapping<ResolvedFile>>>();
  cssFileNames.forEach(filename => {
    metaMappingPromises.push(loaderContext.cssBlocks.mappings[filename]);
  });
  let thisMappingPromise: Promise<MappingAndBlock | undefined> = Promise.all(metaMappingPromises).then(metaMappings => {
    let mappingAndBlock: MappingAndBlock | undefined = undefined;
    metaMappings.forEach(metaMapping => {
      debug("Templates with StyleMappings:", ...metaMapping.templates.keys());
      let mapping: StyleMapping<ResolvedFile> | undefined;
      metaMapping.templates.forEach(aMapping => {
        if (aMapping && aMapping.template.fullPath === loaderContext.resourcePath) {
          debug("Found mapping.");
          mapping = aMapping;
        }
      });
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
  debug(message: string, ...args: any[]): void {
    debug(`${this.styleMapping.template.fullPath}: ${message}`, ...args);
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

    let statesMap: Map<AST.TextNode | AST.MustacheStatement | AST.ConcatStatement, BlockObject[]> = new Map();

    let addedRoot = false;
    node.attributes.forEach((n) => {
      if (n.name.match(STATE)) {
        let stateContainers: StateContainer[] = classObjects ? classObjects.slice() : [];
        if (atRootElement) {
          stateContainers.unshift(this.block);
        }
        if (stateContainers.length > 0) {
          let foundStates = this.processState(RegExp.$1, n, this.block, stateContainers);
          if (foundStates.length) {
            if (foundStates[0].parent === this.block) {
              addedRoot = true;
            }
            statesMap.set(n.value, foundStates);
          }
        }
        node.attributes = node.attributes.filter((an) => an !== n);
      }
    });
    let classAttr = node.attributes.find(n => n.name === "class");
    if (addedRoot) { classObjects.push(this.block); }

    // For constructing our Handlebars AST concat group
    let parts: (AST.MustacheStatement | AST.TextNode)[] = [];

    // Get our new class...classes
    let classSet = new Set<BlockObject>([...classObjects]);
    let staticClassNames: string[] | undefined;
    if (debug.enabled) {
      staticClassNames = classObjects.map(o => `${o.block.name}${o.asSource()}`);
    }
    let newClassValue: string = this.styleMapping.mapObjects(...classSet).join(' ');
    if (debug.enabled && staticClassNames) {
      this.debug(`Rewriting static classes "${staticClassNames.join(' ')}" to "${newClassValue}"`);
    }

    parts.push(this.syntax.builders.text(newClassValue));

    // Get our new state classes expression
    statesMap.forEach((states: State[], value: AST.TextNode | AST.MustacheStatement | AST.ConcatStatement) => {
      states.forEach((state: State) => {
        let newClass = this.styleMapping.blockMappings.get(state);

        if ( !newClass ) { return; }
        let classStr = ' ' + newClass.join(' ');

        // If value is a string, we can just add the class to our new class list.
        if ( value.type === 'TextNode' ) {
          this.debug(`Rewriting static state "${state.block.name}.${state.asSource()}" to "${newClass.join(' ')}"`);
          parts.push(this.syntax.builders.text(classStr));
        }

        // Otherise, this state value is dynamic, we need to have some fun. We
        // need to force it into the right type, then output it into our {{if-style}}
        // helper.
        else {
          let condition: AST.SubExpression | AST.Literal | AST.PathExpression | undefined;

          if ( value.type === 'MustacheStatement' ) {
            condition = value.path;
          }

          // If this is a concat statement, we need to emit a concat subexpression
          // helper instead.
          else if ( value.type === 'ConcatStatement' ) {
            condition = this.syntax.builders.sexpr (
              this.syntax.builders.path('/css-blocks/components/concat'),
              value.parts.reduce( (arr, val): AST.Expression[] => {
                arr.push( (val.type === 'TextNode') ? this.syntax.builders.string(val.chars) : val.path);
                return arr;
              }, ([] as AST.Expression[]))
            );
          }

          // If we couldn't create a well formed condition statement, move on.
          if ( !condition ) {
            throw Error(`Unsupported Mustache expression for state: ${value.type}`);
          }

          // Constructo our helper and add to class list.
          let helper: AST.MustacheStatement;
          if ( states.length > 1 ) {
            this.debug(`Rewriting dynamic state "${state.block.name}.${state.asSource()}" to "${classStr}"`);
            helper = this.syntax.builders.mustache('/css-blocks/components/block', [
              condition,
              this.syntax.builders.string(state.name),
              this.syntax.builders.string(classStr)
            ]);
          }
          else {
            this.debug(`Rewriting dynamic state "${state.block.name}.${state.asSource()}" to "${classStr}"`);
            helper = this.syntax.builders.mustache('/css-blocks/components/block', [
              condition,
              this.syntax.builders.string(classStr)
            ]);
          }
          parts.push(helper);
        }
      });
    });

    let concatStatement = this.syntax.builders.concat(parts);

    if (!classAttr) {
      classAttr = this.syntax.builders.attr("class", concatStatement);
      node.attributes.push(classAttr);
    } else {
      classAttr.value = concatStatement;
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
  private processState(stateName: string, node: AST.AttrNode, block: Block, stateContainers: StateContainer[]): State[] {
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
        return [];
      }
    }

    let container = stateContainers.find((c) => c.block === stateBlock);
    if (!container) {
      return [];
    }
    let substateName: string | undefined;
    if (node.value) {
      substateName = (node.value.type === "TextNode") ? node.value.chars : undefined;
      let allStates = container.states.resolveGroup(stateName, substateName);
      let states;
      if (allStates) {
        states = Object.keys(allStates).map(k => allStates![k]);
      } else {
        states = [];
      }
      return states;
    }
    return [];
  }
}

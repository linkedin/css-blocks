import Resolver from '@glimmer/resolver';
import * as postcss from "postcss";
import { AST, preprocess, traverse } from '@glimmer/syntax';
import {
  Block,
  BlockClass,
  BlockObject,
  BlockParser,
  PluginOptions,
  PluginOptionsReader,
  CssBlockError,
  QueryKeySelector,
  ClassifiedParsedSelectors,
  TemplateAnalysis as StyleAnalysis
} from "css-blocks";
import Project, { ResolvedFile } from "./project";
import { pathFromSpecifier } from "./utils";

type StateContainer = Block | BlockClass;

const STATE = /state:(.*)/;

export function performStyleAnalysis(templateName: string, project: Project): Promise<StyleAnalysis> {
  let resolver = project.resolver;
  let template = project.templateFor(templateName);
  let stylesheet = project.stylesheetFor(templateName);
  let analysis = new StyleAnalysis(template);
  let blockOpts: PluginOptions = { }; // TODO: read this in from a file somehow?
  let parser = new BlockParser(postcss, blockOpts);
  let root = postcss.parse(stylesheet.string);
  let result = parser.parse(root, stylesheet.path, templateName);

  let ast = preprocess(template.string);
  let elementCount = 0;
  let elementStyles: string[] = [];

  return result.then((block) => {
    analysis.blocks[""] = block;
    block.eachBlockReference((name, refBlock) => {
      analysis.blocks[name] = refBlock;
    });
    traverse(ast, {
      ElementNode(node) {
        analysis.endElement();
        analysis.startElement();
        elementCount++;
        let atRootElement = (elementCount === 1);
        // If there are root styles, we add them on the root element implicitly. The rewriter will add the block's root class.
        if (atRootElement) {
          let query = new QueryKeySelector(block);
          let res = query.execute(root, block);
          if (selectorCount(res) > 0) { 
            analysis.addStyle(block);
          }
        }
        let classObjects: StateContainer[] | undefined = undefined;
        node.attributes.forEach((n) => {
          if (n.name === "class") {
            classObjects = processClass(n, block, analysis, stylesheet, template);
            validateClasses(block, atRootElement, classObjects, node, template);
          }
        });
        node.attributes.forEach((n) => {
          if (n.name.match(STATE)) {
            let stateContainers: StateContainer[] = classObjects ? classObjects.slice() : [];
            if (atRootElement) {
              stateContainers.unshift(block);
            }
            if (stateContainers.length > 0) {
              processState(RegExp.$1, n, block, stateContainers, analysis, stylesheet, template);
            } else {
              throw cssBlockError(`Cannot apply a block state without a block class or root`, n, template);
            }
          }
        });
      },
    });
    analysis.endElement();
    return analysis;
  });
}

function validateClasses(block: Block, atRootElement: boolean, objects: BlockObject[], node: AST.Node, template: ResolvedFile) {
  if (atRootElement && objects.length > 0) {
    objects.forEach((obj) => {
      if (obj.block === block) {
        throw cssBlockError(`Cannot put block classes on the block's root element`, node, template);
      }
    });
  }
  let blocks = new Set<Block>();
  objects.forEach((o) => {
    if (blocks.has(o.block)) {
      throw cssBlockError(`Multiple classes from the same block on an element are not allowed.`, node, template);
    } else {
      blocks.add(o.block);
    }
  });
}

function processClass(node: AST.AttrNode, block: Block, analysis: StyleAnalysis, stylesheet: ResolvedFile, template: ResolvedFile): StateContainer[] {
  let blockObjects: StateContainer[] = [];
  if (node.value.type === "TextNode") {
    let classNames = (<AST.TextNode>node.value).chars.split(/\s+/);
    classNames.forEach((name) => {
      let found = block.find(name) || block.find(`.${name}`);
      if (found) {
        blockObjects.push(<Block|BlockClass>found);
        analysis.addStyle(found);
      } else {
        throw cssBlockError(`No class ${name} found in block at ${stylesheet.path}`, node, template);
      }
    });
  }
  return blockObjects;
}

function processState(stateName: string, node: AST.AttrNode, block: Block, stateContainers: StateContainer[], analysis: StyleAnalysis, stylesheet: ResolvedFile, template: ResolvedFile) {
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
      throw cssBlockError(`No block referenced as ${blockName}`, node, template);
    }
  }

  let container = stateContainers.find((c) => c.block === stateBlock);
  if (!container) {
    throw cssBlockError(`Element lacks a class from the corresponding block`, node, template);
  }
  let substateName: string | null = null;
  if (node.value && node.value.type === "TextNode" && node.value.chars) {
    substateName = node.value.chars;
    let state = container.states.getState(substateName, stateName);
    if (state) {
      analysis.addStyle(state);
    } else {
      throw cssBlockError(`No state ${stateName}=${node.value.chars} found in block at ${stylesheet.path}`, node, template);
    }
  } else if (node.value && node.value.type !== "TextNode") {
    // dynamic stuff will go here
    throw cssBlockError("No handling for dynamic styles yet", node, template);
  } else {
    let state = container.states.getState(stateName);
    if (state) {
      analysis.addStyle(state);
    } else {
      throw cssBlockError(`No state ${stateName} found in block at ${stylesheet.path}`, node, template);
    }
  }
}

function cssBlockError(message: string, node: AST.Node, template: ResolvedFile) {
  return new CssBlockError(message, {
    filename: node.loc.source || template.path,
    line: node.loc.start.line,
    column: node.loc.start.column
  })
}

function selectorCount(result: ClassifiedParsedSelectors) {
  let count = result.main.length;
  Object.keys(result.other).forEach((k) => {
    count += result.other[k].length;
  });
  return count;
}

function isComponentHelper({ path }: AST.MustacheStatement) {
  return path.type === 'PathExpression'
    && path.parts.length === 1
    && path.parts[0] === 'component';
}
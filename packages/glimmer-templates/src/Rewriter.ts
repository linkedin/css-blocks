import * as debugGenerator from "debug";
import {
  AST,
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
  StyleMapping
} from "css-blocks";

import { ResolvedFile } from "./GlimmerProject";
import { cssBlockError } from "./utils";

type StateContainer = Block | BlockClass;
type ConcatParts    = (AST.MustacheStatement | AST.TextNode)[];

const STATE        = /state:(.*)/;
const STYLE_IF     = 'style-if';
const STYLE_UNLESS = 'style-unless';
const DEBUG        = debugGenerator("css-blocks:glimmer");

export class Rewriter implements TemplateRewriter, NodeVisitor {
  elementCount: number;
  syntax: Syntax;
  block: Block;
  styleMapping: StyleMapping<ResolvedFile>;
  cssBlocksOpts: CssBlocksOptionsReader;

  constructor(syntax: Syntax, styleMapping: StyleMapping<ResolvedFile>, defaultBlock: Block, cssBlocksOpts: CssBlocksOpts) {
    this.syntax        = syntax;
    this.styleMapping  = styleMapping;
    this.cssBlocksOpts = new CssBlocksOptionsReader(cssBlocksOpts);
    this.block         = defaultBlock;
    this.elementCount  = 0;
  }

  debug(message: string, ...args: any[]): void {
    DEBUG(`${this.styleMapping.template.fullPath}: ${message}`, ...args);
  }

  ElementNode(node: AST.ElementNode) {
    this.elementCount++;
    let atRootElement = (this.elementCount === 1);

    // Collect objects to discover states on.
    let classObjects: StateContainer[] = [];

    // For constructing our Handlebars AST concat group.
    let parts: ConcatParts = [];

    // If there are root styles, we add them on the root element implicitly.
    if ( atRootElement ) {
      let rootClass = this.styleMapping.blockMappings.get(this.block);
      if ( rootClass ) {
        classObjects.unshift(this.block);
        parts.unshift(this.syntax.builders.text(rootClass.join(' ')));
      }
    }

    // Find the class attribute and process.
    node.attributes.forEach((n) => {
      if (n.name === "class") {
        classObjects = this.processClass(n, this.block, parts, this.styleMapping.template);
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

    // Get our new class...classes
    let classSet = new Set<BlockObject>([...classObjects]);
    let staticClassNames: string[] | undefined;
    if (DEBUG.enabled) {
      staticClassNames = classObjects.map(o => `${o.block.name}${o.asSource()}`);
    }
    let newClassValue: string = this.styleMapping.mapObjects(...classSet).join(' ');
    if (DEBUG.enabled && staticClassNames) {
      this.debug(`Rewriting static classes "${staticClassNames.join(' ')}" to "${newClassValue}"`);
    }

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
        // need to force it into the right type, then output it into our {{style-if}}
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
            helper = this.syntax.builders.mustache('/css-blocks/components/state', [
              condition,
              this.syntax.builders.string(state.name),
              this.syntax.builders.string(classStr)
            ]);
          }
          else {
            this.debug(`Rewriting dynamic state "${state.block.name}.${state.asSource()}" to "${classStr}"`);
            helper = this.syntax.builders.mustache('/css-blocks/components/state', [
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

  private isStyleIfHelper( node: AST.MustacheStatement ): string | undefined {
    if ( node.path.type !== 'PathExpression' ) { return undefined; }
    let parts: string[] = (<AST.PathExpression>node.path).parts;
    if ( parts.length !== 1 || ( parts[0] !== STYLE_IF &&  parts[0] !== STYLE_UNLESS ) ) { return undefined; }
    return parts[0];
  }

  private processClass(node: AST.AttrNode, block: Block, parts: ConcatParts, template: ResolvedFile): StateContainer[] {
    let blockObjects: StateContainer[] = [];
    let statements: (AST.TextNode | AST.MustacheStatement)[];

    statements = node.value.type === 'ConcatStatement' ? (<AST.ConcatStatement>node.value).parts : [node.value];

    statements.forEach((statement) => {
      if (statement.type === "TextNode") {
        let classNames = (<AST.TextNode>statement).chars.split(/\s+/);
        let newClassNames: string[] = [];
        classNames.forEach((name) => {
          let found = block.lookup(name) || block.lookup(`.${name}`);
          if (found) {
            blockObjects.push(<Block | BlockClass>found);
            let newClasses = this.styleMapping.blockMappings.get(found) || [];
            newClassNames.push(...newClasses);
          }
        });
        parts.push(this.syntax.builders.text(' ' + newClassNames.join(' ')));
      }

      else if ( statement.type === 'MustacheStatement' ) {
        let value = statement as AST.MustacheStatement;
        let helperType = this.isStyleIfHelper(value);

        // If this is a `{{style-if}}` or `{{style-unless}}` helper:
        if ( helperType ) {

          // Discover our `if` block in the `{{style-* condition 'if-block' 'else-block'}}` helper
          if ( value.params[1] && value.params[1].type !== 'StringLiteral' ) {
            throw cssBlockError(`{{style-if}} expects a block or block class as its second argument.`, node, template);
          }
          let name: string = (value.params[1] as AST.StringLiteral).value;
          let found = block.lookup(name) || block.lookup(`.${name}`);

          // If found, this is a valid `{{style-*}}` helper. Rewrite the AST as required.
          if (found) {
            blockObjects.push(<Block | BlockClass>found);
            let newClass = this.styleMapping.blockMappings.get(found);
            if ( !newClass ) {
              throw cssBlockError(`Error rewriting class ${name}. Try cleaning your caches and building agian.`, statement, template);
            }
            let classStr = ' ' + newClass.join(' ');

            // Discover our optional `else` block in the `{{style-* condition 'if-block' 'else-block'}}` helper
            let name2: string = value.params[2] && (value.params[2] as AST.StringLiteral).value;
            let found2 = name2 ? ( block.lookup(name2) || block.lookup(`.${name2}`) ) : undefined;
            let classStr2: string | undefined = undefined;
            if (found2) {
              let newClass = this.styleMapping.blockMappings.get(found2);
              if ( !newClass ) {
                throw cssBlockError(`Error rewriting class ${name2}. Try cleaning your caches and building agian.`, statement, template);
              }
              classStr2 = ' ' + newClass.join(' ');
            }

            // Construct our production helper
            let helper: AST.MustacheStatement = this.syntax.builders.mustache('/css-blocks/components/style-if', [
              value.params[0],
              this.syntax.builders.boolean(helperType === STYLE_IF),
              this.syntax.builders.string(classStr),
              classStr2 ? this.syntax.builders.string(classStr2) : this.syntax.builders.undefined()
            ]);
            parts.push(helper);
          }

          // If no block discovered for the `{{style-if}}` helper, this is not a valid use.
          else {
            throw cssBlockError(`No class ${name} found in block ${block.name}.`, statement, template);
          }
        }

        else {
          throw cssBlockError(`Only {{style-if}} or {{style-unless}} helpers are allowed in class attributes.`, node, template);
        }
      }
    });

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

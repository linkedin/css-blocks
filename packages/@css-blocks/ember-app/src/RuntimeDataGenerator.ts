import { Block, Configuration, Style, isAttrValue, isBlockClass, isStyle } from "@css-blocks/core";
import { EmberAnalyzer } from "@css-blocks/ember-support";
import { SimpleAttribute, StyleMapping } from "@opticss/template-api";
import { ObjectDictionary } from "@opticss/util";
import * as debugGenerator from "debug";

import { AggregateRewriteData, AndStyleExpression, BlockInfo, ConditionalStyle, ConditionalStyleExpression, GlobalBlockIndex, GlobalStyleIndex, ImpliedStyles, LocalStyleIndex, Operator, OptimizationEntry, StyleRequirements } from "./AggregateRewriteData";

const debug = debugGenerator("css-blocks:ember-app:runtime-data-generator");

export class RuntimeDataGenerator {
  blocks: Array<Block>;
  styleIndices: Map<Style, number>;
  blockIndices: Map<Block, number>;
  sourceClassIndices: Map<string, number>;
  outputClassIndices: Map<string, number>;
  styleMapping: StyleMapping;
  analyzer: EmberAnalyzer;
  config: Configuration;
  reservedClassNames: Set<string>;
  constructor(blocks: Array<Block>, styleMapping: StyleMapping, analyzer: EmberAnalyzer, config: Configuration, reservedClassNames: Set<string>) {
    this.blocks = blocks;
    this.styleIndices = new Map<Style, number>();
    this.blockIndices = new Map<Block, number>();
    this.sourceClassIndices = new Map<string, number>();
    this.outputClassIndices = new Map<string, number>();
    this.styleMapping = styleMapping;
    this.analyzer = analyzer;
    this.config = config;
    this.reservedClassNames = reservedClassNames;
  }
  blockIndex(block: Block): number {
    if (!this.blockIndices.has(block)) {
      this.blockIndices.set(block, this.blockIndices.size);
    }
    return this.blockIndices.get(block)!;
  }
  sourceClassIndex(className: string): number {
    if (!this.sourceClassIndices.has(className)) {
      throw new Error("[internal error] unknown class");
    }
    return this.sourceClassIndices.get(className)!;
  }
  cssClass(style: Style): string {
    return style.cssClass(this.config, this.reservedClassNames);
  }
  outputClassIndex(classNameOrStyle: string | Style): number {
    let className: string;
    if (isStyle(classNameOrStyle)) {
      className = this.cssClass(classNameOrStyle);
    } else {
      className = classNameOrStyle;
    }
    if (!this.outputClassIndices.has(className)) {
      this.outputClassIndices.set(className, this.outputClassIndices.size);
    }
    return this.outputClassIndices.get(className)!;
  }
  styleIndex(style: undefined): null;
  styleIndex(style: Style): number;
  styleIndex(style: Style | undefined): number | null {
    if (!style) return null;
    if (!this.styleIndices.has(style)) {
      this.styleIndices.set(style, this.styleIndices.size);
    }
    return this.styleIndices.get(style)!;
  }
  generate(): AggregateRewriteData {
    let blockIds: ObjectDictionary<GlobalBlockIndex> = {};
    let blocks = new Array<BlockInfo>();
    for (let block of this.blocks) {
      blockIds[block.guid] = this.blockIndex(block);
    }
    for (let block of this.blocks) {
      blocks[this.blockIndex(block)] = this.generateBlockInfo(block);
    }
    let stylesInUse = this.findStylesInUse();
    debug(`There are ${stylesInUse.size} styles in use.`);
    let styleRequirements: StyleRequirements = {};
    for (let style of stylesInUse) {
      this.sourceClassIndices.set(this.cssClass(style), this.styleIndex(style));
      if (isAttrValue(style)) {
        styleRequirements[this.styleIndex(style)] = [Operator.AND, this.styleIndex(style.blockClass)];
      }
    }

    let impliedStyles = this.getImpliedStyles(stylesInUse);

    let optimizations = this.getOptimizations(stylesInUse);

    let outputClassnames = new Array<string>(this.outputClassIndices.size);
    for (let outputClass of this.outputClassIndices.keys()) {
      outputClassnames[this.outputClassIndices.get(outputClass)!] = outputClass;
    }

    return {
      blockIds,
      blocks,
      outputClassnames,
      styleRequirements,
      impliedStyles,
      optimizations,
    };
  }

  getOptimizations(stylesInUse: Set<Style>): Array<OptimizationEntry> {
    let optimizations = new Array<OptimizationEntry>();
    for (let style of stylesInUse) {
      let attr = {name: "class", value: this.cssClass(style)};
      if (this.styleMapping.isStyledAfterOptimization(attr)) {
        optimizations.push([this.outputClassIndex(style), this.styleIndex(style)]);
        continue;
      }

      if (this.styleMapping.replacedAttributes.containsKey(attr)) {
        let replacedWith = this.styleMapping.replacedAttributes.getValue(attr)!;
        optimizations.push([this.outputClassIndex(replacedWith.value), this.styleIndex(style)]);
        continue;
      }

      if (this.styleMapping.linkedAttributes.containsKey(attr)) {
        let links = this.styleMapping.linkedAttributes.getValue(attr);
        for (let link of links) {
          let exceptions = link.unless.map(u => this.sourceClassIndex((<SimpleAttribute>u).value));
          let expr: AndStyleExpression = [Operator.AND, this.styleIndex(style), [Operator.NOT, [Operator.OR, ...exceptions]]];
          optimizations.push([this.outputClassIndex(link.to.value), expr]);
        }
      }
    }
    return optimizations;
  }

  getImpliedStyles(stylesInUse: Set<Style>): ImpliedStyles {
    let impliedStyles: ImpliedStyles = {};
    for (let style of stylesInUse) {
      let implied = new Array<GlobalStyleIndex | string | ConditionalStyle>();
      // implied by inheritance
      let baseStyle = style.base;
      if (baseStyle) {
        implied.push(this.styleIndex(baseStyle));
      }

      // implied by aliasing
      let aliases = [...style.getStyleAliases()];
      if (aliases.length > 0) {
        console.dir({aliases});
      }
      implied.push(...aliases);

      // implied by composition
      if (isBlockClass(style)) {
        for (let composition of style.composedStyles()) {
          if (composition.conditions.length > 0) {
            let styles = [this.styleIndex(composition.style)];
            if (isAttrValue(composition.style)) {
              styles.unshift(this.styleIndex(composition.style.blockClass));
            }
            let conditions: ConditionalStyleExpression = [Operator.AND, ...composition.conditions.map(s => this.styleIndex(s))];
            implied.push({styles, conditions});
          } else {
            if (isAttrValue(composition.style)) {
              implied.push(this.styleIndex(composition.style.blockClass));
            }
            implied.push(this.styleIndex(composition.style));
          }
        }
      }
      if (implied.length > 0) {
        impliedStyles[this.styleIndex(style)] = implied;
      }
    }
    return impliedStyles;
  }

  findStylesInUse(): Set<Style> {
    let stylesInUse = new Set<Style>();
    for (let style of this.analyzer.stylesFound) {
      for (let s of style.resolveStyles()) {
        stylesInUse.add(s);
      }
      if (isBlockClass(style)) {
        for (let c of style.resolveComposedStyles()) {
          stylesInUse.add(c.style);
        }
      }
    }
    return stylesInUse;
  }
  generateBlockInfo(block: Block): BlockInfo {
    let blockInterfaceStyles: ObjectDictionary<LocalStyleIndex> = {};
    let resolvedInterface = block.resolvedStyleInterface();
    let styleNames = Object.keys(resolvedInterface).sort();
    let i = 0;
    for (let styleName of styleNames) {
      blockInterfaceStyles[styleName] = i++;
    }
    let implementingBlocks = this.blocks.filter(b => b.isImplementationOf(block));
    let implementations: ObjectDictionary<Array<GlobalBlockIndex | null>> = {};
    for (let impl of implementingBlocks) {
      let implInterface = impl.resolvedStyleInterface();
      implementations[this.blockIndex(impl)] = styleNames.map(n => this.styleIndex(implInterface[n]));
    }
    return {
      blockInterfaceStyles,
      implementations,
    };
  }
}

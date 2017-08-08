/**
 * @module "TemplateAnalysis"
 */
 // tslint:disable-next-line:no-unused-variable Imported for Documentation link
import BlockParser, { CLASS_NAME_IDENT } from "../BlockParser";
import { BlockFactory } from "../Block/BlockFactory";
import { CustomBlockScope } from "../Block/LocalScope";
import { StyleAnalysis } from "./StyleAnalysis";
import { BlockObject, Block } from "../Block";
import * as errors from "../errors";
import TemplateValidator, { TemplateValidatorOptions } from "./validations";

/**
 * Responsible for creating instances of a template info of the correct type
 * given an identifier and an array of arbitrary data from the result of
 * serializing an instance of the same class.
 */
export interface TemplateInfoConstructor {
    deserialize<Template extends TemplateInfo>(identifier: string, ...data: any[]): Template;
}

/**
 * Subclasses of TemplateInfo must be registered onto the static class factory.
 * it is important for the registered name of the template info to be unique
 * from all other possible names for other types of template info.
 */
export class TemplateInfoFactory {
  static constructors: Map<Symbol, TemplateInfoConstructor> = new Map();
  static register(name: string, constructor: TemplateInfoConstructor) {
    TemplateInfoFactory.constructors.set(Symbol.for(name), constructor);
  }
  static create<Template extends TemplateInfo>(name: string, identifier: string, ...data: any[]): Template {
    let constructor: TemplateInfoConstructor | undefined = TemplateInfoFactory.constructors.get(Symbol.for(name));
    if (constructor) {
      return constructor.deserialize<Template>(identifier, ...data);
    } else {
      throw new Error(`No template info registered for ${name}`);
    }
  }
  static deserialize<Template extends TemplateInfo>(obj: SerializedTemplateInfo): Template {
    let data: any[] = obj.data || [];
    return TemplateInfoFactory.create<Template>(obj.type, obj.identifier, ...data);
  }
}

/**
 * This type is used to serialize arbitrary template info instances to JSON and back.
 */
export interface SerializedTemplateInfo {
  /** This is the type string for the template info class as it's registered with TemplateInfoFactory. */
  type: string;

  /**
   * any identifier that can be used to look up a template by the templateinfo.
   * Usually a relative path to a file.
   */
  identifier: string;

  /** the values stored in here must be JSON-friendly. */
  data?: any[];
}

/**
 * Base class for template information for an analyzed template.
 */
export class TemplateInfo {
  static typeName = "CssBlocks.TemplateInfo";
  identifier: string;

  constructor(identifier: string) {
    this.identifier = identifier;
  }

  static deserialize(identifier: string, ..._data: any[]): TemplateInfo {
    return new TemplateInfo(identifier);
  }

  // Subclasses should override this and set type to the string value that their class is registered as.
  // any additional data for serialization
  serialize(): SerializedTemplateInfo {
    return {
      type: TemplateInfo.typeName,
      identifier: this.identifier,
    };
  }
}

TemplateInfoFactory.register(TemplateInfo.typeName, TemplateInfo as TemplateInfoConstructor);

/**
 * This interface defines a JSON friendly serialization
 * of a {TemplateAnalysis}.
 */
export interface SerializedTemplateAnalysis {
  template: SerializedTemplateInfo;
  blocks: {
    [localName: string]: string;
  };
  stylesFound: string[];
  dynamicStyles: number[];
   // The numbers stored in each correlation are an index into a stylesFound;
  styleCorrelations: number[][];
}

/**
 * A TemplateAnalysis performs book keeping and ensures internal consistency of the block objects referenced
 * within a template. It is designed to be used as part of an AST walk over a template.
 *
 * 1. Call [[startElement startElement()]] at the beginning of an new html element.
 * 2. Call [[addStyle addStyle(blockObject)]] for all the styles used on the current html element.
 * 2. Call [[markDynamic markDynamic(blockObject)]] for all the styles used dynamically on the current html element.
 * 3. Call [[endElement endElement()]] when done adding styles for the current element.
 */
export class TemplateAnalysis<Template extends TemplateInfo> implements StyleAnalysis {

  template: Template;
  /**
   * A map from a local name for the block to the [[Block]].
   * The local name must be a legal CSS ident/class name but this is not validated here.
   * See [[CLASS_NAME_IDENT]] for help validating a legal class name.
   */
  blocks: {
    [localName: string]: Block;
  };

  /**
   * All the block styles used in this template. Due to how Set works, it's exceedingly important
   * that the same instance for the same block object is used over the course of a single template analysis.
   */
  stylesFound: Set<BlockObject>;
  /**
   * All the block styles used in this template that may be applied dynamically.
   * Dynamic styles are an important signal to the optimizer.
   */
  dynamicStyles: Set<BlockObject>;
  /**
   * A list of all the styles that are used together on the same element.
   * The current correlation is added to this list when [[endElement]] is called.
   */
  styleCorrelations: Set<BlockObject>[];
  /**
   * The current correlation is created when calling [[startElement]].
   * The current correlation is unset after calling [[endElement]].
   */
  currentCorrelations: Set<BlockObject>[];

  /**
   * The location info of the current tag being processed.
   */
  currentLocInfo: errors.ErrorLocation;

  /**
   * Template validatior instance to verify blocks applied to an element.
   */
  validator: TemplateValidator;

  /**
   * @param template The template being analyzed.
   */
  constructor(template: Template, options: TemplateValidatorOptions={}) {
    this.template = template;
    this.blocks = {};
    this.stylesFound = new Set();
    this.dynamicStyles = new Set();
    this.styleCorrelations = [];
    this.validator = new TemplateValidator(options);
  }

  /**
   * @param block The block for which the local name should be returned.
   * @return The local name of the given block.
   */
  getBlockName(block: Block): string | null {
    let names = Object.keys(this.blocks);
    for (let i = 0; i < names.length; i++) {
      if (this.blocks[names[i]] === block) {
        return names[i];
      }
    }
    return null;
  }

  /**
   * Add a single style to the analysis object. Dynamic styles will add all
   * possible applications to the correlations list.
   * ex: f(a, false); f(b, true); f(c, true) => [[a], [a, b], [a, c], [a, b, c]]
   * @param obj The block object referenced on the current element.
   * @param isDynamic If this style is dynamically applied.
   */
  addStyle( obj: BlockObject, isDynamic=false ): this {
    this.stylesFound.add(obj);
    if (!this.currentCorrelations.length) {
      this.currentCorrelations.push(new Set());
    }

    let toAdd: Set<BlockObject>[] = [];
    this.currentCorrelations.forEach((correlation) => {
      if ( isDynamic ) {
        correlation = new Set(correlation);
        toAdd.push(correlation);
      }
      correlation.add(obj);
    });
    this.currentCorrelations.push(...toAdd);

    if ( isDynamic ) {
      this.dynamicStyles.add(obj);
    }

    return this;
  }

    /**
     * Add styles to an analysis that are mutually exclusive and will never be
     * used at the same time. Always assumed to be dynamic.
     * ex: f(a); f(b, c, d); => [[a], [a, b], [a, c], [a, d]]
     * @param ...objs The block object referenced on the current element.
     */
    addExclusiveStyles( ...objs: BlockObject[] ): this {

      if (!this.currentCorrelations.length) {
        this.currentCorrelations.push(new Set());
      }

      let toAdd: Set<BlockObject>[] = [];
      objs.forEach( ( obj: BlockObject, idx: number ) => {
        this.stylesFound.add(obj);

        this.currentCorrelations.forEach( (correlation) => {
          if (idx !== objs.length-1) {
            correlation = new Set(correlation);
            toAdd.push(correlation);
          }
          correlation.add(obj);
        });
        this.dynamicStyles.add(obj);
      });

      this.currentCorrelations.unshift(...toAdd);

      return this;
    }

  /**
   * Indicates a new element found in a template. no allocations are performed until a style is added
   * so it is safe to call before you know whether there are any syles on the current element.
   * Allways call [[endElement]] before calling the next [[startElement]], even if the elements are nested in the document.
   */
  startElement( locInfo: errors.ErrorLocation={} ): this {
    if (this.currentCorrelations && this.currentCorrelations.length > 0) {
      throw new errors.CssBlockError(`endElement wasn't called after a previous call to startElement`, this.currentLocInfo);
    }
    this.currentCorrelations = [];
    locInfo.filename = this.template.identifier;
    this.currentLocInfo = locInfo;
    return this;
  }

  /**
   * Indicates all styles for the element have been found.
   */
  endElement(): this {

    this.validator.validate( this.currentCorrelations, this.currentLocInfo);

    if (this.currentCorrelations && this.currentCorrelations.length > 0) {
      this.styleCorrelations.push(...this.currentCorrelations);
      this.currentCorrelations = [];
    }

    return this;
  }

  /**
   * @return The local name for the block object using the local prefix for the block.
   */
  serializedName(o: BlockObject): string {
    return `${this.getBlockName(o.block) || ''}${o.asSource()}`;
  }

  /**
   * All the blocks referenced by this analysis.
   */
  referencedBlocks(): Block[] {
    return Object.keys(this.blocks).map(k => this.blocks[k]);
  }

  /**
   * All the blocks referenced by this block and all the blocks they reference recursively.
   */
  transitiveBlockDependencies(): Set<Block> {
    let deps = new Set<Block>();
    this.referencedBlocks().forEach((block) => {
      deps.add(block);
      let moreDeps = block.transitiveBlockDependencies();
      if (moreDeps.size > 0) {
        deps = new Set([...deps, ...moreDeps]);
      }
    });
    return deps;
  }

  /**
   * All bhe blocks this block depends on. Same as referenced blocks except for the return type.
   */
  blockDependencies(): Set<Block> {
    return new Set<Block>(this.referencedBlocks());
  }

  /**
   * Return whether the styles are correlated by this analysis.
   * @param styles the styles that might be correlated
   */
  areCorrelated(...styles: BlockObject[]): boolean {
    for (let i = 0; i < this.styleCorrelations.length; i++) {
      let c = this.styleCorrelations[i];
      if (styles.every(s => c.has(s))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks whether a block object is used in a dynamic expression in a template.
   * @param style The block object that might be dynamic.
   */
  isDynamic(style: BlockObject): boolean {
    return this.dynamicStyles.has(style);
  }

  /**
   * Checks if a block object is ever used in the template that was analyzed.
   * @param style the block object that might have been used.
   */
  wasFound(style: BlockObject): boolean {
    return this.stylesFound.has(style);
  }

  /**
   * Generates a [[SerializedTemplateAnalysis]] for this analysis.
   */
  serialize(): SerializedTemplateAnalysis {
    let blockRefs = {};
    let styles: string[] =  [];
    let dynamicStyles: number[] = [];
    Object.keys(this.blocks).forEach((localname) => {
      blockRefs[localname] = this.blocks[localname].identifier;
    });
    this.stylesFound.forEach((s) => {
      styles.push(this.serializedName(s));
    });
    styles.sort();

    this.dynamicStyles.forEach((dynamicStyle) => {
      dynamicStyles.push(styles.indexOf(this.serializedName(dynamicStyle)));
    });

    let correlations: number[][] = [];
    this.styleCorrelations.forEach((correlation) => {
      if (correlation.size > 1) {
        let cc: number[] = [];
        correlation.forEach((c) => {
          cc.push(styles.indexOf(this.serializedName(c)));
        });
        cc.sort();
        correlations.push(cc);
      }
    });
    return {
      template: this.template.serialize(),
      blocks: blockRefs,
      stylesFound: styles,
      dynamicStyles: dynamicStyles,
      styleCorrelations: correlations
    };
  }

  /**
   * Creates a TemplateAnalysis from its serialized form.
   * @param serializedAnalysis The analysis to be recreated.
   * @param options The plugin options that are used to parse the blocks.
   * @param postcssImpl The instance of postcss that should be used to parse the block's css.
   */
  static deserialize<Template extends TemplateInfo>(serializedAnalysis: SerializedTemplateAnalysis, blockFactory: BlockFactory): Promise<TemplateAnalysis<Template>> {
    let blockNames = Object.keys(serializedAnalysis.blocks);
    let info = TemplateInfoFactory.deserialize<Template>(serializedAnalysis.template) as Template;
    let analysis = new TemplateAnalysis(info);
    let blockPromises = new Array<Promise<{name: string, block: Block}>>();
    blockNames.forEach(n => {
      let blockIdentifier = serializedAnalysis.blocks[n];
      let promise = blockFactory.getBlock(blockIdentifier).then(block => {
        return {name: n, block: block};
      });
      blockPromises.push(promise);
    });
    return Promise.all(blockPromises).then(values => {
      let localScope = new CustomBlockScope();
      values.forEach(o => {
        analysis.blocks[o.name] = o.block;
        if (o.name === "") {
          localScope.setDefaultBlock(o.block);
        } else {
          localScope.setBlockReference(o.name, o.block);
        }
      });
      let objects = new Array<BlockObject>();
      serializedAnalysis.stylesFound.forEach(s => {
        let blockObject = localScope.lookup(s);
        if (blockObject) {
          objects.push(blockObject);
          analysis.stylesFound.add(blockObject);
        } else {
          throw new Error(`Cannot resolve ${s} to a block style.`);
        }
      });
      serializedAnalysis.styleCorrelations.forEach(correlation => {
        analysis.startElement();
        correlation.forEach(idx => {
          analysis.addStyle(objects[idx], !!~serializedAnalysis.dynamicStyles.indexOf(idx));
        });
        analysis.endElement();
      });
      return analysis;
    });
  }
}

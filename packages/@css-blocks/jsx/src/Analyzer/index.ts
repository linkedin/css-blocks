import { Analysis, Analyzer, Block, BlockFactory } from "@css-blocks/core";
import { TemplateIntegrationOptions } from "@opticss/template-api";
import { some, unwrap } from "@opticss/util";
import traverse from "babel-traverse";
import * as babylon from "babylon";
import * as debugGenerator from "debug";
import * as fs from "fs-extra";
import * as path from "path";
import { deprecate } from "util";

import { JSXOptions, JSXOptionsReader } from "../options";
import { JSXParseError } from "../utils/Errors";

import { JSXTemplate, TEMPLATE_TYPE } from "./Template";
import { elementVisitor, importVisitor } from "./visitors";

export type JSXAnalysis = Analysis<TEMPLATE_TYPE>;

export interface AnalyzerOptions {
  /** A name that is used (if provided) in logging to distinguish output of different analyzers in a build. */
  analyzerName?: string;
}

const deprecatedName = deprecate(
  (name: string, options: JSXOptions & AnalyzerOptions) => {
    options.analyzerName = name;
  },
  "The name parameter of the JSX Analyzer is deprecated and usually unnecessary.\n" +
  "Pass only options and set the analyzerName option there if you really need it (you really don't).",
);

export class CSSBlocksJSXAnalyzer extends Analyzer<TEMPLATE_TYPE> {
  private options: JSXOptionsReader;

  public name?: string;
  public analysisPromises: Map<string, Promise<JSXAnalysis>>;
  public blockPromises: Map<string, Promise<Block>>;
  private debug: debugGenerator.IDebugger;

  constructor(options: JSXOptions & AnalyzerOptions);
  /**
   * @deprecated Use the single argument constructor.
   * @param name Deprecated. Pass the analyzerName option instead;
   */
  constructor(name: string | JSXOptions & AnalyzerOptions, options: JSXOptions & AnalyzerOptions = {}) {
    // ewww need to get rid of this deprecation soon.
    let blockOpts = options && options.compilationOptions || (name && typeof name !== "string" && name.compilationOptions) || {};
    let blockFactory = new BlockFactory(blockOpts);
    super(blockFactory);

    if (typeof name === "string") {
      deprecatedName(name, options);
    } else {
      options = name;
    }
    this.name = options.analyzerName;
    this.options = new JSXOptionsReader(options);
    this.analysisPromises = new Map();
    this.blockPromises = new Map();
    let debugIdent = "css-blocks:jsx:Analyzer";
    if (this.name) {
      debugIdent += `:${this.name}`;
    }
    this.debug = debugGenerator(debugIdent);
  }

  public reset() {
    super.reset();
    this.analysisPromises = new Map();
    this.blockPromises = new Map();
  }

  get optimizationOptions(): TemplateIntegrationOptions {
    return {
      rewriteIdents: {
        id: false,
        class: true,
        omitIdents: {
          id: [],
          class: [],
        },
      },
      analyzedAttributes: ["class"],
      analyzedTagnames: false,
    };
  }

  async analyze(dir: string, entryPoints: string[]): Promise<CSSBlocksJSXAnalyzer> {
    if (!entryPoints.length) {
      throw new JSXParseError("CSS Blocks JSX Analyzer must be passed at least one entry point.");
    }
    let promises: Promise<JSXAnalysis>[] = [];
    for (let entryPoint of entryPoints) {
      promises.push(this.parseFile(path.join(dir, entryPoint)));
    }
    await Promise.all(promises);
    this.debug(`Found ${this.analysisPromises.size} analysis promises`);
    return this;
  }

  private async crawl(template: JSXTemplate): Promise<JSXAnalysis> {

    // If we're already analyzing this template, return the existing analysis promise.
    if (this.analysisPromises.has(template.identifier)) {
      return this.analysisPromises.get(template.identifier)!;
    }

    // Change our process working directory so relative node resolves work.
    let oldDir = process.cwd();
    process.chdir(this.options.baseDir);

    let analysis: JSXAnalysis = this.newAnalysis(template);

    // Parse the file into an AST.
    try {
      analysis.template.ast = some(babylon.parse(template.data, this.options.parserOptions));
    } catch (e) {
      process.chdir(oldDir);
      throw new JSXParseError(`Error parsing '${template.identifier}'\n${e.message}\n\n${template.data}: ${e.message}`, { filename: template.identifier });
    }

    // The blocks importer will insert a promise that resolves to a `ResolvedBlock`
    // for each CSS Blocks import it encounters. Every new `tsx` or `jsx` file discovered
    // will kick of another `Analyzer.parse()` for that file.
    let blockPromises: Promise<Block>[] = [];
    let childTemplatePromises: Promise<JSXAnalysis>[] = [];
    traverse(unwrap(analysis.template.ast), importVisitor(template, this, analysis, blockPromises, childTemplatePromises, this.options));

    // Once all blocks this file is waiting for resolve, resolve with the File object.

    // After import traversal, it is safe to move back to our old working directory.
    process.chdir(oldDir);

    // Wait for all block promises to resolve then resolve with the finished analysis.
    this.debug(`Waiting for ${blockPromises.length} Block imported by "${template.identifier}" to finish compilation.`);
    await Promise.all(blockPromises);
    this.debug(`Waiting for ${childTemplatePromises.length} child templates to finish analysis before analysis of ${template.identifier}.`);
    await Promise.all(childTemplatePromises);
    this.debug(`All child compilations finished for "${template.identifier}".`);
    return analysis;

  }

  /**
   * Provided a code string, return a promise for the fully parsed analytics object.
   * @param data The code string to parse.
   * @param opts Optional analytics parser options.
   */
  public async parse(filename: string, data: string): Promise<JSXAnalysis> {

    let template: JSXTemplate = new JSXTemplate(filename, data);

    this.debug(`Beginning imports crawl of ${filename}.`);
    let analysisPromise = this.crawl(template);
    this.analysisPromises.set(template.identifier, analysisPromise);
    let analysis = await analysisPromise;
    this.debug(`Finished imports crawl of ${filename}.`);

    traverse(unwrap(analysis.template.ast), elementVisitor(analysis));
      // No need to keep detailed template data anymore!
    delete analysis.template.ast;
    delete analysis.template.data;

    return analysis;
  }

  /**
   * Provided a file path, return a promise for the fully parsed analytics object.
   * // TODO: Make streaming?
   * @param file The file path to read in and parse.
   * @param opts Optional analytics parser options.
   */
  public async parseFile(file: string): Promise<JSXAnalysis> {
    file = path.resolve(this.options.baseDir, file);
    try {
      let data = await fs.readFile(file, "utf8");
      return this.parse(file, data);
    } catch (err) {
      throw new JSXParseError(`Cannot read JSX entry point file ${file}: ${err.message}`, { filename: file });
    }
  }
}

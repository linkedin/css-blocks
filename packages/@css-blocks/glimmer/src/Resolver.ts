import DependencyAnalyzer from "@amiller-gh/glimmer-analyzer";
import { ResolvedConfiguration } from "@css-blocks/core";
import { ResolverConfiguration } from "@glimmer/resolver";
import * as debugGenerator from "debug";
import * as fs from "fs-extra";
import * as path from "path";

import { ResolvedFile } from "./Template";

const DEBUG = debugGenerator("css-blocks:glimmer:resolver");

/**
 * Convert constituent template path parts to an Ember Classic style Block path.
 *
 * @param base The base path of the project to discover files relative from.
 * @param templatePath The template's filesystem path relative to `base`.
 * @param ext The extension to look for.
 * @return Where the associated Block should be located on the filesystem.
 */
function toClassicPath(base: string, templatePath: string, ext: string): string {
  // TODO: There is a more robust way to do all this path munging!
  let classic = path.parse(templatePath.replace("templates/", "styles/"));
  delete classic.base; // Required for path.format to pick up new extension.
  classic.ext = `.block.${ext}`;
  return path.join(base, path.format(classic));
}

/**
 * Convert constituent template path parts to an Ember Pods style Block path.
 *
 * @param base The base path of the project to discover files relative from.
 * @param templatePath The template's filesystem path relative to `base`.
 * @param ext The extension to look for.
 * @return Where the associated Block should be located on the filesystem.
 */
function toPodsPath(base: string, templatePath: string, ext: string): string {
  let pods = path.parse(templatePath);
  delete pods.base; // Required for path.format to pick up new extension.
  pods.name = "stylesheet";
  pods.ext = `.block.${ext}`;
  return path.join(base, path.format(pods));
}

/**
 * The Glimmer CSS Blocks Resolver currently supports three
 * kinds of project structure modes:
 *  - Component Names as Paths (Module Config)
 *  - Relative Template Paths (Classic Ember)
 *  - Relative Template Paths (Ember Pods)
 *
 * It provides abstractions for interacting with the three project
 * structures, so the rest of the Glimmer analyzer code can operate
 * independently of the filesystem structure.
 *
*/
export class Resolver {

  private depAnalyzers: Map<string, DependencyAnalyzer> = new Map();
  private moduleConfig?: ResolverConfiguration;
  private fileEndings: Set<string>;

  /**
   * Creates a new Resolver for this project.
   *
   * @param cssBlocksConfig  The CSS Blocks configuration object.
   * @param moduleConfig  If applicable, the Glimmer module config for static analysis.
   */
  constructor(cssBlocksConfig: ResolvedConfiguration, moduleConfig?: ResolverConfiguration) {
    if (moduleConfig) {
      this.moduleConfig = moduleConfig;
    }
    this.fileEndings = new Set(["css", ...Object.keys(cssBlocksConfig.preprocessors)]);
    DEBUG(`Discovering all Block files that end with ("${[...this.fileEndings].join(`|`)}")`);
  }

  /**
   * If appropriate, returns the `DependencyAnalyzer` for a given project.
   * If no module config exists for the project (aka: is not a full, statically
   * analyzable Glimmer app) it returns undefined.
   *
   * @param base  The base path of the project to analyze.
   * @return The DependencyAnalyzer, or undefined.
   */
  private dependencyAnalyzerFor(base: string): DependencyAnalyzer | undefined {
    DEBUG("Base directory for dependency analysis is %s", base);

    if (!this.moduleConfig) { return undefined; }
    if (this.depAnalyzers.has(base)) {
      return this.depAnalyzers.get(base)!;
    }
    let src = this.moduleConfig.app && this.moduleConfig.app.mainPath || "src";
    let depAnalyzer = new DependencyAnalyzer(base, {
      config: { moduleConfiguration: this.moduleConfig },
      paths: {
        src,
      },
    });
    this.depAnalyzers.set(base, depAnalyzer);
    return depAnalyzer;
  }

  /**
   * Converts a template file path to its associated Block filepath, if present.
   * All file endings associated with a preprocessor are attempted.
   * If no block exists, returns undefined.
   *
   * @param base  The base path of the project to lookup Block files relative to.
   * @param template  The template name we're attempting to discover block files for.
   * @return A promise that resolves with the discover Block path, or undefined.
   */
  private async tmplPathToStylesheetPath(base: string, template: string): Promise<string | undefined> {
    let triedPaths = [];
    // For every supported block extension:
    for (let ext of this.fileEndings) {
      // First try Classic Ember structure.
      let classic = toClassicPath(base, template, ext);
      if (fs.pathExistsSync(classic)) {
        DEBUG(`Discovered classic Block for template ${template}: ${classic}`);
        return classic;
      }
      // Else attempt to fetch at the pods path.
      let podsPath = toPodsPath(base, template, ext);
      if (fs.pathExistsSync(podsPath)) {
        DEBUG(`Discovered pods Block for template ${template}: ${podsPath}`);
        return podsPath;
      }
      triedPaths.push(path.relative(base, classic), path.relative(base, podsPath));
    }

    // If we get here, there is no Block file at any standard Ember location, for any support file ending.
    DEBUG(`No Block discovered for template ${template}. Attempted at:${triedPaths.join(`\n  - `)}`);
    return undefined;
  }

  /**
   * If possible, return the recursive template dependencies for the
   * provided template identifier. This will only return new data in
   * "Module Map" mode where we can statically analyze application
   * dependencies. In "Classic Ember" or "Ember Pods" mode we just
   * return the same ident.
   *
   * @param base The base of the project to analyze.
   * @param identifier  The Glimmer identifier to discover recursive dependencies for.
   * @return The list of recursive dependencies for this identifier.
   */
  recursiveDependenciesForTemplate(base: string, identifier: string): string[] {
    let depAnalyzer = this.dependencyAnalyzerFor(base);
    if (!depAnalyzer) { return [identifier]; }
    return depAnalyzer.recursiveDependenciesForTemplate(identifier).components;
  }

  /**
   * Given a template identifier, resolve the Block file associated
   * with the template, if any.
   *
   * @param base The base of the project to analyze.
   * @param identifier  The Glimmer identifier to discover recursive dependencies for.
   * @return The resolved Block file if present, or undefined.
  */
  async stylesheetFor(base: string, identifier: string): Promise<ResolvedFile | undefined> {
    let depAnalyzer = this.dependencyAnalyzerFor(base);

    if (!depAnalyzer) {
      let stylesheet = await this.tmplPathToStylesheetPath(base, identifier);
      if (!stylesheet) { return undefined; }
      return new ResolvedFile(
        (fs.readFileSync(stylesheet)).toString(),
        stylesheet,
        stylesheet,
      );
    }

    // TODO: We need to automatically discover the file ending here – its not guaranteed to be a css file.
    identifier = depAnalyzer.project.resolver.identify(`stylesheet:${identifier}`);
    let file: string = depAnalyzer.project.resolver.resolve(identifier);
    if (!file) { return undefined; }
    file = path.join(base, depAnalyzer.project.paths.src, file);
    if (!fs.existsSync(file)) { return undefined; }
    let content = (fs.readFileSync(file)).toString();
    return new ResolvedFile(content, identifier, file);
  }

  /**
   * Given a template identifier, resolve the actual template file associated
   * with it, if any.
   * @param base The base of the project to analyze.
   * @param identifier The template identifier to discover recursive dependencies for.
   * @return The resolved Block file if present, or undefined.
  */
  async templateFor(base: string, identifier: string): Promise<ResolvedFile | undefined> {
    let depAnalyzer = this.dependencyAnalyzerFor(base);

    if (!depAnalyzer) {
      let template = path.join(base, identifier);
      return new ResolvedFile(
        (fs.readFileSync(template)).toString(),
        identifier,
        identifier,
      );
    }

    let template = depAnalyzer.project.templateFor(identifier);
    return new ResolvedFile(template.string, template.specifier, template.path);

  }
}

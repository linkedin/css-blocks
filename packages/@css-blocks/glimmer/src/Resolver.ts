import * as fs from "fs-extra";
import * as path from "path";

import DependencyAnalyzer from "@amiller-gh/glimmer-analyzer";
import { ResolvedConfiguration } from "@css-blocks/core";
import { ResolverConfiguration } from "@glimmer/resolver";

import * as debugGenerator from "debug";

import { ResolvedFile } from "./Template";

const DEBUG = debugGenerator("css-blocks:glimmer:resolver");

function toClassicPath(base: string, templatePath: string, ext: string): string {
  // TODO: There is a more robust way to do all this path munging!
  let classic = path.parse(templatePath.replace("templates/", "styles/"));
  delete classic.base; // Required for path.format to pick up new extension.
  classic.ext = `.block.${ext}`;
  return path.join(base, path.format(classic));
}

function toPodsPath(base: string, templatePath: string, ext: string): string {
  let pods = path.parse(templatePath);
  delete pods.base; // Required for path.format to pick up new extension.
  pods.name = "stylesheet";
  pods.ext = `.block.${ext}`;
  return path.join(base, path.format(pods));
}

/**
 * The Glimmer CSS Blocks Resolver deals in three
 * kinds of project structure modes:
 *  - Component Names as Paths (Module Config)
 *  - Relative Template Paths (Classic Ember)
 *  - Relative Template Paths (Ember Pods)
*/
export class Resolver {

  private depAnalyzers: Map<string, DependencyAnalyzer> = new Map();
  private moduleConfig?: ResolverConfiguration;
  private fileEndings: Set<string>;

  constructor(cssBlocksConfig: ResolvedConfiguration, moduleConfig?: ResolverConfiguration) {
    if (moduleConfig) {
      this.moduleConfig = moduleConfig;
    }
    this.fileEndings = new Set(["css", ...Object.keys(cssBlocksConfig.preprocessors)]);
    DEBUG(`Discovering all Block files that end with ("${[...this.fileEndings].join(`|`)}")`);
  }

  private dependencyAnalyzerFor(dir: string): DependencyAnalyzer | undefined {
    if (!this.moduleConfig) { return undefined; }
    if (this.depAnalyzers.has(dir)) {
      return this.depAnalyzers.get(dir)!;
    }
    let src = this.moduleConfig.app && this.moduleConfig.app.mainPath || "src";
    let depAnalyzer = new DependencyAnalyzer(dir, {
      config: { moduleConfiguration: this.moduleConfig },
      paths: {
        src,
      },
    });
    this.depAnalyzers.set(dir, depAnalyzer);
    return depAnalyzer;
  }

  // TODO: We need to automatically discover the file ending here – its not guaranteed to be a css file.
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
      let podsPath = toPodsPath(base, template, ext);
      if (fs.pathExistsSync(podsPath)) {
        DEBUG(`Discovered pods Block for template ${template}: ${podsPath}`);
        return podsPath;
      }
      triedPaths.push(path.relative(base, classic), path.relative(base, podsPath));
    }
    DEBUG(`No Block discovered for template ${template}. Attempted at:${triedPaths.join(`\n  - `)}`);
    return undefined;
  }

  /**
   * If possible, return the recursive template dependencies for the
   * provided template identifier. This will only return new data in
   * "Module Map" mode where we can statically analyze application
   * dependencies. In "Classic Ember" or "Ember Pods" mode we just
   * return the same ident.
   */
  recursiveDependenciesForTemplate(dir: string, identifier: string): string[] {
    let depAnalyzer = this.dependencyAnalyzerFor(dir);
    if (!depAnalyzer) { return [identifier]; }
    return depAnalyzer.recursiveDependenciesForTemplate(identifier).components;
  }

  /**
   * Given a template identifier, resolve the Block file associated
   * with the template, if any.
  */
  async stylesheetFor(dir: string, identifier: string): Promise<ResolvedFile | undefined> {
    let depAnalyzer = this.dependencyAnalyzerFor(dir);

    if (!depAnalyzer) {
      let stylesheet = await this.tmplPathToStylesheetPath(dir, identifier);
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
    file = path.join(dir, depAnalyzer.project.paths.src, file);
    if (!fs.existsSync(file)) { return undefined; }
    let content = (fs.readFileSync(file)).toString();
    return new ResolvedFile(content, identifier, file);
  }

  /**
   * Given a template identifier, resolve the actual template file associated
   * with it, if any.
  */
  async templateFor(dir: string, identifier: string): Promise<ResolvedFile | undefined> {
    let depAnalyzer = this.dependencyAnalyzerFor(dir);

    if (!depAnalyzer) {
      let template = path.join(dir, identifier);
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

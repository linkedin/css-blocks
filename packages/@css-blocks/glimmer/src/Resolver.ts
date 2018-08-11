import * as fs from "fs-extra";
import * as path from "path";

import DependencyAnalyzer from "@amiller-gh/glimmer-analyzer";
import { ResolverConfiguration } from "@glimmer/resolver";

import * as debugGenerator from "debug";

import { ResolvedFile } from "./Template";

const DEBUG = debugGenerator("css-blocks:glimmer:resolver");

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

  constructor(moduleConfig?: ResolverConfiguration) {
    if (moduleConfig) {
      this.moduleConfig = moduleConfig;
    }
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
  private async tmplPathToStylesheetPath(dir: string, template: string): Promise<string | undefined> {
    // First try Classic Ember structure.
    // TODO: There is a more robust way to do this path munging!
    let classic = template.replace("templates/", "styles/").replace(".hbs", ".block.css");
    classic = path.join(dir, classic);
    if (fs.pathExistsSync(classic)) {
      DEBUG(`Discovered classic Block for template ${template}:`);
      DEBUG(`  - ${classic}`);
      return classic;
    }
    let pods = path.parse(template);
    pods.base = "stylesheet.block.css";
    let podsPath =  path.join(dir, path.format(pods));
    if (fs.pathExistsSync(podsPath)) {
      DEBUG(`Discovered pods Block for template ${template}:`);
      DEBUG(`  - ${podsPath}`);
      return podsPath;
    }
    DEBUG(`No Block discovered for template ${template}. Attempted at:`);
    DEBUG(`  - ${classic}`);
    DEBUG(`  - ${podsPath}`);
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

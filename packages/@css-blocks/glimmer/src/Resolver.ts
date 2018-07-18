import * as fs from "fs-extra";
import * as path from "path";

import { ResolverConfiguration } from "@glimmer/resolver";

import * as debugGenerator from "debug";
import DependencyAnalyzer from "glimmer-analyzer";

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

  projectDir: string;
  srcDir: string;
  depAnalyzer?: DependencyAnalyzer;

  constructor(projectDir: string, srcDir: string, moduleConfig?: ResolverConfiguration) {
    this.projectDir = projectDir;
    this.srcDir = srcDir;

    // If a module config is present, initialize ourselves so we can resolve
    // dependencies from component names.
    if (moduleConfig) {
      this.depAnalyzer = new DependencyAnalyzer(projectDir, {
        config: { moduleConfiguration: moduleConfig },
        paths: {
          src: srcDir,
        },
      });
    }
  }

  // TODO: We need to automatically discover the file ending here – its not guaranteed to be a css file.
  private async tmplPathToStylesheetPath(template: string): Promise<string | undefined> {
    // First try Classic Ember structure.
    let classic = template.replace('templates/', 'styles/').replace('.hbs', '.block.css');
    classic = path.join(this.projectDir, this.srcDir, classic);
    if (await fs.pathExists(classic)) {
      DEBUG(`Discovered classic Block for template ${template}:`);
      DEBUG(`  - ${classic}`);
      return classic;
    }
    let pods = path.parse(template);
    pods.base = "stylesheet.block.css";
    let podsPath =  path.join(this.projectDir, this.srcDir, path.format(pods));
    if (await fs.pathExists(podsPath)) {
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
  recursiveDependenciesForTemplate(identifier: string): string[] {
    if (!this.depAnalyzer) { return [identifier]; }
    return this.depAnalyzer.recursiveDependenciesForTemplate(identifier).components;
  }

  /**
   * Given a template identifier, resolve the Block file associated
   * with the template, if any.
  */
  async stylesheetFor(identifier: string): Promise<ResolvedFile | undefined> {
    if (!this.depAnalyzer) {
      let stylesheet = await this.tmplPathToStylesheetPath(identifier);
      if (!stylesheet ) { return undefined; }
      return new ResolvedFile(
        (await fs.readFile(stylesheet)).toString(),
        stylesheet,
        stylesheet
      );
    }

    // TODO: We need to automatically discover the file ending here – its not guaranteed to be a css file.
    identifier = this.depAnalyzer.project.resolver.identify(`stylesheet:${identifier}`);
    let file: string = this.depAnalyzer.project.resolver.resolve(identifier);
    file = path.join(this.projectDir, this.srcDir, file);

    let content = (await fs.readFile(file)).toString();
    return new ResolvedFile(content, identifier, file);
  }

  /**
   * Given a template identifier, resolve the actual template file associated
   * with it, if any.
  */
  async templateFor(identifier: string): Promise<ResolvedFile | undefined> {
    if (!this.depAnalyzer) {
      let template = path.join(this.projectDir, this.srcDir, identifier);
      return new ResolvedFile(
        (await fs.readFile(template)).toString(),
        identifier,
        identifier
      );
    }
    try {
      let template = this.depAnalyzer.project.templateFor(identifier);
      return new ResolvedFile(template.string, template.specifier, template.path);
    } catch(e) {
      return undefined;
    }
  }
}
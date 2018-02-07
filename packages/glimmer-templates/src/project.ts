import {
  BlockFactory,
  PluginOptions,
  PluginOptionsReader
} from "css-blocks";
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import * as postcss from "postcss";

import resMapBuilder = require('@glimmer/resolution-map-builder');
const buildResolutionMap = resMapBuilder.buildResolutionMap;
import Resolver, { BasicModuleRegistry } from '@glimmer/resolver';

import { GlimmerImporter } from "./GlimmerImporter";
import { GlimmerProject, ResolvedFile, ResolvedPath } from "./GlimmerProject";
import { MODULE_CONFIG } from './module-config';
import { parseSpecifier } from "./utils";

export class Project implements GlimmerProject {
  projectDir: string;
  map: resMapBuilder.ResolutionMap;
  resolver: Resolver;
  registry: BasicModuleRegistry;
  blockImporter: GlimmerImporter;
  blockFactory: BlockFactory;
  cssBlocksOpts: PluginOptionsReader;

  constructor(projectDir: string, moduleConfig?: any, blockOpts?: PluginOptions) {
    this.projectDir = projectDir;
    this.cssBlocksOpts = new PluginOptionsReader(blockOpts || {});
    this.blockImporter = new GlimmerImporter(this, this.cssBlocksOpts.importer);
    this.cssBlocksOpts = Object.assign({}, this.cssBlocksOpts, { importer: this.blockImporter });
    this.blockFactory = new BlockFactory(this.cssBlocksOpts, postcss);
    let pkg = this.loadPackageJSON(projectDir);
    let { name } = pkg;

    let config = {
      ...(moduleConfig || MODULE_CONFIG),
      app: {
        name,
        rootName: name
      }
    };

    let map = this.map = buildResolutionMap({
      projectDir,
      moduleConfig: config,
      modulePrefix: name
    });

    this.registry = new BasicModuleRegistry(map);
    this.resolver = new Resolver(config, this.registry);
  }
  resolveStylesheet(glimmerIdentifier: string, fromGlimmerIdentifier?: string): ResolvedPath | null {
    let specifier = parseSpecifier(glimmerIdentifier);
    if (specifier) {
      glimmerIdentifier = "stylesheet:" + specifier.componentName;
    } else {
      glimmerIdentifier = "stylesheet:" + glimmerIdentifier;
    }
    return this.resolve(glimmerIdentifier, fromGlimmerIdentifier);
  }
  resolveTemplate(glimmerIdentifier: string, fromGlimmerIdentifier?: string): ResolvedPath | null {
    let specifier = parseSpecifier(glimmerIdentifier);
    if (specifier) {
      glimmerIdentifier = "template:" + specifier.componentName;
    } else {
      glimmerIdentifier = "template:" + glimmerIdentifier;
    }
    return this.resolve(glimmerIdentifier, fromGlimmerIdentifier);
  }
  resolve(glimmerIdentifier: string, fromGlimmerIdentifier?: string): ResolvedPath | null {
    let specifier = this.resolver.identify(glimmerIdentifier, fromGlimmerIdentifier);
    if (!specifier) { return null; }

    let relativePath = this.resolver.resolve(specifier);
    if (!relativePath) { return null; }

    // XXX: Is this `src` folder standard or is it based on some glimmer config?
    let globPattern = path.join(this.projectDir, 'src', `${relativePath}.*`);
    let paths = glob.sync(globPattern);
    if (paths.length > 0) {
      return {
        fullPath: paths[0],
        specifier: specifier
      };
    } else {
      return null;
    }
  }

  resolveFile(glimmerIdentifier: string, fromGlimmerIdentifier?: string): ResolvedFile | null {
    let resolution = this.resolve(glimmerIdentifier, fromGlimmerIdentifier);
    if (!resolution) {
      return null;
    }
    let { fullPath, specifier } = resolution;
    let contents = fs.readFileSync(fullPath, 'utf8');
    return new ResolvedFile(contents, specifier, fullPath);
  }

  relativize(fullPath: string): string {
    return path.relative(path.join(this.projectDir, 'src'), fullPath);
  }

  stylesheetFor(stylesheetName: string, fromGlimmerIdentifier?: string): ResolvedFile | undefined {
    return this.resolveFile(`stylesheet:${stylesheetName}`, fromGlimmerIdentifier) || undefined;
  }

  templateFor(templateName: string, fromGlimmerIdentifier?: string): ResolvedFile {
    let resolvedFile = this.resolveFile(`template:${templateName}`, fromGlimmerIdentifier) || undefined;
    if (!resolvedFile) {
      throw new Error(`Couldn't find template for component ${templateName} in Glimmer app ${this.projectDir}.`);
    }
    return resolvedFile;
  }

  reset() {
    this.blockFactory.reset();
  }

  private loadPackageJSON(appPath: string) {
    let pkgPath = path.join(appPath, 'package.json');
    try {
      return JSON.parse(fs.readFileSync(pkgPath).toString());
    } catch (e) {
      let err = Error(`Couldn't load package.json file at ${pkgPath}: ${e.message}`);
      err.stack = e.stack;
      throw err;
    }
  }
}

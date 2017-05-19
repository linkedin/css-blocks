import fs = require('fs');
import path = require('path');

import { buildResolutionMap } from '@glimmer/resolution-map-builder';
import Resolver, { BasicModuleRegistry } from '@glimmer/resolver';

import DEFAULT_MODULE_CONFIG from './module-config';

export interface ResolutionMap {
  [specifier: string]: string;
}

export class Template {
  string: string;
  specifier: string;

  constructor(templateString: string, specifier: string) {
    this.string = templateString;
    this.specifier = specifier;
  }
}

export default class Project {
  projectDir: string;
  map: ResolutionMap;
  resolver: Resolver;
  registry: BasicModuleRegistry;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
    let pkg = this.loadPackageJSON(projectDir);
    let { name } = pkg;

    let config = {
      ...DEFAULT_MODULE_CONFIG,
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

  templateFor(templateName: string) {
    let specifier = this.resolver.identify(`template:${templateName}`);
    if (!specifier) {
      throw new Error(`Couldn't find template for component ${templateName} in Glimmer app ${this.projectDir}.`)
    }

    let templatePath = this.resolver.resolve(specifier);
    let templateString = fs.readFileSync(path.join(this.projectDir, 'src', templatePath), 'utf8');

    return new Template(templateString, specifier);
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

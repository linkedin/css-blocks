import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as postcss from "postcss";
import {
  RawSourceMap
} from "source-map";
import {
  PluginOptions,
  TemplateInfo,
  TemplateInfoConstructor,
  TemplateInfoFactory,
  SerializedTemplateInfo,
  BlockFactory,
  Importer,
  PathBasedImporter,
  FileIdentifier,
  ImportedFile,
  PluginOptionsReader,
  filesystemImporter
} from "css-blocks";

import resMapBuilder = require('@glimmer/resolution-map-builder');
const buildResolutionMap  = resMapBuilder.buildResolutionMap;
import Resolver, { BasicModuleRegistry } from '@glimmer/resolver';

import DEFAULT_MODULE_CONFIG from './module-config';

export interface ResolutionMap {
  [specifier: string]: string;
}

export interface ResolvedPath {
  specifier: string;
  fullPath: string;
}

export class ResolvedFile extends TemplateInfo {
  string: string;
  fullPath: string;
  static typeName = "GlimmerTemplates.ResolvedFile";

  constructor(templateString: string, specifier: string, fullPath: string) {
    super(specifier);
    this.string = templateString;
    this.fullPath = fullPath;
  }
  serialize(): SerializedTemplateInfo {
    return {
      type: ResolvedFile.typeName,
      identifier: this.identifier,
      data: [
        this.string,
        this.fullPath
      ]
    };
  }
  static deserialize(identifier, string, fullPath): ResolvedFile {
    return new ResolvedFile(string, identifier, fullPath);
  }
}

TemplateInfoFactory.register(ResolvedFile.typeName, ResolvedFile as TemplateInfoConstructor);

const glimmerImportIdentifier = /^glimmer:(.+)$/;

export class GlimmerImporter extends PathBasedImporter {
  project: Project;
  otherImporter: Importer;
  constructor(project: Project, otherImporter?: Importer) {
    super();
    this.project = project;
    this.otherImporter = otherImporter || filesystemImporter;
  }
  demangle(identifier: FileIdentifier | null): string | null {
    if (identifier && glimmerImportIdentifier.exec(identifier)) {
      return RegExp.$1;
    } else if (identifier && (identifier.startsWith("template:") || identifier.startsWith("stylesheet:"))) {
      return identifier;
    } else {
      return null;
    }
  }
  defaultName(identifier: FileIdentifier, options: PluginOptionsReader) {
    let specifier = this.demangle(identifier);
    if (specifier) {
      if (specifier.startsWith("stylesheet:")) {
        return path.basename(specifier.substring(11));
      } else {
        throw new Error(`${identifier} is not a legal identifier for a glimmer stylesheet`);
      }
    } else {
      return this.otherImporter.defaultName(identifier, options);
    }
  }
  identifier(fromFile: FileIdentifier | null, importPath: string, options: PluginOptionsReader): FileIdentifier {
    let referrer = this.demangle(fromFile) || undefined;
    let resolution = this.project.resolve(`stylesheet:${importPath}`, referrer);
    if (resolution) {
      return `glimmer:${resolution.specifier}`;
    } else {
      if (referrer) {
        let refResolution = this.project.resolve(referrer);
        if (refResolution) {
          try {
            fromFile = this.otherImporter.identifier(null, refResolution.fullPath, options);
          } catch (e) {
            // >_< The other importer doesn't understand file paths, we'll try it without.
            fromFile = null;
          }
          return this.otherImporter.identifier(fromFile, importPath, options);
        } else {
          throw new Error(`Could not resolve Glimmer specifier '${referrer}' to a file.`);
        }
      } else {
        return this.otherImporter.identifier(fromFile, importPath, options);
      }
    }
  }
  filesystemPath(identifier: string, options: PluginOptionsReader): string | null {
    let specifier = this.demangle(identifier);
    if (specifier) {
        let resolution = this.project.resolve(specifier);
        if (resolution) {
          return resolution.fullPath;
        } else {
          return null;
        }
    } else {
      return this.otherImporter.filesystemPath(identifier, options);
    }
  }
  inspect(identifier: string, options): string {
    let specifier = this.demangle(identifier);
    if (specifier) {
        let resolution = this.project.resolve(specifier);
        if (resolution) {
          return this.project.relativize(resolution.fullPath);
        } else {
          return specifier;
        }
    } else {
      return this.otherImporter.inspect(identifier, options);
    }
  }
  import(identifier: FileIdentifier, options: PluginOptionsReader): Promise<ImportedFile> {
    let specifier = this.demangle(identifier);
    if (specifier) {
        let resolution = this.project.resolveFile(specifier);
        if (resolution) {
            return Promise.resolve({
              syntax: this.syntax(identifier, options),
              identifier: identifier,
              contents: resolution.string,
              defaultName: this.defaultName(identifier, options)
            });
        } else {
          throw new Error(`File not found for ${specifier}`);
        }
    } else {
      return this.otherImporter.import(identifier, options);
    }
  }
}

export default class Project {
  projectDir: string;
  map: ResolutionMap;
  resolver: Resolver;
  registry: BasicModuleRegistry;
  blockImporter: Importer;
  blockFactory: BlockFactory;
  cssBlocksOpts: PluginOptions;

  constructor(projectDir: string, moduleConfig?: any, blockOpts?: PluginOptions) {
    this.projectDir = projectDir;
    this.cssBlocksOpts = blockOpts || {};
    this.blockImporter = new GlimmerImporter(this, this.cssBlocksOpts.importer);
    this.cssBlocksOpts = Object.assign({}, this.cssBlocksOpts, {importer: this.blockImporter});
    this.blockFactory = new BlockFactory(this.cssBlocksOpts, postcss);
    let pkg = this.loadPackageJSON(projectDir);
    let { name } = pkg;

    let config = {
      ...(moduleConfig || DEFAULT_MODULE_CONFIG),
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

  resolve(glimmerIdentifier: string, _fromGlimmerIdentifier?: string): ResolvedPath | null {
    // XXX TODO figure out how referrers work for identify and resolve
    let specifier = this.resolver.identify(glimmerIdentifier);
    if (!specifier) {
      return null;
    }

    let relativePath = this.resolver.resolve(specifier);
    if (!relativePath) {
      return null;
    }
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

  stylesheetFor(stylesheetName: string, fromGlimmerIdentifier?: string): ResolvedFile | undefined  {
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

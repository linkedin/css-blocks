import {
  PluginOptions,
  TemplateInfo,
  TemplateInfoConstructor,
  TemplateInfoFactory,
  SerializedTemplateInfo,
  BlockFactory,
  Importer,
} from "css-blocks";
import Resolver, {
  BasicModuleRegistry
} from '@glimmer/resolver';
import {
  ResolutionMap
} from '@glimmer/resolution-map-builder';

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

export interface GlimmerProject {
  projectDir: string;
  map: ResolutionMap;
  resolver: Resolver;
  registry: BasicModuleRegistry;
  blockImporter: Importer;
  blockFactory: BlockFactory;
  cssBlocksOpts: PluginOptions;

  resolveStylesheet(glimmerIdentifier: string, fromGlimmerIdentifier?: string): ResolvedPath | null;
  resolveTemplate(glimmerIdentifier: string, fromGlimmerIdentifier?: string): ResolvedPath | null;
  resolve(glimmerIdentifier: string, fromGlimmerIdentifier?: string): ResolvedPath | null;
  resolveFile(glimmerIdentifier: string, fromGlimmerIdentifier?: string): ResolvedFile | null;
  relativize(fullPath: string): string;
  stylesheetFor(stylesheetName: string, fromGlimmerIdentifier?: string): ResolvedFile | undefined;
  templateFor(templateName: string, fromGlimmerIdentifier?: string): ResolvedFile;
  reset();
}
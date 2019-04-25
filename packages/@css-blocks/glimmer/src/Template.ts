import {
  SerializedTemplateInfo,
  TemplateInfo,
  TemplateInfoFactory,
} from "@opticss/template-api";

export const TEMPLATE_NAME = "GlimmerTemplates.ResolvedFile";
export type TEMPLATE_TYPE = typeof TEMPLATE_NAME;

export interface ResolvedPath {
  specifier: string;
  fullPath: string;
}

export class ResolvedFile implements TemplateInfo<TEMPLATE_TYPE> {
  identifier: string;
  string: string;
  path: string;
  type: TEMPLATE_TYPE = TEMPLATE_NAME;

  constructor(templateString: string, specifier: string, fullPath: string) {
    this.identifier = specifier;
    this.string = templateString;
    this.path = fullPath;
  }
  serialize(): SerializedTemplateInfo<TEMPLATE_TYPE> {
    return {
      type: this.type,
      identifier: this.identifier,
      data: [
        this.string,
        this.path,
      ],
    };
  }
  static deserialize(identifier: string, str: unknown, fullPath: unknown): ResolvedFile {
    return new ResolvedFile(<string>str, identifier, <string>fullPath);
  }
}

TemplateInfoFactory.constructors[TEMPLATE_NAME] = ResolvedFile.deserialize;

declare module "@opticss/template-api" {
  interface TemplateTypes {
    [TEMPLATE_NAME]: ResolvedFile;
  }
}

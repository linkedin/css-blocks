import {
  SerializedTemplateInfo,
  TemplateInfo,
  TemplateInfoFactory,
} from "@opticss/template-api";

export const TEMPLATE_NAME = "HandlebarsTemplate";
export type TEMPLATE_TYPE = typeof TEMPLATE_NAME;

export class HandlebarsTemplate implements TemplateInfo<TEMPLATE_TYPE> {
  identifier: string;
  fullPath: string;
  relativePath: string;
  type: TEMPLATE_TYPE = TEMPLATE_NAME;

  constructor(fullPath: string, relativePath: string) {
    this.identifier = fullPath; // XXX Maybe use a md5 sum for this?
    this.fullPath = fullPath;
    this.relativePath = relativePath;
  }
  serialize(): SerializedTemplateInfo<TEMPLATE_TYPE> {
    return {
      type: this.type,
      identifier: this.identifier,
      data: [
        this.relativePath,
      ],
    };
  }
  static deserialize(identifier: string, relativePath: unknown): HandlebarsTemplate {
    return new HandlebarsTemplate(identifier, <string>relativePath);
  }
}

TemplateInfoFactory.constructors[TEMPLATE_NAME] = HandlebarsTemplate.deserialize;

declare module "@opticss/template-api" {
  interface TemplateTypes {
    [TEMPLATE_NAME]: HandlebarsTemplate;
  }
}

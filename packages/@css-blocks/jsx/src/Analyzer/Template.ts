import {
  SerializedTemplateInfo,
  TemplateInfo,
  TemplateInfoFactory,
} from "@opticss/template-api";
import { Maybe, none } from "@opticss/util";
import { File } from "babel-types";

export type TEMPLATE_TYPE = "Opticss.JSXTemplate";

declare module "@opticss/template-api" {
  interface TemplateTypes {
    "Opticss.JSXTemplate": JSXTemplate;
  }
}

export class JSXTemplate implements TemplateInfo<TEMPLATE_TYPE> {
  identifier: string;
  type: TEMPLATE_TYPE = "Opticss.JSXTemplate";
  data: string;
  ast: Maybe<File>;

  constructor(identifier: string, data: string) {
    this.identifier = identifier;
    this.data = data;
    this.ast = none("The template was not yet parsed.");
  }

  static deserialize(identifier: string, ..._data: unknown[]): JSXTemplate {
    return new JSXTemplate(identifier, <string>_data[0]);
  }

  serialize(): SerializedTemplateInfo<"Opticss.JSXTemplate"> {
    return {
      type: this.type,
      identifier: this.identifier,
      data: [ this.data ],
    };
  }
}

TemplateInfoFactory.constructors["Opticss.JSXTemplate"] = JSXTemplate.deserialize;

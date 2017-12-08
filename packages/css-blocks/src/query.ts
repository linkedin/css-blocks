import { Block, Style } from "./Block";
import postcss = require("postcss");
import {
  ClassifiedParsedSelectors,
  QueryKeySelector as QueryKeySelectorImpl
} from "opticss";
import {
  Element,
  Tagname,
} from "@opticss/element-analysis";

export interface Query {
  execute(container: postcss.Container): ClassifiedParsedSelectors;
}

export class QueryKeySelector implements Query {
  target: Style;
  impl: QueryKeySelectorImpl;
  constructor(obj: Style) {
    this.target = obj;
    let tag = new Tagname({unknown: true});
    let attrs = obj.asSourceAttributes();
    this.impl = new QueryKeySelectorImpl(new Element(tag, attrs));
  }

  execute(container: postcss.Container, block?: Block): ClassifiedParsedSelectors {
    return this.impl.execute(container, block);
  }
}

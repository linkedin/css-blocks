import * as postcss from "postcss";

import {
  BlockFactory,
  Configuration,
  Importer,
  resolveConfiguration,
} from "../../src";
import { MockImportRegistry } from "../util/MockImportRegistry";
export { Importer, Configuration } from "../../src";

export function setupImporting(opts?: Partial<Readonly<Configuration>>) {
  let imports = new MockImportRegistry();
  let importer: Importer = imports.importer();
  let config = resolveConfiguration({importer}, opts);
  let factory = new BlockFactory(config, postcss);
  return {
    imports,
    importer,
    config,
    factory,
  };
}

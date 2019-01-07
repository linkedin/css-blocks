import * as path from "path";

import { postcss } from "opticss";

import {
  BlockFactory,
  Configuration,
  MockImporter,
  resolveConfiguration,
} from "../../src";

const ROOT = path.join(__dirname, "../../..");

export function setupImporting(opts?: Partial<Readonly<Configuration>>) {
  let importer: MockImporter = new MockImporter(ROOT);
  let config = resolveConfiguration({ importer }, opts);
  let factory = new BlockFactory(config, postcss);
  return {
    importer,
    config,
    factory,
  };
}

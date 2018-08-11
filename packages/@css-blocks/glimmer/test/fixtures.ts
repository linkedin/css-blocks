import * as path from "path";

function fixture(fixturePath: string) {
  let p = path.resolve(__dirname, "..", "..", "..", "test", "fixtures", fixturePath);
  return p;
}

const moduleConfig = require("@glimmer/application-pipeline/dist/lib/broccoli/default-module-configuration.js").default;
moduleConfig.types.stylesheet = { definitiveCollection: "components" };
moduleConfig.collections.components.types.push("stylesheet");

export {
  moduleConfig,
  fixture,
};

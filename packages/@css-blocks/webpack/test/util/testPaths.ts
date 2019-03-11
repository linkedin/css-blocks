import * as path from "path";

export const DIST_DIRECTORY = path.resolve(__dirname, "..", "..");
export const FIXTURES_DIRECTORY = path.resolve(DIST_DIRECTORY, "..", "test", "fixtures");
export const BLOCK_FIXTURES_DIRECTORY = path.resolve(FIXTURES_DIRECTORY, "blocks");
export const BLOCK_LOADER_PATH = require.resolve("../../src/loader.js");
export const WEBPACK_DEV_SERVER_PATH = path.join(__dirname, "node_modules", "webpack-dev-server", "client", "index?http://localhost:8080");

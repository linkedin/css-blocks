import { NodeJsImporter } from "./NodeJsImporter";

export * from "./types";
export * from "./NodeJsImporter";
export * from "./PathAliasImporter";

/**
 * Default importer. Returns `ImportedFile` from disk
 */
export const defaultImporter = new NodeJsImporter();

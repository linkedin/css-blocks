import { FilesystemImporter } from "./FilesystemImporter";

export * from "./types";
export * from "./PathBasedImporter";
export * from "./FilesystemImporter";
export * from "./PathAliasImporter";

/**
 * Default importer. Returns `ImportedFile` from disk
 */
export const filesystemImporter = new FilesystemImporter();

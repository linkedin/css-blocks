import { NodeJsImporter } from "./NodeJsImporter";

export { BaseImporter } from "./BaseImporter";
export {
  ImporterData,
  FileIdentifier,
  ImportedFile,
  ImportedCompiledCssFile,
  ImportedCompiledCssFileContents,
  Importer,
} from "./Importer";
export { NodeJsImporter } from "./NodeJsImporter";

/**
 * Default importer. Returns `ImportedFile` from disk
 */
export const defaultImporter = new NodeJsImporter();

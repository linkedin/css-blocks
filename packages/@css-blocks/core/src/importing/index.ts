import { NodeJsImporter } from "./NodeJsImporter";

export {
  ImporterData,
  FileIdentifier,
  ImportedFile,
  ImportedBlockFile,
  ImportedCompiledCssFile,
  ImportedCompiledCssFileContents,
  Importer,
} from "./Importer";
export { NodeJsImporter } from "./NodeJsImporter";

/**
 * Default importer. Returns `ImportedFile` from disk
 */
export const defaultImporter = new NodeJsImporter();

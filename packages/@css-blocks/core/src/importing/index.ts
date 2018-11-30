import { NodeJsImporter } from "./NodeJsImporter";

export {
  ImporterData,
  FileIdentifier,
  ImportedFile,
  Importer,
} from "./Importer";
export { NodeJsImporter } from "./NodeJsImporter";

/**
 * Default importer. Returns `ImportedFile` from disk
 */
export const defaultImporter = new NodeJsImporter();

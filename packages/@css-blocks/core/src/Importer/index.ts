import { NodeJsImporter } from "./NodeJsImporter";

export {
  ImporterData,
  FileIdentifier,
  ImportedFile,
  Importer,
  Syntax,
  syntaxName,
} from "./Importer";

export { NodeJsImporter } from "./NodeJsImporter";
export { MockImporter } from "./MockImporter";

/**
 * Default importer. Returns `ImportedFile` from disk
 */
export const defaultImporter = new NodeJsImporter();

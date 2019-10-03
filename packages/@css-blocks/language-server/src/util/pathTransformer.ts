import { URI } from "vscode-uri";

import { PathTransformer } from "../pathTransformers/PathTransformer";

import { isBlockFile } from "./blockUtils";
import { isTemplateFile } from "./hbsUtils";

interface TransformedPaths {
  templateFsPath?: string;
  templateUri?: string;
  blockFsPath?: string;
  blockUri?: string;
}

/**
 * Given a uri, return a map of corresponding block and template file system
 * and uri paths.
 */
export function transformPathsFromUri(uri: string, transformer: PathTransformer): TransformedPaths {
  let fsPath;

  try {
    fsPath = URI.parse(uri).fsPath;
  } catch (e) {
    return {};
  }

  if (isTemplateFile(uri)) {
    return {
      blockFsPath: transformer.templateToBlock(fsPath),
      blockUri: URI.file(transformer.templateToBlock(fsPath)).toString(),
      templateFsPath: fsPath,
      templateUri: uri,
    };
  }

  if (isBlockFile(uri)) {
    return {
      blockFsPath: fsPath,
      blockUri: uri,
      templateFsPath: transformer.blockToTemplate(fsPath),
      templateUri: URI.file(transformer.blockToTemplate(fsPath)).toString(),
    };
  }

  return {};
}

import { Configuration } from "@css-blocks/core";
import { URI } from "vscode-uri";

import { PathTransformer } from "../pathTransformers/PathTransformer";

import { isBlockFile } from "./blockUtils";
import { isTemplateFile } from "./hbsUtils";

interface TransformedPaths {
  templateFsPath?: string | null;
  templateUri?: string | null;
  blockFsPath?: string | null;
  blockUri?: string | null;
}

/**
 * Given a uri, return a map of corresponding block and template file system
 * and uri paths.
 */
export function transformPathsFromUri(uri: string, transformer: PathTransformer, config: Readonly<Configuration>): TransformedPaths {
  let fsPath;

  try {
    fsPath = URI.parse(uri).fsPath;
  } catch (e) {
    return {};
  }

  if (isTemplateFile(uri)) {
    let blockFsPath = transformer.templateToBlock(fsPath);
    return {
      blockFsPath,
      blockUri: blockFsPath && URI.file(blockFsPath).toString(),
      templateFsPath: fsPath,
      templateUri: uri,
    };
  }

  if (isBlockFile(uri, config)) {
    let templateFsPath = transformer.blockToTemplate(fsPath);
    return {
      blockFsPath: fsPath,
      blockUri: uri,
      templateFsPath,
      templateUri: templateFsPath && URI.file(templateFsPath).toString(),
    };
  }

  return {};
}

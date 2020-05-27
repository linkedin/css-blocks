import { ImportedCompiledCssFile } from "../importing";
import { CssBlockError } from "../errors";

/**
 * A regex to find the block-syntax-version annotation in a definition file.
 */
const REGEXP_BLOCK_SYNTAX_VERSION = /^@block-syntax-version (\d+);/;

/**
 * The earliest block-syntax-version supported by CSS Blocks. If this has been
 * bumped past version 1, that means there's a breaking change in a later version
 * of CSS Blocks that can't be automatically updated.
 */
const MIN_SUPPORTED_VERSION = 1;

/**
 * The latest block-syntax-version supported by CSS Blocks. Anytime a patch method
 * is introduced to transform older definition files automatically, bump this number.
 * If a version later than this is found in a definition file, that means it was compiled
 * by a later version of CSS Blocks and we can't reason about it.
 */
const MAX_SUPPORTED_VERSION = 1;

/**
 * Given a Compiled CSS file, determine the block-syntax-version for the
 * definition file.
 * @param file - The Compiled CSS file to look up the version number from.
 * @returns The version number found in the definition file.
 */
export function determineBlockSyntaxVersion(file: ImportedCompiledCssFile): number {
  const dfnId = file.definitionIdentifier;
  const dfnContents = file.definitionContents;
  const versionLookupResult = dfnContents.match(REGEXP_BLOCK_SYNTAX_VERSION);

  if (!versionLookupResult) {
    throw new CssBlockError("Unable to process definition file because the file is missing a block-syntax-version declaration.", {
      filename: dfnId
    });
  }

  try {
    const version = parseInt(versionLookupResult[1], 10);
    return version;
  } catch {
    throw new CssBlockError("Unable to process definition file because the declared block-syntax version isn't a number.", {
      filename: dfnId
    });
  }
}

/**
 * Updates the definition data in a Compiled CSS file to use the current
 * block-syntax-version supported by this version of CSS Blocks. We attempt
 * to make these transformations automatically; however, there are three
 * scenarios we will have to throw an error on if they occur...
 *
 * 1. We can't find the block-syntax-version or parse it into a number.
 * 2. The version is greater than the block-syntax-version supported in
 *    this version of CSS Blocks. (This implies that a later version of
 *    CSS Blocks compiled this file and bumping CSS Blocks may resolve
 *    the issue.)
 * 3. The version is less than the earliest block-syntax-version supported
 *    in this version of CSS Blocks. (This means that a much earlier version
 *    of CSS Blocks compiled the file using some syntax that can't be
 *    automatically upgraded.)
 *
 * @param file - The Compiled CSS file to update.
 * @returns The ImportedCompiledCSSFile with the transformed definition file contents.
 */
export function upgradeDefinitionFileSyntax(file: ImportedCompiledCssFile): ImportedCompiledCssFile {
  const version = determineBlockSyntaxVersion(file);

  if (version > MAX_SUPPORTED_VERSION) {
    throw new CssBlockError("Unable to process definition file because the syntax version of the definition file is greater than supported by CSS Blocks. You can fix this issue by upgrading CSS Blocks to the latest version.", {
      filename: file.definitionIdentifier
    });
  }
  if (version < MIN_SUPPORTED_VERSION) {
    throw new CssBlockError("Unable to process definition file because the syntax of the definition can't be automatically upgraded to the latest version supported by CSS Blocks. You may be able to fix this issue by upgrading the dependency or origin file this definition file was generated from. Otherwise, you'll need to use an earlier version of CSS Blocks.", {
      filename: file.definitionIdentifier
    });
  }

  // NOTE: If we had to upgrade the syntax version of a definition file, here's where'd we do that.
  //       But this isn't a thing we need to do until we have multiple syntax versions.

  // NOTE: This should be a new ImportedCompiledCssFile that has the definitionContents upgraded to
  //       the current supported version, but, again, we haven't upgraded anything yet.
  //       So, for now, just echo back the file.
  return file;
}
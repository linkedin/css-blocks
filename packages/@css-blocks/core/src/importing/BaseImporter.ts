import { Syntax } from "../BlockParser";
import { ResolvedConfiguration } from "../configuration";
import { REGEXP_COMMENT_DEFINITION_REF, REGEXP_COMMENT_FOOTER, REGEXP_COMMENT_HEADER } from "../PrecompiledDefinitions/compiled-comments";

import { FileIdentifier, ImportedCompiledCssFile, ImportedCompiledCssFileContents, ImportedFile, Importer } from "./Importer";

/**
 * The BaseImporter is an abstract class that Importer implementations may extend from.
 * This follows the Importer interface that must be used for interacting with the BlockFactory.
 * We also include additional utility methods that are useful for handling CSS Blocks,
 * Compiled CSS, and Definition Files.
 */
export abstract class BaseImporter implements Importer {
  /**
   * Compute a unique identifier for a given import path. If `fromIdentifier` is provided,
   * the importPath can be relative to the file that is identified by it.
   */
  abstract identifier(fromIdentifier: FileIdentifier | null, importPath: string, config: ResolvedConfiguration): FileIdentifier;
  /**
   * Import the file with the given metadata and return a string and meta data for it.
   */
  abstract import(identifier: FileIdentifier, config: ResolvedConfiguration): Promise<ImportedFile | ImportedCompiledCssFile>;
  /**
   * The default name of the block used unless the block specifies one itself.
   */
  abstract defaultName(identifier: FileIdentifier, configuration: ResolvedConfiguration): string;
  /**
   * If a file identifier has an on-disk representation, return an absolute path to it.
   */
  abstract filesystemPath(identifier: FileIdentifier, config: ResolvedConfiguration): string | null;
  /**
   * Returns a string meant for human consumption that identifies the file.
   * As is used in debug statements and error reporting. Unlike filesystemPath,
   * this needn't resolve to an actual file or be an absolute path.
   */
  abstract debugIdentifier(identifier: FileIdentifier, config: ResolvedConfiguration): string;
  /**
   * Returns the syntax the contents are written in.
   */
  abstract syntax(identifier: FileIdentifier, config: ResolvedConfiguration): Syntax;

  /**
   * Determines if given file contents is a compiled CSS Blocks file.
   * We determine this by looking for special auto-generated CSS Blocks
   * comments in the file. We don't validate at this point that the data
   * included in these comments is valid.
   *
   * @param contents - A string of the imported file contents to check.
   * @returns True if this represents previously-compiled CSS, false otheerwise.
   */
  protected isCompiledBlockCSS(contents: string): boolean {
    return REGEXP_COMMENT_HEADER.test(contents) &&
           REGEXP_COMMENT_DEFINITION_REF.test(contents) &&
           REGEXP_COMMENT_FOOTER.test(contents);
  }

  /**
   * Break apart a compiled CSS file that was previously generated from a block file
   * into segments, based on the CSS Blocks comments that are present. If given a file
   * that's missing expected auto-generated CSS Blocks comments, this will error.
   * You should call isCompiledBlockCSS() first to determine if the file should be
   * processed as a compiled CSS Block file.
   *
   * @param contents - A string of the imported file contents to check.
   * @returns The segmented information from the compiled CSS file.
   */
  protected segmentizeCompiledBlockCSS(contents: string): ImportedCompiledCssFileContents {
    // Use our regexps to find the start and end of the compiled content in the CSS file.
    const headerRegexpResult = contents.match(REGEXP_COMMENT_HEADER);
    const footerRegexpResult = contents.match(REGEXP_COMMENT_FOOTER);
    if (!headerRegexpResult || !footerRegexpResult) {
      throw new Error("Unable to parse compiled CSS file into segments. Expected comments are missing.");
    }

    // Determine start/end indexes based on the regexp results above.
    const [headerFullMatch, blockId] = headerRegexpResult;
    const headerStartIndex = headerRegexpResult.index;
    if (typeof headerStartIndex === "undefined") {
      throw new Error("Unable to determine start location of regexp result.");
    }
    const headerEndIndex = headerStartIndex + headerFullMatch.length;
    const [footerFullMatch] = footerRegexpResult;
    const footerStartIndex = footerRegexpResult.index;
    if (typeof footerStartIndex === "undefined") {
      throw new Error("Unable to determine start location of regexp result.");
    }
    const footerEndIndex = footerStartIndex + footerFullMatch.length;

    if (headerStartIndex > footerStartIndex) {
      throw new Error("Header must exist before footer in imported content.");
    }

    // Break the file into segments.
    const pre = contents.slice(0, headerStartIndex);
    const post = contents.slice(footerEndIndex);
    const fullBlockContents = contents.slice(headerEndIndex, footerStartIndex);

    // Parse out the URL, or embedded data, for the block definition.
    // The definition comment should be removed from the block's CSS contents.
    const definitionRegexpResult = fullBlockContents.match(REGEXP_COMMENT_DEFINITION_REF);
    if (definitionRegexpResult === null) {
      throw new Error("Unable to find definition URL in compiled CSS. This comment must be declared between the header and footer CSS Blocks comments.");
    }
    const [definitionFullMatch, definitionUrl] = definitionRegexpResult;
    const blockCssContents = fullBlockContents.replace(definitionFullMatch, "");

    return {
      pre,
      blockId,
      blockCssContents,
      definitionUrl,
      post,
      raw: contents,
    };
  }
}

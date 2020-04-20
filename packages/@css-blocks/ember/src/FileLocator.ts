export interface FileLocator {
  /**
   * @returns all relative paths to templates that might be using CSS Blocks.
   */
  possibleTemplatePaths(): Array<string>;

  /**
   * @returns all possible relative paths where a css blocks file for a given template might be located.
   */
  possibleStylesheetPathsForTemplate(relativePathToTemplate: string, extensions: Array<string>): Array<string>;

  /**
   * @returns a relative path to a css blocks' stylesheet for the template or
   * null if none is found.
   */
  findStylesheetForTemplate(relativePathToTemplate: string, extensions: Array<string>): string | null;

  /**
   * @returns a block identifier that the block factory knows how to import.
   */
  blockIdentifier(relativePathToStylesheet: string): string;
}

import { ResolvedCSSBlocksEmberOptions } from "@css-blocks/ember-utils";

import { AddonEnvironment } from "./interfaces";

/**
 * Filepath for list of optimized styles in preprocess tree.
 */
export const optimizedStylesPreprocessFilepath = "app/styles/css-blocks-stylelist.json";

/**
 * Filepath for list of optimized styles in postprocess tree.
 */
export const optimizedStylesPostprocessFilepath = "assets/css-blocks-stylelist.json";

/**
 * Generate the output path for the compiled CSS Blocks content, using the
 * preferred filename given by the user. If none is given, the default
 * path is "app/styles/css-blocks.css".
 * @param options - The options passed to the Ember plugin.
 * @returns - The path for the CSS Blocks compiled content.
 */
export function cssBlocksPreprocessFilename(options: ResolvedCSSBlocksEmberOptions) {
  return `app/styles/${options.output}`;
}

/**
 * Get the path to the compiled css blocks file in the postprocess tree.
 * @param env - The current resolved addon configuration.
 * @returns - Filepath in postprocess tree.
 */
export function cssBlocksPostprocessFilename(config: ResolvedCSSBlocksEmberOptions) {
  return `assets/${config.output}`;
}

/**
 * Get the path to the compiled app css file in the postprocess tree.
 * @param env - The current addon environment information
 * @returns - Filepath in postprocess tree.
 */
export function appStylesPostprocessFilename(env: AddonEnvironment) {
  return `assets/${env.modulePrefix}.css`;
}

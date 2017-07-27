import * as postcss from "postcss";
import * as inlineSourceMapComment from 'inline-source-map-comment';
import {
  CssBlockOptionsReadonly
} from "./options";
import {
  RawSourceMap
} from "source-map";

declare module "./options" {
  export interface CssBlockOptions {
    /**
     * A preprocessor function can be declared by syntax.
     *
     * If a preprocessor function is declared for `css`, all blocks will be ran through it, even those that were preprocessed for another syntax.
     * this can be disabled by setting `disablePreprocessChaining` to true.
     */
    preprocessors: Preprocessors;
    disablePreprocessChaining: boolean;
  }
}

export enum Syntax {
  sass = "sass",
  scss = "scss",
  css = "css",
  less = "less",
  stylus = "styl",
  other = "other"
}

export function syntaxName(syntax: Syntax): string {
  return Object.keys(Syntax).find(s => Syntax[s] === syntax) || "other";
}

export interface ProcessedFile {
    /**
     * The result of processing the file.
     * If processed with postcss, return the Result instead of a string for efficiency.
     */
    content: string | postcss.Result;
    /**
     * If the file was processed during import, a sourcemap should be provided.
     * If a postcss.Result is returned for contents, the sourcemap from that
     * object will be used if this property is not set.
     */
    sourceMap?: RawSourceMap | string;
    /**
     * If the file depends on other files that may change those dependencies should
     * be returned so that builds and caches can be correctly invalidated.
     */
    dependencies?: string[];
}

// export type ContentPreprocessor = (content: string) => Promise<ProcessedFile>;
export type Preprocessor = (fullPath: string, content: string, options: CssBlockOptionsReadonly, sourceMap?: RawSourceMap | string) => Promise<ProcessedFile>;

/**
 * A map of supported syntaxes to the preprocessor function for that syntax.
 * The keys must be one of the members of {Syntax}.
 * @see {Syntax}
 */
export type Preprocessors = {
  [S in Syntax]?: Preprocessor;
};

/**
 * Postcss can only consume source maps if they are inline, this takes a
 * sourcemap from preprocessor output and adds it to the file's contents. This
 * should be called from within a css preprocessor function when an inline
 * sourcemap is needed and is provided for convenience.
 */
export function annotateCssContentWithSourceMap(content: string | postcss.Result, sourceMap: RawSourceMap | string): string {
  let contentStr: string;
  if (typeof content === "string") {
    contentStr = content;
  } else {
    contentStr = content.content.toString();
  }
  if (typeof sourceMap === "string") {
    sourceMap = JSON.parse(sourceMap);
  }
  return contentStr + (contentStr.endsWith('\n') ? '' : '\n') + inlineSourceMapComment(sourceMap, {block: true});
}

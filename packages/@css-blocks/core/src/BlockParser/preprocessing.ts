import * as inlineSourceMapComment from "inline-source-map-comment";
import { postcss } from "opticss";
import * as path from "path";
import {
  RawSourceMap,
} from "source-map";

import {
  Configuration, ResolvedConfiguration,
} from "../configuration";

export enum Syntax {
  sass = "sass",
  scss = "scss",
  css = "css",
  less = "less",
  stylus = "styl",
  other = "other",
}

export function syntaxName(syntax: Syntax): string {
  return Object.keys(Syntax).find(s => Syntax[s] === syntax) || "other";
}

export function syntaxFromExtension(extname: string): Syntax {
  extname = extname.startsWith(".") ? extname.substring(1) : extname;
  if (extname === "styl") {
    return Syntax.stylus;
  } else {
    return Syntax[extname] || Syntax.other;
  }
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
export type Preprocessor<R extends ProcessedFile | null = ProcessedFile> = (fullPath: string, content: string, configuration: ResolvedConfiguration, sourceMap?: RawSourceMap | string) => Promise<R>;
export type PreprocessorSync<R extends ProcessedFile | null = ProcessedFile> = (fullPath: string, content: string, configuration: ResolvedConfiguration, sourceMap?: RawSourceMap | string) => R;
export type OptionalPreprocessor = Preprocessor<ProcessedFile | null>;
export type OptionalPreprocessorSync = PreprocessorSync<ProcessedFile | null>;

/**
 * A map of supported syntaxes to the preprocessor function for that syntax.
 * The keys must be one of the members of {Syntax}.
 * @see {Syntax}
 */
export type Preprocessors = {
  [S in Syntax]?: Preprocessor;
};
export type PreprocessorsSync = {
  [S in Syntax]?: PreprocessorSync;
};

/**
 * Postcss can only consume source maps if they are inline, this takes a
 * sourcemap from preprocessor output and adds it to the file's contents. This
 * should be called from within a css preprocessor function when an inline
 * sourcemap is needed and is provided for convenience.
 */
export function annotateCssContentWithSourceMap(configuration: Configuration, filename: string, content: string | postcss.Result, sourceMap: RawSourceMap | string): string {
  let contentStr: string;
  let sourceMapObj: RawSourceMap;
  if (typeof content === "string") {
    contentStr = content;
  } else {
    contentStr = content.content.toString();
  }
  if (typeof sourceMap === "string") {
    sourceMapObj = JSON.parse(sourceMap);
  } else {
    sourceMapObj = sourceMap;
  }
  // postcss resolves relative paths against the current working directory so we
  // have to resolve them instead against the file itself first.
  sourceMapObj.sources = sourceMapObj.sources.map((src) => path.resolve(configuration.rootDir, path.dirname(filename), src));
  // Remove any existing source map references before adding the inline version.
  contentStr = contentStr.replace(/\/\*# sourceMappingURL=.*\*\/\n?/g, "");
  return contentStr + (contentStr.endsWith("\n") ? "" : "\n") + inlineSourceMapComment(sourceMapObj, {block: true}) + "\n";
}

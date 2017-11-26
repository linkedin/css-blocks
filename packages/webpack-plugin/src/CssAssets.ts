import { Compiler as WebpackCompiler } from "webpack";
import * as path from "path";
import * as  async from "async";
import * as fs from "fs";
import { Source, RawSource, SourceMapSource, ConcatSource } from "webpack-sources";
import { RawSourceMap } from "source-map";
import * as convertSourceMap from "convert-source-map";
import * as debugGenerator from 'debug';

const debug = debugGenerator("css-blocks:webpack:assets");

/**
 * Options for managing CSS assets without javascript imports.
 */
export interface CssAssetsOptions {
    /** Maps css files from a source location to a webpack asset location. */
    cssFiles: {
        [assetPath: string]: string | {
            /** The name of the chunk to which the asset should belong. If omitted, the asset won't belong to a any chunk. */
            chunk: string | undefined;
            /** the source path to the css asset. */
            source: string | string[];
        };
    };
    /**
     * Maps several webpack assets to a new concatenated asset and manages their
     * sourcemaps. The concatenated asset will belong to all the chunks to which
     * the assets belonged.
     */
    concat: {
        [concatAssetPath: string]: string[];
    };
    /**
     * When true, any source maps related to the assets are written out as
     * additional files or inline depending on the value of `inlineSourceMaps`.
     */
    emitSourceMaps: boolean; // defaults to true
    /**
     * Whether source maps should be included in the css file itself. This
     * should only be used in development.
     */
    inlineSourceMaps: boolean; // defaults to false
}

function assetAsSource(contents: string, filename: string): Source {
    let sourcemap: convertSourceMap.SourceMapConverter | undefined;
    if (/sourceMappingURL/.test(contents)) {
        sourcemap = convertSourceMap.fromSource(contents) ||
            convertSourceMap.fromMapFileComment(contents, path.dirname(filename));
    }
    if (sourcemap) {
        let sm: RawSourceMap = sourcemap.toObject();
        contents = convertSourceMap.removeComments(contents);
        contents = convertSourceMap.removeMapFileComments(contents);
        return new SourceMapSource(contents, filename, sm);
    } else {
        return new RawSource(contents);
    }
}
function assetFilesAsSource(filenames: string[], callback: (err: Error | undefined, source?: ConcatSource) => void) {
    let assetSource = new ConcatSource();
    let assetFiles = filenames.slice();
    let eachAssetFile = (err?: Error) => {
        if (err) {
            callback(err);
        } else {
            const nextAssetFile = assetFiles.shift();
            if (nextAssetFile) {
                processAsset(nextAssetFile, eachAssetFile);
            } else {
                callback(undefined, assetSource);
            }
        }
    };
    const firstAssetFile = assetFiles.shift();
    if (firstAssetFile) {
        processAsset(firstAssetFile, eachAssetFile);
    } else {
        callback(new Error("No asset files provided."));
    }
    function processAsset(assetPath: string, assetCallback: (err?: Error) => void) {
        fs.readFile(assetPath, "utf-8", (err, data) => {
            if (err) {
                assetCallback(err);
            } else {
              assetSource.add(assetAsSource(data, assetPath));
              assetCallback();
            }
        });
    }
}

function assetFileAsSource(sourcePath: string, callback: (err: Error | undefined, source?: Source) => void) {
    fs.readFile(sourcePath, "utf-8", (err, contents) => {
        if (err) {
            callback(err);
        } else {
            try {
                callback(undefined, assetAsSource(contents, sourcePath));
            } catch (e) {
                callback(e);
            }
        }
    });
}

export class CssAssets {
  options: CssAssetsOptions;
    constructor(options: Partial<CssAssetsOptions>) {
        let defaultOpts: CssAssetsOptions = { cssFiles: {}, concat: {}, emitSourceMaps: true, inlineSourceMaps: false };
        this.options = Object.assign(defaultOpts, options);
    }

    apply(compiler: WebpackCompiler) {
        // install assets
        // This puts assets into the compilation results but they won't be part of
        // any chunk. the cssFiles option is an object where the keys are
        // the asset to be added into the compilation results. The value
        // can be a path relative to the webpack project root or an absolute path.
        // TODO: get the watcher to watch these files on disk
        // TODO: Use loaders to get these files into the assets -- which may help with the watching.
        compiler.plugin("emit", (compilation, cb) => {
            debug("emitting assets");
            let assetPaths = Object.keys(this.options.cssFiles);
            async.forEach(assetPaths, (assetPath, outputCallback) => {
                let asset = this.options.cssFiles[assetPath];
                let sourcePath: string | string[], chunkName: string | undefined = undefined;
                if (typeof asset === "string" || Array.isArray(asset)) {
                    sourcePath = asset;
                } else {
                    sourcePath = asset.source;
                    chunkName = asset.chunk;
                }
                let chunks: any[] = compilation.chunks;
                let chunk: any | undefined = chunkName && chunks.find(c => c.name === chunkName);
                if (chunkName && !chunk) {
                    throw new Error(`No chunk named ${chunkName} found.`);
                }

                const handleSource = (err: Error | undefined, source?: Source) => {
                    if (err) {
                        outputCallback(err);
                    } else {
                        compilation.assets[assetPath] = source;
                        if (chunk) {
                            chunk.files.push(assetPath);
                        }
                        outputCallback();
                    }
                };
                if (Array.isArray(sourcePath)) {
                    const sourcePaths = sourcePath.map(sourcePath => path.resolve(compiler.options.context, sourcePath));
                    assetFilesAsSource(sourcePaths, handleSource);
                } else {
                    assetFileAsSource(path.resolve(compiler.options.context, sourcePath), handleSource);
                }
            }, cb);
        });
        // Concatenation
        // The concat option is an object where the keys are the
        // concatenated asset path and the value is an array of
        // strings of assets that should be in the asset.
        // TODO: maybe some glob or regex support
        compiler.plugin("emit", (compilation, cb) => {
            debug("concatenating assets");
            if (!this.options.concat) return;
            let concatFiles = Object.keys(this.options.concat);
            concatFiles.forEach((concatFile) => {
                let concatSource = new ConcatSource();
                let inputFiles = this.options.concat[concatFile];
                let missingFiles = inputFiles.filter(f => (!compilation.assets[f]));
                let chunks = new Set<any>();
                if (missingFiles.length === 0) {
                    inputFiles.forEach(inputFile => {
                        let asset = compilation.assets[inputFile];
                        concatSource.add(asset);
                        let chunksWithInputAsset = compilation.chunks.filter((chunk: any) => (<Array<string>>chunk.files).indexOf(inputFile) >= 0);
                        chunksWithInputAsset.forEach((chunk: any) => {
                            chunks.add(chunk);
                            let files: string[] = chunk.files;
                            chunk.files = files.filter(file => file !== inputFile);
                        });
                        delete compilation.assets[inputFile];
                    });
                    compilation.assets[concatFile] = concatSource;
                }
                chunks.forEach(chunk => {
                    chunk.files.push(concatFile);
                });
            });
            cb();
        });
        // sourcemap output for css files
        // Emit all css files with sourcemaps when the `emitSourceMaps` option
        // is set to true (default). By default source maps are generated as a
        // separate file but they can be inline by setting `inlineSourceMaps` to
        // true (false by default)
        compiler.plugin("emit", (compilation, cb) => {
            if (!this.options.emitSourceMaps) {
                debug("not adding sourcemaps");
                cb();
                return;
            }
            debug("adding sourcemaps");
            let assetPaths = Object.keys(compilation.assets).filter(p => /\.css$/.test(p));
            assetPaths.forEach(assetPath => {
                let asset = compilation.assets[assetPath];
                let source, map;
                // sourceAndMap is supposedly more efficient when implemented.
                if (asset.sourceAndMap) {
                    let sourceAndMap = asset.sourceAndMap();
                    source = sourceAndMap.source;
                    map = sourceAndMap.map;
                } else {
                    source = asset.source();
                    if (asset.map) {
                        map = asset.map();
                    }
                }
                if (map) {
                    let comment;
                    if (this.options.inlineSourceMaps) {
                        comment = convertSourceMap.fromObject(map).toComment({ multiline: true });
                    } else {
                        let mapPath = assetPath + ".map";
                        comment = `/*# sourceMappingURL=${path.basename(mapPath)} */`;
                        compilation.assets[mapPath] = new RawSource(JSON.stringify(map));
                    }
                    compilation.assets[assetPath] = new RawSource(source + "\n" + comment);
                }
            });
            cb();
        });
    }
}
import { ObjectDictionary } from "@opticss/util";
import * as  async from "async";
import * as convertSourceMap from "convert-source-map";
import * as debugGenerator from "debug";
import * as fs from "fs";
import { adaptFromLegacySourceMap, adaptToLegacySourceMap, postcss } from "opticss";
import * as path from "path";
import { RawSourceMap } from "source-map";
import { Compiler as WebpackCompiler } from "webpack";
import { ConcatSource, RawSource, Source, SourceMapSource } from "webpack-sources";

import { WebpackAny } from "./Plugin";

// tslint:disable-next-line:prefer-unknown-to-any
export type PostcssAny = any;

const debug = debugGenerator("css-blocks:webpack:assets");

export type PostcssProcessor =
    Array<postcss.Plugin<PostcssAny>>
        | ((assetPath: string) => Array<postcss.Plugin<PostcssAny>>
                                | Promise<Array<postcss.Plugin<PostcssAny>>>);

export type GenericProcessor =
    (source: Source, assetPath: string) => Source | Promise<Source>;

export interface PostcssProcessorOption {
    postcss: PostcssProcessor;
}

export interface GenericProcessorOption {
    processor: GenericProcessor;
}

export type PostProcessorOption = PostcssProcessorOption | GenericProcessorOption | (PostcssProcessorOption & GenericProcessorOption);

function isPostcssProcessor(processor: PostProcessorOption): processor is PostcssProcessorOption {
    return !!(<PostcssProcessorOption>processor).postcss;
}

function isGenericProcessor(processor: PostProcessorOption): processor is GenericProcessorOption {
    return !!(<GenericProcessorOption>processor).processor;
}

export interface CssSourceOptions {
    /**
     * The name of the chunk to which the asset should belong.
     * If omitted, the asset won't belong to a any chunk. */
    chunk: string | undefined;

    /** the source path to the css asset. */
    source: string | string[];

    /**
     * Post-process the concatenated file with the specified postcss plugins.
     */
    // TODO: enable
    // postProcess?: PostProcessorOption;
}
export interface ConcatenationOptions {
    /**
     * A list of assets to be concatenated.
     */
    sources: Array<string>;

    /**
     * When true, the files that are concatenated are left in the build.
     * Defaults to false.
     */
    preserveSourceFiles?: boolean;

    /**
     * Post-process the concatenated file with the specified postcss plugins.
     *
     * If postcss plugins are provided in conjunction with a generic processor
     * the postcss plugins will be ran first.
     */
    postProcess?: PostProcessorOption;
}

/**
 * Options for managing CSS assets without javascript imports.
 */
export interface CssAssetsOptions {
    /** Maps css files from a source location to a webpack asset location. */
    cssFiles: ObjectDictionary<string | CssSourceOptions>;
    /**
     * Maps several webpack assets to a new concatenated asset and manages their
     * sourcemaps. The concatenated asset will belong to all the chunks to which
     * the assets belonged.
     */
    concat: ObjectDictionary<string[] | ConcatenationOptions>;

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

interface SourceAndMap {
    source: string;
    map?: RawSourceMap;
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
                let chunks: WebpackAny[] = compilation.chunks;
                let chunk: WebpackAny | undefined = chunkName && chunks.find(c => c.name === chunkName);
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
                    const sourcePaths = sourcePath.map(sourcePath => path.resolve(compiler.options.context!, sourcePath));
                    assetFilesAsSource(sourcePaths, handleSource);
                } else {
                    assetFileAsSource(path.resolve(compiler.options.context!, sourcePath), handleSource);
                }
            },            cb);
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
            let postProcessResults = new Array<Promise<void>>();
            for (let concatFile of concatFiles) {
                let concatSource = new ConcatSource();
                let concatenation = this.options.concat[concatFile];
                let inputFiles = Array.isArray(concatenation) ? concatenation : concatenation.sources;
                let concatenationOptions = Array.isArray(concatenation) ? {sources: concatenation} : concatenation;
                let missingFiles = inputFiles.filter(f => (!compilation.assets[f]));
                let chunks = new Set<WebpackAny>();
                if (missingFiles.length === 0) {
                    for (let inputFile of inputFiles) {
                        let asset = compilation.assets[inputFile];
                        concatSource.add(asset);
                        let chunksWithInputAsset = compilation.chunks.filter((chunk: WebpackAny) => (<Array<string>>chunk.files).indexOf(inputFile) >= 0);
                        chunksWithInputAsset.forEach((chunk: WebpackAny) => {
                            chunks.add(chunk);
                            let files: string[] = chunk.files;
                            chunk.files = files.filter(file => file !== inputFile);
                        });
                        if (!concatenationOptions.preserveSourceFiles) {
                            delete compilation.assets[inputFile];
                        }
                    }
                    if (concatenationOptions.postProcess) {
                        postProcessResults.push(postProcess(concatenationOptions.postProcess, concatSource, concatFile).then(source => {
                            compilation.assets[concatFile] = source;
                        }));
                    } else {
                        compilation.assets[concatFile] = concatSource;
                    }
                }
                for (let chunk of chunks) {
                    let files: Array<string> = chunk.files;
                    if (files.indexOf(concatFile) >= 0) continue;
                    files.push(concatFile);
                }
            }
            if (postProcessResults.length > 0) {
                Promise.all(postProcessResults).then(() => {
                    cb();
                },                                   error => {
                    cb(error);
                });
            } else {
                cb();
            }
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
                let {source, map} = sourceAndMap(asset);
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
        return new SourceMapSource(contents, filename, adaptToLegacySourceMap(sm));
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

function sourceAndMap(asset: Source): SourceAndMap {
    // sourceAndMap is supposedly more efficient when implemented.
    if (asset.sourceAndMap) {
        let {source, map} = asset.sourceAndMap();
        return {source, map: adaptFromLegacySourceMap(map)};
    } else {
        let source = asset.source();
        let map: RawSourceMap | undefined = undefined;
        if (asset.map) {
            map = asset.map();
        }
        return { source, map };
    }
}

function makePostcssProcessor (
    plugins: PostcssProcessor,
): GenericProcessor {
    return (asset: Source, assetPath: string) => {
        let { source, map } = sourceAndMap(asset);
        let pluginsPromise: Promise<Array<postcss.Plugin<PostcssAny>>>;
        if (typeof plugins === "function") {
            pluginsPromise = Promise.resolve(plugins(assetPath));
        } else {
            if (plugins.length > 0) {
                pluginsPromise = Promise.resolve(plugins);
            } else {
                return Promise.resolve(asset);
            }
        }
        return pluginsPromise.then(plugins => {
            let processor = postcss(plugins);
            let result = processor.process(source, {
                to: assetPath,
                map: { prev: map, inline: false, annotation: false },
            });

            return result.then((result) => {
                return new SourceMapSource(result.css, assetPath, result.map.toJSON(), source, map && adaptToLegacySourceMap(map));
            });
        });
    };
}

function process(processor: GenericProcessor, asset: Source, assetPath: string) {
    return Promise.resolve(processor(asset, assetPath));
}

function postProcess(option: PostProcessorOption, asset: Source, assetPath: string): Promise<Source> {
    let promise: Promise<Source>;
    if (isPostcssProcessor(option)) {
        promise = process(makePostcssProcessor(option.postcss), asset, assetPath);
    } else {
        promise = Promise.resolve(asset);
    }
    if (isGenericProcessor(option)) {
        promise = promise.then(asset => {
            return process(option.processor, asset, assetPath);
        });
    }
    return promise;
}

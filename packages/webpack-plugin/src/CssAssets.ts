import * as webpack from "webpack";
import * as path from "path";
import * as  async from "async";
import * as fs from "fs";
import { Source, RawSource, SourceMapSource, ConcatSource } from "webpack-sources";
import { RawSourceMap } from "source-map";
import convertSourceMap from "convert-source-map";

export interface CssAssetsOptionsWithDefaults {
    cssFiles: {
        [assetPath: string]: string;
    };
    concat: {
        [concatAssetPath: string]: string[]
    };
    emitSourceMaps: boolean; // defaults to true
    inlineSourceMaps: boolean; // defaults to false
}
export interface CssAssetsOptions {
    cssFiles?: {
        [assetPath: string]: string;
    };
    concat?: {
        [concatAssetPath: string]: string[]
    };
    emitSourceMaps: boolean; // defaults to true
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

export class CssAssets {
  options: CssAssetsOptionsWithDefaults;
    constructor(options: CssAssetsOptions) {
        let defaultOpts: CssAssetsOptionsWithDefaults = { cssFiles: {}, concat: {}, emitSourceMaps: true, inlineSourceMaps: false };
        this.options = Object.assign(defaultOpts, options);
    }

    apply(compiler: webpack.Compiler) {
        // install assets
        // This puts assets into the compilation results but they won't be part of
        // any chunk. the cssFiles option is an object where the keys are
        // the asset to be added into the compilation results. The value
        // can be a path relative to the webpack project root or an absolute path.
        // TODO: get the watcher to watch these files on disk
        // TODO: Use loaders to get these files into the assets -- which may help with the watching.
        compiler.plugin("emit", (compilation, cb) => {
            let assetPaths = Object.keys(this.options.cssFiles);
            async.forEach(assetPaths, (assetPath, outputCallback) => {
                let asset = this.options.cssFiles[assetPath];
                if (Array.isArray(asset)) {
                    let concat = new ConcatSource();
                    async.forEach(asset, (a, inputCallback) => {
                        let sourcePath = path.resolve(compiler.options.context, a);
                        fs.readFile(sourcePath, "utf-8", (err, contents) => {
                            if (err) {
                                inputCallback(err);
                            } else {
                                try {
                                    concat.add(assetAsSource(contents, sourcePath));
                                    inputCallback();
                                } catch (e) {
                                    inputCallback(e);
                                }
                            }
                        });
                    }, (err) => {
                        if (err) {
                            outputCallback(err);
                        } else {
                            compilation.assets[assetPath] = concat;
                            outputCallback();
                        }
                    });
                } else {
                    let sourcePath = path.resolve(compiler.options.context, asset);
                    fs.readFile(sourcePath, "utf-8", (err, contents) => {
                        if (err) {
                            outputCallback(err);
                        } else {
                            try {
                                compilation.assets[assetPath] = assetAsSource(contents, sourcePath);
                                outputCallback();
                            } catch (e) {
                                outputCallback(e);
                            }
                        }
                    });
                }
            }, cb);
        });
        // Concatenation
        // The concat option is an object where the keys are the
        // concatenated asset path and the value is an array of
        // strings of assets that should be in the asset.
        // TODO: maybe some glob or regex support
        compiler.plugin("emit", (compilation, cb) => {
            if (!this.options.concat) return;
            let concatFiles = Object.keys(this.options.concat);
            concatFiles.forEach((concatFile) => {
                let concatSource = new ConcatSource();
                let inputFiles = this.options.concat[concatFile];
                let missingFiles = inputFiles.filter(f => (!compilation.assets[f]));
                if (missingFiles.length === 0) {
                    inputFiles.forEach(inputFile => {
                        let asset = compilation.assets[inputFile];
                        concatSource.add(asset);
                        delete compilation.assets[inputFile];
                    });
                    compilation.assets[concatFile] = concatSource;
                }
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
                cb();
                return;
            }
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
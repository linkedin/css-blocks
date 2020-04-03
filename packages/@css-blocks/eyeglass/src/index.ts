import type { OptionalPreprocessor, Preprocessor, ProcessedFile, ResolvedConfiguration } from "@css-blocks/core";
import type { EyeglassOptions, default as Eyeglass } from "eyeglass"; // works, even tho a cjs export. huh.
import type { Result, SassError } from "node-sass";
import type SassImplementation from "node-sass";
import { sep as PATH_SEPARATOR } from "path";

export type Adaptor = (sass: typeof SassImplementation, eyeglass: typeof Eyeglass, options: EyeglassOptions) => Preprocessor;
export type OptionalAdaptor = (sass: typeof SassImplementation, eyeglass: typeof Eyeglass, options: EyeglassOptions) => OptionalPreprocessor;

/**
 * Given a Sass compiler (either dart-sass or node-sass), an Eyeglass
 * constructor, and common eyeglass/sass options. This function returns a
 * preprocessor, which is a function that can be used preprocess a single file.
 *
 * This function ensures that Sass is properly configured using the common
 * options for each file and that source map information is passed along to CSS
 * Blocks for correct error reporting.
 */
export const adaptor: Adaptor = (sass: typeof SassImplementation, eyeglass: typeof Eyeglass, options: EyeglassOptions = {}) => {
    return (file: string, data: string) => {
        return new Promise<ProcessedFile>((resolve, reject) => {
            const sassOptions = Object.assign({}, options, {
                file,
                data,
                sourceMap: true,
                outFile: file.replace(/scss$/, "css"),
            });
            sass.render(eyeglass(sassOptions), (err: SassError, res: Result): void => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        content: res.css.toString(),
                        sourceMap: res.map.toString(),
                        dependencies: res.stats.includedFiles,
                    });
                }
            });
        });
    };
};

/**
 * This is the core interface that adaptAll depends on to use an object (as
 * opposed to an OptionalAdaptor function) to create a preprocessor.
 */
export interface PreprocessorProvider {
    init(sass: typeof SassImplementation, eyeglass: typeof Eyeglass, options: EyeglassOptions): void;
    preprocessor(): Preprocessor | OptionalPreprocessor;
}

/**
 * Type guard to check if an object fulfills the basic interface required by
 * PreprocessorProvider.
 */
function isPreprocessorProvider(obj: unknown): obj is PreprocessorProvider {
    if (typeof obj !== "object" || obj === null) return false;
    let provider = <PreprocessorProvider>obj;
    return typeof provider.init === "function" && typeof provider.preprocessor === "function";
}

/**
 * Provides a preprocessor that only runs on files within a specific directory
 * (or subdirectories of that directory, recursively).
 */
export class DirectoryScopedPreprocessor implements PreprocessorProvider {
    protected filePrefix: string;
    protected scssProcessor: Preprocessor | undefined;

    /**
     * Instantiates the preprocessor provider.
     *
     * In the case where a preprocessor provider is being provided by a an npm
     * package that is being consumed by an application, this instantiation
     * would be performed by the npm package.
     *
     * @param packageDirectory The absolute path to the directory that scopes
     * this preprocessor.
     */
    constructor(packageDirectory: string) {
        this.filePrefix = packageDirectory.endsWith(PATH_SEPARATOR) ? packageDirectory : packageDirectory + PATH_SEPARATOR;
    }

    /**
     * Initializes the sass preprocessor that is used to only compile the files
     * that are in scope. These parameters are provided by the application,
     * usually via adaptAll().
     *
     * If you need to enforce a version constraint on the Sass or Eyeglass
     * implementation being used, you can override this and check sass.info and
     * eyeglass.VERSION.
     */
    init(sass: typeof SassImplementation, eyeglass: typeof Eyeglass, options: EyeglassOptions = {}) {
        this.scssProcessor = adaptor(sass, eyeglass, this.setupOptions(options));
    }

    /**
     * Subclasses can override this to manipulate/override the eyeglass options
     * provided from the application that will be used for compiling this
     * package's block files.
     *
     * Note: If this is being used from a library that is an eyeglass module,
     * The module will be auto-discovered by eyeglass, you don't need to do
     * anything here.
     */
    setupOptions(options: EyeglassOptions): EyeglassOptions {
        return options;
    }

    /**
     * Subclasses can override this to decide whether a file should be processed.
     * By default it just checks that the file is within the directory for this
     * Preprocessor provider.
     */
    shouldProcessFile(file: string) {
        return file.startsWith(this.filePrefix);
    }

    /**
     * Subclasses shouldn't need to override this.
     * @returns the preprocessor expected by adaptAll.
     */
    preprocessor(): OptionalPreprocessor {
        return (file: string, data: string, config: ResolvedConfiguration) => {
            if (!this.scssProcessor) return Promise.reject(new Error("Adaptor was not initialized!"));
            if (this.shouldProcessFile(file)) {
                return this.scssProcessor(file, data, config);
            } else {
                return Promise.resolve(null);
            }
        };
    }
}

/**
 * Creates a unified preprocessor for an application to use when consuming
 * css blocks that have Sass preprocessed.
 *
 * The application provides a list of preprocessor adaptors, as well as the
 * desired versions of sass, eyeglass and common Sass/Eyeglass options for
 * compiling the sass files with eyeglass support.
 */
export function adaptAll(adaptors: Array<OptionalAdaptor | PreprocessorProvider>, sass: typeof SassImplementation, eyeglass: typeof Eyeglass, options: EyeglassOptions): Preprocessor {
    let processors = adaptors.map(adaptor => {
        if (isPreprocessorProvider(adaptor)) {
            adaptor.init(sass, eyeglass, options);
            return adaptor.preprocessor();
        } else {
            return adaptor(sass, eyeglass, options);
        }
    });
    let lastResortProcessor = adaptor(sass, eyeglass, options);
    return async (file: string, data: string, config: ResolvedConfiguration) => {
        for (let processor of processors) {
            let result = await processor(file, data, config);
            if (result) {
                return result;
            }
        }
        return lastResortProcessor(file, data, config);
    };
}

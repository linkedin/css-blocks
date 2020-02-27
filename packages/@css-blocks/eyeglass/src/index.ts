import { ProcessedFile } from "@css-blocks/core";
import Eyeglass from "eyeglass"; // works, even tho a cjs export. huh.
import { Options, Result, SassError } from "node-sass";
import SassImplementation from "node-sass";

export function adaptor(sass: typeof SassImplementation, eyeglass: typeof Eyeglass, options: Options = {}) {
    return (file: string, data: string) => {
        return new Promise<ProcessedFile>((resolve, reject) => {
            const sassOptions = Object.assign(options, {
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
  }

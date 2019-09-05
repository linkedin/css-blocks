import { Preprocessors } from "@css-blocks/core";
import sass = require("node-sass");

const scss: Preprocessors["scss"] = async (fullPath, content, _configuration, _sourceMap) => {
  return new Promise((resolve, reject) => {
    sass.render(
      {
        file: fullPath,
        outFile: fullPath.replace("scss", "css"),
        data: content,
        sourceMap: true,
        sourceMapContents: true,
        outputStyle: "expanded",
        indentedSyntax: false,
      },
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          let resolvedFile = {
            content: result.css.toString(),
            sourceMap: result.map.toString(),
            dependencies: result.stats.includedFiles,
          };
          resolve(resolvedFile);
        }
      },
    );
  });
};
const preprocessors: Preprocessors = { scss };

module.exports = preprocessors;

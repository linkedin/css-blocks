const sass = require("node-sass");

module.exports = {
  preprocessors: {
    scss(fullPath, content, _configuration, _sourceMap) {
      return new Promise((resolve, reject) => {
        sass.render(
          {
            file: fullPath,
            outFile: fullPath.replace(/\.scss$/, ".css"),
            data: content,
            sourceMap: true,
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
    }
  }
};

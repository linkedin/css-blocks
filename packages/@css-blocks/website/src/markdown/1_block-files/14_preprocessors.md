---
name: Preprocessors
title: Block Preprocessors
---

Although CSS Blocks attempts to provide a standalone development environment, you may want to additionally integrate CSS Blocks with a CSS preprocessor like [Sass](), [Less](), or [PostCSS]().

Luckily, CSS Blocks allows you to integrate your favorite CSS preprocessor into its build. As mentioned in our [configuration documentation](../configuration), you may supply multiple custom `Preprocessor` function to manage files with a different endings in the `parserOpts` hash.

We use file endings to determine exactly how a file should be processed. By default, CSS Blocks will process all files discovered in your project with a `.block.css` file ending with the regular CSS Blocks build. Using the preprocessor settings you can configure custom file endings that CSS Blocks should look out for, and the function it should use to hammer the file in to a valid CSS Blocks file to process as normal.

```js
const cssBlockOptions = {
  parserOpts: {
    preprocessors: {
      sass: sassPreprocessor,
      less: lessPreprocessor,
      css: cssPreprocessor,
    }
  }
}
```

> **Feature Note**: We currently only allow one preprocessor per file type, so no chaining for the same file ending is allowed. However, if the file output of a preprocessor matches another un-run preprocessor, CSS Blocks will continue to call preprocessors until there are no more matching unless `disablePreprocessChaining` is set to false.

A `Preprocessor` is fairly straightforward: file details in, promise for a valid CSS Blocks file out. The interface for a `Preprocessor` function is as follows:

```typescript

/* An interface representing the result of processing the file. `content` must be a valid CSS Blocks file. */
export interface ProcessedFile {
  /**
   * If processed with postcss, return the `postcss.Result instead of a string for efficiency.
   * Otherwise, return a string representing the file contents
   */
  content: string | postcss.Result;
  /**
   * If the file was processed during import, a sourcemap should be provided.
   * If a postcss.Result is returned for `content`, the sourcemap from that
   * object will be used if this property is not set.
   */
  sourceMap?: RawSourceMap | string;
  /**
   * If the file depends on other files that may change those dependencies should
   * be returned so that builds and caches can be correctly invalidated.
   */
  dependencies?: string[];
}


export type Preprocessor = (
  /* Fully resolved file path to the file */
  fullPath: string,
  /* Current contents of the file */
  content: string,
  /* Your CSS Blocks configuration object with all defaults filled in */
  configuration: ResolvedConfiguration,
  /* SourceMap, if applicable */
  sourceMap?: RawSourceMap | string
) => Promise<ProcessedFile>;

```

Now, putting it all together, the following code will enable `.block.scss` files in your project and will preprocess them with `node-sass`:

```js
const sass = require('node-sass');

function scssPreprocessor(file, data, cssBlocksCofig, sourceMap) {
  return new Promise((resolve, reject) => {
    const sassOptions = {
      file,
      data,
      outputStyle: 'expanded',
      sourceMap: true,
      outFile: file,
    };
    sass.render({}, (err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          content: res.css.toString(),
          sourceMap: res.map.toString(),
          dependencies: [],
        });
      }
    });
  });
}

const options = {
  parserOpts: {
    preprocessors: {
      scss: scssPreprocessor,
    },
  },
};
```


# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.24.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v0.23.2...v0.24.0) (2019-09-16)


### Features

* Display block import references in error output. ([190993f](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/190993f)), closes [#248](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/issues/248)
* Display selector error locations using sourcemaps. ([78756f2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/78756f2))
* Track ranges instead of only the start position for errors. ([f7f2dfb](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/f7f2dfb))
* Use sourcemaps for errors involving non-selector nodes. ([f7b53fd](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/f7b53fd))
* **cli:** Display error in context with the source file's contents. ([2317880](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/2317880))





<a name="0.23.0"></a>
# [0.23.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v0.22.0...v0.23.0) (2019-05-08)


### Bug Fixes

* Don't set default rootDir at time of import. ([f1821fd](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/f1821fd))
* Silence postcss warning message. ([adb7d68](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/adb7d68))





<a name="0.22.0"></a>
# [0.22.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v0.21.0...v0.22.0) (2019-05-02)


### Bug Fixes

* Handle legacy type definition for sourcemap's RawSourceMap. ([842454a](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/842454a))
* Over-zealous conflicts from inherited in-stylesheet compositions. ([c70ed03](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/c70ed03))
* Print an empty string if the source location isn't available. ([598477f](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/598477f))
* Remove code branch that always returned false. ([df66b13](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/df66b13))





<a name="0.21.0"></a>
# [0.21.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v0.20.0...v0.21.0) (2019-04-07)


### Bug Fixes

* Properly output conflict resolutions for shorthands. ([#238](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/issues/238)) ([2f93f99](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/2f93f99))


### Features

* In-Stylesheet Block Composition ([#229](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/issues/229)) ([da10830](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/da10830))





<a name="0.20.0"></a>
# [0.20.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v0.20.0-beta.8...v0.20.0) (2019-03-11)

**Note:** Version bump only for package @css-blocks/core





<a name="0.20.0-beta.7"></a>
# [0.20.0-beta.7](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v0.20.0-beta.5...v0.20.0-beta.7) (2019-02-01)

**Note:** Version bump only for package @css-blocks/core





<a name="0.20.0-beta.6"></a>
# [0.20.0-beta.6](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v0.20.0-beta.5...v0.20.0-beta.6) (2019-02-01)

**Note:** Version bump only for package @css-blocks/core





<a name="0.20.0-beta.5"></a>
# [0.20.0-beta.5](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v0.20.0-beta.4...v0.20.0-beta.5) (2019-01-08)


### Bug Fixes

* **core:** Dont gitignore node_modules importer test fixtures. ([fc508eb](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/fc508eb))
* **core:** Remove stray console.log. Add debug logs. ([84d5419](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/84d5419))
* Improve Block ref parser. ([90bfbff](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/90bfbff))


### Features

* Extended [@block](https://github.com/block) syntax. Issue [#192](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/issues/192). ([9cbb4ea](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/9cbb4ea))
* **core:** Default and custom 'main' module block resolution. ([d8585ee](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/d8585ee))
* **core:** Simple fully-qualified path node_modules Block imports. ([7eb9005](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/7eb9005))





<a name="0.20.0-beta.4"></a>
# [0.20.0-beta.4](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.3...v0.20.0-beta.4) (2018-10-19)


### Features

* Manually throw error for Node 6 in Analyzer. ([5788fcc](https://github.com/linkedin/css-blocks/commit/5788fcc))





<a name="0.20.0-beta.3"></a>
# [0.20.0-beta.3](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.2...v0.20.0-beta.3) (2018-10-01)


### Features

* Ember CLI addon Preprocessor support. ([574483d](https://github.com/linkedin/css-blocks/commit/574483d))





<a name="0.20.0-beta.0"></a>
# [0.20.0-beta.0](https://github.com/linkedin/css-blocks/compare/v0.19.0...v0.20.0-beta.0) (2018-08-20)


### Features

* **ember-cli:** Ember cli classic ([#185](https://github.com/linkedin/css-blocks/issues/185)). ([865267c](https://github.com/linkedin/css-blocks/commit/865267c))





<a name="0.19.0"></a>
# [0.19.0](https://github.com/linkedin/css-blocks/compare/v0.18.0...v0.19.0) (2018-04-25)

**Note:** Version bump only for package @css-blocks/core





<a name="0.18.0"></a>
# [0.18.0](https://github.com/linkedin/css-blocks/compare/0.15.1...0.18.0) (2018-04-24)


### Bug Fixes

* Update global states to use simplified parser utils. ([b953602](https://github.com/linkedin/css-blocks/commit/b953602))


### Features

* Added css-blocks.com website package and custom docs theme. ([b5ad979](https://github.com/linkedin/css-blocks/commit/b5ad979))
* Block Object asSource methods take optional Block scope. ([370dfd1](https://github.com/linkedin/css-blocks/commit/370dfd1))
* Enable root-level typedoc generation for the project. ([557fd49](https://github.com/linkedin/css-blocks/commit/557fd49))
* Enable root-level typedoc generation for the project. ([59c85a3](https://github.com/linkedin/css-blocks/commit/59c85a3))
* Require the :scope pseudo for root states. ([1e48882](https://github.com/linkedin/css-blocks/commit/1e48882))





<a name="0.17.0"></a>
# [0.17.0](https://github.com/linkedin/css-blocks/compare/0.15.1...0.17.0) (2017-12-08)




**Note:** Version bump only for package css-blocks

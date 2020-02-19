# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.6](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2020-02-19)


### Bug Fixes

* Avoid Promise.all() because of possible race conditions. ([61d0e54](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/61d0e548dd13086421c01f7969d82cac0e65cad8))
* More robust importing. ([37dcdfb](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/37dcdfb77c1882743a6f8d50ca716b75c97c7950))
* Only raise MultipleCssBlockErrors if there's more than one. ([96fdd29](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/96fdd29662a233abeb4df57c09b46a5633618f1f))





# [1.0.0-alpha.5](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2020-02-14)


### Bug Fixes

* Capture block parsing errors in the promise. ([35c3991](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/35c39914c505d9a3abd58b67c7ae48a49d87793b))
* Fixing the CLI test failures. ([5ff37a1](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/5ff37a1fadbd360edb2c9fb7d80968e2975f0c9b))
* Getting rid of duplicate assertions. ([a3eee56](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/a3eee567c37b80111635d03e56a47d5b210c2e92))
* Rename parseSync to parseRoot. ([f4c95c4](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/f4c95c4eb459ddf11be5b31a06e5d06cba466f53))


### Features

* Adding a new class of errors - MultipleCssBlockErrors. ([14c1d31](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/14c1d314c1135d7b09ceaa96a87840b8b6e4cb78))
* Convert methods to start recording multiple errors. ([c2a3271](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/c2a3271374eb41e99018013d2777d6b73a5264d9))
* Converting composes block errors. ([5455597](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/5455597125c7f164651e89e57ef99c58369e4fb6))
* Converting export and import blocks to use multple errors. ([6b3e3f7](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/6b3e3f7b0795e898f5600de6dd95e8972d6a70c8))
* Converting to multiple errors for a few more features. ([c9c790e](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/c9c790e93005f7c377a33a0b42aa6ade00313db8))
* Getting rid of more thrown errors. ([29cc368](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/29cc368d20196c9dd31bbeacd0f20d987131a07c))





# [1.0.0-alpha.4](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2019-12-18)


### Bug Fixes

* Conflict Resolutions with Media Queries. ([c189613](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/c1896131eb8844d098a5526d95f68fceb8ba584f)), closes [#372](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/issues/372)





# [1.0.0-alpha.3](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2019-12-11)


### Bug Fixes

* Don't cache block errors in the factory. ([e931e63](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/e931e63cf8b33c448f6f6bfbc0aeafc0451166fd))





# [1.0.0-alpha.1](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v1.0.0-alpha.0...v1.0.0-alpha.1) (2019-12-10)


### Bug Fixes

* Fix dev build performance issue. ([bf9bd06](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/bf9bd069e96bc47fbc6229f60625fe5ebbe82d28)), closes [#357](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/issues/357)
* The API for queue.drain changed in async@3.0. ([cc3da9c](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/cc3da9cac6370d00b3489c88ea8756fe72631e82))





# [1.0.0-alpha.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v0.24.0...v1.0.0-alpha.0) (2019-11-22)


### Bug Fixes

* A state cannot be named 'scope'. ([12a0f32](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/12a0f32))
* Addressing comments from Chris. ([afedab9](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/afedab9))
* Cannot export a block as a reserved namespace identifier. ([e82f636](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/e82f636))
* Don't allow blocks to be imported with a well-known namespace. ([6fc3675](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/6fc3675))
* Fix common misspelling of 'cannot'. ([457e08c](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/457e08c))
* Fixing a few lint errors after a rebase. ([4a05b40](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/4a05b40))
* Fixing tests. ([7d368cc](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/7d368cc))
* For when the block-alias is the same name as a generated className. ([bd36033](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/bd36033))
* Global states can be combined with the :scope selector. ([92f8093](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/92f8093))
* Making an error message slightly nicer. ([e74d019](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/e74d019))
* Removing an addressed TODO. ([0e763de](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/0e763de))
* Small tweaks around parameter passing. ([5d91c56](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/5d91c56))


### Features

* Adding a custom importer for the language-server. ([d5bd9c3](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/d5bd9c3))
* Introducing the block-alias. ([5517d72](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/5517d72))
* Passing all block aliases as reserved classNames for compilation. ([aea5fcc](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/aea5fcc))
* Per block namespaces. ([b9c4938](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/b9c4938))
* Respect explicit exports for a block interface. ([d37e704](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/d37e704))





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

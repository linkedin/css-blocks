# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.5](https://github.com/linkedin/css-blocks/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2020-02-14)


### Bug Fixes

* Add CLI test case for BEM conversion. ([07ecaf1](https://github.com/linkedin/css-blocks/commit/07ecaf12183656b46b2948b91d29be96abac8e24))
* Add pending test case for scss nesting. ([48396b2](https://github.com/linkedin/css-blocks/commit/48396b2f6e26beb6d7614f061dfe1ef83cf1b81a))
* Address race condition by simplifying main loop for BEM conversion. ([8116c7d](https://github.com/linkedin/css-blocks/commit/8116c7d652d7a4f242ea54329f3d8d9da25c45a8))
* Addressing Chris' comments. ([5df20f9](https://github.com/linkedin/css-blocks/commit/5df20f98c5e3b99273658d0ef99cd22a745769ed))
* Capture block parsing errors in the promise. ([35c3991](https://github.com/linkedin/css-blocks/commit/35c39914c505d9a3abd58b67c7ae48a49d87793b))
* Don't swallow any potential errors from postcss processing. ([7c5c15c](https://github.com/linkedin/css-blocks/commit/7c5c15c20d7fb8726e29695cd643a0d51d02b9e8))
* Fixing the CLI test failures. ([5ff37a1](https://github.com/linkedin/css-blocks/commit/5ff37a1fadbd360edb2c9fb7d80968e2975f0c9b))
* Getting rid of duplicate assertions. ([a3eee56](https://github.com/linkedin/css-blocks/commit/a3eee567c37b80111635d03e56a47d5b210c2e92))
* Incorrect :scope selector and state output. ([a11d572](https://github.com/linkedin/css-blocks/commit/a11d5720095a07dd72896f075d92891ac3c47196))
* Remove support for 'BME' selectors. ([db25c26](https://github.com/linkedin/css-blocks/commit/db25c2612a55a8df666389e3cc7b223261885a2f))
* Removing invalid paths from the package.json. ([#381](https://github.com/linkedin/css-blocks/issues/381)) ([e600514](https://github.com/linkedin/css-blocks/commit/e600514c93cd4c35092862f0461f374779155e60))
* Rename parseSync to parseRoot. ([f4c95c4](https://github.com/linkedin/css-blocks/commit/f4c95c4eb459ddf11be5b31a06e5d06cba466f53))
* update Travis CI badge URL ([8a5a130](https://github.com/linkedin/css-blocks/commit/8a5a130b67dcff5793b746b7a9e4688ec1de1ca6))


### Features

* Add style-of helper for glimmer. ([afcc846](https://github.com/linkedin/css-blocks/commit/afcc8464f3afc67fa2a2bd39f5d129c040f2170b)), closes [#383](https://github.com/linkedin/css-blocks/issues/383)
* Adding a new class of errors - MultipleCssBlockErrors. ([14c1d31](https://github.com/linkedin/css-blocks/commit/14c1d314c1135d7b09ceaa96a87840b8b6e4cb78))
* Convert methods to start recording multiple errors. ([c2a3271](https://github.com/linkedin/css-blocks/commit/c2a3271374eb41e99018013d2777d6b73a5264d9))
* Converting composes block errors. ([5455597](https://github.com/linkedin/css-blocks/commit/5455597125c7f164651e89e57ef99c58369e4fb6))
* Converting export and import blocks to use multple errors. ([6b3e3f7](https://github.com/linkedin/css-blocks/commit/6b3e3f7b0795e898f5600de6dd95e8972d6a70c8))
* Converting to multiple errors for a few more features. ([c9c790e](https://github.com/linkedin/css-blocks/commit/c9c790e93005f7c377a33a0b42aa6ade00313db8))
* Creating a new package for bem to css-blocks conversion. ([d62b204](https://github.com/linkedin/css-blocks/commit/d62b2042423d822c3b09526b145a354c4d7e6bd2))
* Getting rid of more thrown errors. ([29cc368](https://github.com/linkedin/css-blocks/commit/29cc368d20196c9dd31bbeacd0f20d987131a07c))
* Making bem-to-blocks asynchronous. ([5319687](https://github.com/linkedin/css-blocks/commit/5319687ea72c2c90e5236ae7246654d9164433ad))
* Making the CLI interactive using inquirer.js. ([20c1f10](https://github.com/linkedin/css-blocks/commit/20c1f108b0c5c39adb84b821dfe7343e7b148765))
* Pass multiple errors to the language server. ([2bcc249](https://github.com/linkedin/css-blocks/commit/2bcc2494af5814aeb94b3dda794a344a8265c8da))
* Removing common prefixes from states, like, is. ([abdb3b1](https://github.com/linkedin/css-blocks/commit/abdb3b1336751904906a950d61091bef04b4eeec))





# [1.0.0-alpha.4](https://github.com/linkedin/css-blocks/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2019-12-18)


### Bug Fixes

* Conflict Resolutions with Media Queries. ([c189613](https://github.com/linkedin/css-blocks/commit/c1896131eb8844d098a5526d95f68fceb8ba584f)), closes [#372](https://github.com/linkedin/css-blocks/issues/372)
* Dynamic scope attributes were not being analyzed or rewritten. ([488e23e](https://github.com/linkedin/css-blocks/commit/488e23eee2746a962bec27d9356657aa489b2686)), closes [#371](https://github.com/linkedin/css-blocks/issues/371) [#373](https://github.com/linkedin/css-blocks/issues/373)


### Features

* Enable optimization for production builds by default. ([8b2d595](https://github.com/linkedin/css-blocks/commit/8b2d59509cb80b5d107a27eba90b96b81a75ed4c))





# [1.0.0-alpha.3](https://github.com/linkedin/css-blocks/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2019-12-11)


### Bug Fixes

* Don't cache block errors in the factory. ([e931e63](https://github.com/linkedin/css-blocks/commit/e931e63cf8b33c448f6f6bfbc0aeafc0451166fd))
* New release of broccoli-plugin added a conflicting property. ([c090750](https://github.com/linkedin/css-blocks/commit/c090750606e269e7f7afe4332671715117d319ee)), closes [#358](https://github.com/linkedin/css-blocks/issues/358)
* Use the AST builders provided by to the plugin. ([f0d6387](https://github.com/linkedin/css-blocks/commit/f0d6387643d16a59003e43026ba7c0f622665407))





# [1.0.0-alpha.2](https://github.com/linkedin/css-blocks/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2019-12-10)


### Bug Fixes

* A block compilation error would cause the template to be skipped. ([9f6c57d](https://github.com/linkedin/css-blocks/commit/9f6c57d5d775cfce99b7e58fea3554cbc6ee4890))
* Add missing dependency. ([c4dc125](https://github.com/linkedin/css-blocks/commit/c4dc125792ce1fe382005d520276f8b5d355d7c0))
* Handle aggregation filename collision. ([a501bcd](https://github.com/linkedin/css-blocks/commit/a501bcdde8428e15b975e822ebc25cda6f32192d))
* Handle missing block files in glimmer apps. ([4e984d4](https://github.com/linkedin/css-blocks/commit/4e984d4f924906676aac807b9767ad3c2b0a6d35))





# [1.0.0-alpha.1](https://github.com/linkedin/css-blocks/compare/v1.0.0-alpha.0...v1.0.0-alpha.1) (2019-12-10)


### Bug Fixes

* Discover new glimmer components when they are added while watching. ([f3386ac](https://github.com/linkedin/css-blocks/commit/f3386ac1ca2ce13142310f2ad7f7f1b81b3fee4c))
* Fix dev build performance issue. ([bf9bd06](https://github.com/linkedin/css-blocks/commit/bf9bd069e96bc47fbc6229f60625fe5ebbe82d28)), closes [#357](https://github.com/linkedin/css-blocks/issues/357)
* Must invalidate the handlebars template cache across processes. ([2afd213](https://github.com/linkedin/css-blocks/commit/2afd21332d0d0cb30a5203ec1c5a08fd3d746c2f))
* Properly prune unprocessed CSS Block files from build output. ([076973d](https://github.com/linkedin/css-blocks/commit/076973dc8ae1f25dbd94163d03ab1bdd021932c3))
* The API for queue.drain changed in async@3.0. ([cc3da9c](https://github.com/linkedin/css-blocks/commit/cc3da9cac6370d00b3489c88ea8756fe72631e82))
* Work-around because node-sass doesn't run in a vscode context. ([b10f34e](https://github.com/linkedin/css-blocks/commit/b10f34e1fb3c8e1c147de3802fd5e04ede458d1c))


### Features

* Adds find references capability to language server. ([fbef5a8](https://github.com/linkedin/css-blocks/commit/fbef5a89df706f4d422dc23404ba437da34fa27c))
* Load the css-blocks configuration file. ([6dc7397](https://github.com/linkedin/css-blocks/commit/6dc7397102b95a1570015f32424940e27c208d16))





# [1.0.0-alpha.0](https://github.com/LinkedIn/css-blocks/compare/v0.24.0...v1.0.0-alpha.0) (2019-11-22)


### Bug Fixes

* A state cannot be named 'scope'. ([12a0f32](https://github.com/LinkedIn/css-blocks/commit/12a0f32))
* Addressing comments from Chris. ([afedab9](https://github.com/LinkedIn/css-blocks/commit/afedab9))
* Cannot export a block as a reserved namespace identifier. ([e82f636](https://github.com/LinkedIn/css-blocks/commit/e82f636))
* Don't allow blocks to be imported with a well-known namespace. ([6fc3675](https://github.com/LinkedIn/css-blocks/commit/6fc3675))
* Fix bugs introduced by per-block namespaces. ([180b416](https://github.com/LinkedIn/css-blocks/commit/180b416))
* Fix common misspelling of 'cannot'. ([457e08c](https://github.com/LinkedIn/css-blocks/commit/457e08c))
* Fixing a few lint errors after a rebase. ([4a05b40](https://github.com/LinkedIn/css-blocks/commit/4a05b40))
* Fixing tests. ([7d368cc](https://github.com/LinkedIn/css-blocks/commit/7d368cc))
* For when the block-alias is the same name as a generated className. ([bd36033](https://github.com/LinkedIn/css-blocks/commit/bd36033))
* Global states can be combined with the :scope selector. ([92f8093](https://github.com/LinkedIn/css-blocks/commit/92f8093))
* Handle possible fs.stat failure gracefully. ([e1d1c2d](https://github.com/LinkedIn/css-blocks/commit/e1d1c2d))
* Incorrect paths in package.json. ([d5f4c4c](https://github.com/LinkedIn/css-blocks/commit/d5f4c4c))
* Making an error message slightly nicer. ([e74d019](https://github.com/LinkedIn/css-blocks/commit/e74d019))
* Merge conflict was checked in. ([3dcd620](https://github.com/LinkedIn/css-blocks/commit/3dcd620))
* Removing an addressed TODO. ([0e763de](https://github.com/LinkedIn/css-blocks/commit/0e763de))
* Small tweaks around parameter passing. ([5d91c56](https://github.com/LinkedIn/css-blocks/commit/5d91c56))
* Use a more flexible configuration type. ([38fd823](https://github.com/LinkedIn/css-blocks/commit/38fd823))
* Using the export syntax for blocks in tests. ([bc86451](https://github.com/LinkedIn/css-blocks/commit/bc86451))


### Features

* Add document links provider. ([8a940d4](https://github.com/LinkedIn/css-blocks/commit/8a940d4))
* Adding a custom importer for the language-server. ([d5bd9c3](https://github.com/LinkedIn/css-blocks/commit/d5bd9c3))
* Adds custom css data for css-blocks at rules. ([9d230d5](https://github.com/LinkedIn/css-blocks/commit/9d230d5))
* Basic preprocessor support. ([414b32e](https://github.com/LinkedIn/css-blocks/commit/414b32e))
* Basic workings of language server and vscode client. ([ce11443](https://github.com/LinkedIn/css-blocks/commit/ce11443))
* Basic workings of language server and vscode client. ([4c156d1](https://github.com/LinkedIn/css-blocks/commit/4c156d1))
* CLI will use configuration files now. ([9dbfdd9](https://github.com/LinkedIn/css-blocks/commit/9dbfdd9))
* Code completion and definitions for per-block namespace syntax. ([a88ebd5](https://github.com/LinkedIn/css-blocks/commit/a88ebd5))
* Configuration file API for CSS Blocks. ([736f460](https://github.com/LinkedIn/css-blocks/commit/736f460))
* Implement autocomplete for import paths. ([bc0316d](https://github.com/LinkedIn/css-blocks/commit/bc0316d))
* Introducing the block-alias. ([5517d72](https://github.com/LinkedIn/css-blocks/commit/5517d72))
* Load css-blocks configuration from the config file for vscode. ([e564970](https://github.com/LinkedIn/css-blocks/commit/e564970))
* Passing all block aliases as reserved classNames for compilation. ([aea5fcc](https://github.com/LinkedIn/css-blocks/commit/aea5fcc))
* Passing block error validation through the importer. ([a5123fc](https://github.com/LinkedIn/css-blocks/commit/a5123fc))
* Per block namespaces. ([053ed47](https://github.com/LinkedIn/css-blocks/commit/053ed47))
* Per block namespaces. ([b9c4938](https://github.com/LinkedIn/css-blocks/commit/b9c4938))
* Respect explicit exports for a block interface. ([d37e704](https://github.com/LinkedIn/css-blocks/commit/d37e704))
* WIP Migration of vscode integration to per-block namespace syntax. ([146b71d](https://github.com/LinkedIn/css-blocks/commit/146b71d))





# [0.24.0](https://github.com/linkedin/css-blocks/compare/v0.23.2...v0.24.0) (2019-09-16)


### Bug Fixes

* Respect custom Ember module names. ([#303](https://github.com/linkedin/css-blocks/issues/303)) ([8732070](https://github.com/linkedin/css-blocks/commit/8732070))


### Features

* Display block import references in error output. ([190993f](https://github.com/linkedin/css-blocks/commit/190993f)), closes [#248](https://github.com/linkedin/css-blocks/issues/248)
* Display selector error locations using sourcemaps. ([78756f2](https://github.com/linkedin/css-blocks/commit/78756f2))
* Invalidate handlebar template caches when dependent blocks change. ([e3fd6f2](https://github.com/linkedin/css-blocks/commit/e3fd6f2))
* Use sourcemaps for errors involving non-selector nodes. ([f7b53fd](https://github.com/linkedin/css-blocks/commit/f7b53fd))
* **cli:** Display error in context with the source file's contents. ([2317880](https://github.com/linkedin/css-blocks/commit/2317880))
* Track ranges instead of only the start position for errors. ([f7f2dfb](https://github.com/linkedin/css-blocks/commit/f7f2dfb))





<a name="0.23.2"></a>
## [0.23.2](https://github.com/linkedin/css-blocks/compare/v0.23.1...v0.23.2) (2019-06-13)


### Bug Fixes

* **ember-cli:** Detect ember by presece of ember-source. ([28e8811](https://github.com/linkedin/css-blocks/commit/28e8811))


### Features

* Binary runtime helper. ([#255](https://github.com/linkedin/css-blocks/issues/255)) ([959fb8b](https://github.com/linkedin/css-blocks/commit/959fb8b))





<a name="0.23.1"></a>
## [0.23.1](https://github.com/linkedin/css-blocks/compare/v0.23.0...v0.23.1) (2019-05-09)


### Bug Fixes

* Add missin bin script to cli. ([5c5bcf3](https://github.com/linkedin/css-blocks/commit/5c5bcf3))





<a name="0.23.0"></a>
# [0.23.0](https://github.com/linkedin/css-blocks/compare/v0.22.0...v0.23.0) (2019-05-08)


### Bug Fixes

* Declare a bin script. ([272556d](https://github.com/linkedin/css-blocks/commit/272556d))
* Don't set default rootDir at time of import. ([f1821fd](https://github.com/linkedin/css-blocks/commit/f1821fd))
* Silence postcss warning message. ([adb7d68](https://github.com/linkedin/css-blocks/commit/adb7d68))


### Features

* Imports via npm and aliases. ([79fafe8](https://github.com/linkedin/css-blocks/commit/79fafe8))





<a name="0.22.0"></a>
# [0.22.0](https://github.com/linkedin/css-blocks/compare/v0.21.0...v0.22.0) (2019-05-02)


### Bug Fixes

* **webpack:** Compatibility w/ webpack-dev-server. ([8bf936b](https://github.com/linkedin/css-blocks/commit/8bf936b))
* Display the file where the error occurred. ([114dd63](https://github.com/linkedin/css-blocks/commit/114dd63))
* Handle legacy type definition for sourcemap's RawSourceMap. ([842454a](https://github.com/linkedin/css-blocks/commit/842454a))
* Over-zealous conflicts from inherited in-stylesheet compositions. ([c70ed03](https://github.com/linkedin/css-blocks/commit/c70ed03))
* Print an empty string if the source location isn't available. ([598477f](https://github.com/linkedin/css-blocks/commit/598477f))
* Reduce vulnerabilities in packages/[@css-blocks](https://github.com/css-blocks)/website. ([b44f68e](https://github.com/linkedin/css-blocks/commit/b44f68e)), closes [#239](https://github.com/linkedin/css-blocks/issues/239)
* Remove code branch that always returned false. ([df66b13](https://github.com/linkedin/css-blocks/commit/df66b13))


### Features

* Add preprocessor support to the cli. ([4027825](https://github.com/linkedin/css-blocks/commit/4027825))
* Initial implementation of [@css-blocks](https://github.com/css-blocks)/cli. ([8fb561a](https://github.com/linkedin/css-blocks/commit/8fb561a))





<a name="0.21.0"></a>
# [0.21.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.20.0...v0.21.0) (2019-04-07)


### Bug Fixes

* Properly output conflict resolutions for shorthands. ([#238](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/issues/238)) ([2f93f99](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/2f93f99))


### Features

* In-Stylesheet Block Composition ([#229](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/issues/229)) ([da10830](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/da10830))





<a name="0.20.0"></a>
# [0.20.0](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.8...v0.20.0) (2019-03-11)


### Features

* **glimmer:** {{link-to}} integration ([#233](https://github.com/linkedin/css-blocks/issues/233)). ([dc19029](https://github.com/linkedin/css-blocks/commit/dc19029))





<a name="0.20.0-beta.8"></a>
# [0.20.0-beta.8](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.7...v0.20.0-beta.8) (2019-02-26)


### Bug Fixes

* **ember-cli:** Use separate file for CSS staging, merge app.css at end. ([#230](https://github.com/linkedin/css-blocks/issues/230)) ([40a0022](https://github.com/linkedin/css-blocks/commit/40a0022))





<a name="0.20.0-beta.7"></a>
# [0.20.0-beta.7](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.5...v0.20.0-beta.7) (2019-02-01)


### Bug Fixes

* Build AMD glimmer helpers in ES5 for IE11 support. ([213aad8](https://github.com/linkedin/css-blocks/commit/213aad8))
* packages/[@css-blocks](https://github.com/css-blocks)/website/.snyk & packages/[@css-blocks](https://github.com/css-blocks)/website/package.json to reduce vulnerabilities ([#221](https://github.com/linkedin/css-blocks/issues/221)). ([b53f39f](https://github.com/linkedin/css-blocks/commit/b53f39f))
* packages/[@css-blocks](https://github.com/css-blocks)/website/package.json to reduce vulnerabilities ([#225](https://github.com/linkedin/css-blocks/issues/225)). ([31270bd](https://github.com/linkedin/css-blocks/commit/31270bd))





<a name="0.20.0-beta.6"></a>
# [0.20.0-beta.6](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.5...v0.20.0-beta.6) (2019-02-01)


### Bug Fixes

* Build AMD glimmer helpers in ES5 for IE11 support. ([213aad8](https://github.com/linkedin/css-blocks/commit/213aad8))
* packages/[@css-blocks](https://github.com/css-blocks)/website/.snyk & packages/[@css-blocks](https://github.com/css-blocks)/website/package.json to reduce vulnerabilities ([#221](https://github.com/linkedin/css-blocks/issues/221)). ([b53f39f](https://github.com/linkedin/css-blocks/commit/b53f39f))
* packages/[@css-blocks](https://github.com/css-blocks)/website/package.json to reduce vulnerabilities ([#225](https://github.com/linkedin/css-blocks/issues/225)). ([31270bd](https://github.com/linkedin/css-blocks/commit/31270bd))





<a name="0.20.0-beta.5"></a>
# [0.20.0-beta.5](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.4...v0.20.0-beta.5) (2019-01-08)


### Bug Fixes

* Comment out failing node_modules test case breaking build in CI. ([7548289](https://github.com/linkedin/css-blocks/commit/7548289))
* **broccoli:** Rebuild diffs input changes and output patch seperatly. ([5838e53](https://github.com/linkedin/css-blocks/commit/5838e53))
* Deliver both 'visitor' and 'visitors' for Glimmer AST Plugins. ([e7d6fad](https://github.com/linkedin/css-blocks/commit/e7d6fad))
* **core:** Dont gitignore node_modules importer test fixtures. ([fc508eb](https://github.com/linkedin/css-blocks/commit/fc508eb))
* **core:** Remove stray console.log. Add debug logs. ([84d5419](https://github.com/linkedin/css-blocks/commit/84d5419))
* Fixed bold "Future Feature: ..." notes ([#201](https://github.com/linkedin/css-blocks/issues/201)). ([f1259df](https://github.com/linkedin/css-blocks/commit/f1259df))
* Improve Block ref parser. ([90bfbff](https://github.com/linkedin/css-blocks/commit/90bfbff))
* Peg Travis' Node.js 10 version to 10.4.1 for mock-fs support. ([2586ca3](https://github.com/linkedin/css-blocks/commit/2586ca3))
* Remove unsupported Node.js 9.0.0 version from Travis tests. ([241ab31](https://github.com/linkedin/css-blocks/commit/241ab31))
* Use lerna@3.3.0 on Travis to fix early CI build termination. ([16203f4](https://github.com/linkedin/css-blocks/commit/16203f4))
* Use local versions of packages in ember-cli. ([6228eaa](https://github.com/linkedin/css-blocks/commit/6228eaa))


### Features

* Better examples. Work-in-progress. ([b01fc3d](https://github.com/linkedin/css-blocks/commit/b01fc3d))
* Extended [@block](https://github.com/block) syntax. Issue [#192](https://github.com/linkedin/css-blocks/issues/192). ([9cbb4ea](https://github.com/linkedin/css-blocks/commit/9cbb4ea))
* **core:** Default and custom 'main' module block resolution. ([d8585ee](https://github.com/linkedin/css-blocks/commit/d8585ee))
* **core:** Simple fully-qualified path node_modules Block imports. ([7eb9005](https://github.com/linkedin/css-blocks/commit/7eb9005))





<a name="0.20.0-beta.4"></a>
# [0.20.0-beta.4](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.3...v0.20.0-beta.4) (2018-10-19)


### Bug Fixes

* Fixed color values in website homepage's demo ([#205](https://github.com/linkedin/css-blocks/issues/205)). ([7079a53](https://github.com/linkedin/css-blocks/commit/7079a53))


### Features

* Manually throw error for Node 6 in Analyzer. ([5788fcc](https://github.com/linkedin/css-blocks/commit/5788fcc))





<a name="0.20.0-beta.3"></a>
# [0.20.0-beta.3](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.2...v0.20.0-beta.3) (2018-10-01)


### Features

* Ember CLI addon Preprocessor support. ([574483d](https://github.com/linkedin/css-blocks/commit/574483d))





<a name="0.20.0-beta.2"></a>
# [0.20.0-beta.2](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.1...v0.20.0-beta.2) (2018-09-25)


### Bug Fixes

* **broccoli:** Modification of the output does not throw on rebuild. ([57b8137](https://github.com/linkedin/css-blocks/commit/57b8137))





<a name="0.20.0-beta.1"></a>
# [0.20.0-beta.1](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.0...v0.20.0-beta.1) (2018-09-13)


### Bug Fixes

* **broccoli:** Rebuild diffs input changes and output patch seperatly. ([2bb5a2c](https://github.com/linkedin/css-blocks/commit/2bb5a2c))
* Comment out failing node_modules test case breaking build in CI. ([09f1a17](https://github.com/linkedin/css-blocks/commit/09f1a17))
* Peg Travis' Node.js 10 version to 10.4.1 for mock-fs support. ([fbb941c](https://github.com/linkedin/css-blocks/commit/fbb941c))
* Use lerna@3.3.0 on Travis to fix early CI build termination. ([7f32d72](https://github.com/linkedin/css-blocks/commit/7f32d72))
* Use local versions of packages in ember-cli. ([4c75501](https://github.com/linkedin/css-blocks/commit/4c75501))





<a name="0.20.0-beta.0"></a>
# [0.20.0-beta.0](https://github.com/linkedin/css-blocks/compare/v0.19.0...v0.20.0-beta.0) (2018-08-20)


### Bug Fixes

* Allow all types for children to fix tslint error. ([0dbd375](https://github.com/linkedin/css-blocks/commit/0dbd375))
* **jsx:** Better error messages for stray references. ([0d9286a](https://github.com/linkedin/css-blocks/commit/0d9286a)), closes [#170](https://github.com/linkedin/css-blocks/issues/170)
* Fix grammar mistake in website docs. ([#181](https://github.com/linkedin/css-blocks/issues/181)) ([ed4988c](https://github.com/linkedin/css-blocks/commit/ed4988c))
* Flatten entry array because it can be nested. ([4f287e9](https://github.com/linkedin/css-blocks/commit/4f287e9)), closes [#157](https://github.com/linkedin/css-blocks/issues/157) [#153](https://github.com/linkedin/css-blocks/issues/153)
* Remove git conflict markers from .travis.yaml. ([3179998](https://github.com/linkedin/css-blocks/commit/3179998))


### Features

* **broccoli:** Add naive caching strategy for Broccoli. ([#190](https://github.com/linkedin/css-blocks/issues/190)) ([d63626f](https://github.com/linkedin/css-blocks/commit/d63626f))
* **ember-cli:** Ember cli classic ([#185](https://github.com/linkedin/css-blocks/issues/185)). ([865267c](https://github.com/linkedin/css-blocks/commit/865267c))





<a name="0.19.0"></a>
# [0.19.0](https://github.com/linkedin/css-blocks/compare/v0.18.0...v0.19.0) (2018-04-25)


### Bug Fixes

* Fix problems with JSX and Webpack integrations. ([fa2a536](https://github.com/linkedin/css-blocks/commit/fa2a536))
* Keep the filename convention of using *.block.css. ([ac1cf16](https://github.com/linkedin/css-blocks/commit/ac1cf16))
* Remove accidentally committed merge conflict in CONTRIBUTING.md. ([9099678](https://github.com/linkedin/css-blocks/commit/9099678))


### Features

* Support plain string and object syntax for webpack entries. ([9c28ac0](https://github.com/linkedin/css-blocks/commit/9c28ac0))
* Use Babel 7 for JSX parsing to better enable tyed languages. ([97cd2e4](https://github.com/linkedin/css-blocks/commit/97cd2e4))





<a name="0.18.0"></a>
# [0.18.0](https://github.com/linkedin/css-blocks/compare/0.15.1...0.18.0) (2018-04-24)


### Bug Fixes

* Add 'no-duplicate-state-groups' template validator. ([c1bad54](https://github.com/linkedin/css-blocks/commit/c1bad54))
* add missing files into npm package. ([c40f020](https://github.com/linkedin/css-blocks/commit/c40f020))
* Address numerous compilation errors after upgrades. ([29f6658](https://github.com/linkedin/css-blocks/commit/29f6658))
* call seal() on element analyses before using them. ([51d7a09](https://github.com/linkedin/css-blocks/commit/51d7a09))
* Copy objects passed as configuration. ([1d40f17](https://github.com/linkedin/css-blocks/commit/1d40f17))
* Correct the SourceAttributes returned by new State model. ([f03bf06](https://github.com/linkedin/css-blocks/commit/f03bf06))
* Disable buggy stray reference errors for now. ([44a830b](https://github.com/linkedin/css-blocks/commit/44a830b))
* Fix assertion of map. ([37bb96d](https://github.com/linkedin/css-blocks/commit/37bb96d))
* Fix broken test now that getGroups returns everything. ([3656360](https://github.com/linkedin/css-blocks/commit/3656360))
* **css-blocks:** Improve BlockPath parser switch statement ([b0109eb](https://github.com/linkedin/css-blocks/commit/b0109eb))
* handle inheritance in runtime class expressions. ([953b734](https://github.com/linkedin/css-blocks/commit/953b734))
* handle inheritance in runtime class expressions. ([dc501f0](https://github.com/linkedin/css-blocks/commit/dc501f0))
* Make remaining skipped tests pass with optimization. ([26acdc8](https://github.com/linkedin/css-blocks/commit/26acdc8))
* Only enforce a value's presence in a dynamic switch condition if the condition is not disabled due to a missing style dependency. ([13cbd58](https://github.com/linkedin/css-blocks/commit/13cbd58))
* Tagnames are analyzed. ([717fb32](https://github.com/linkedin/css-blocks/commit/717fb32))
* Tagnames are analyzed. ([b505b27](https://github.com/linkedin/css-blocks/commit/b505b27))
* Take inheritance into account during analysis. ([ea06441](https://github.com/linkedin/css-blocks/commit/ea06441))
* The analysis array gets added to while processing it so we have to monitor the array until its length doesn't change. ([eaf068f](https://github.com/linkedin/css-blocks/commit/eaf068f))
* Type lint issues in broccoli-css-blocks. ([97c3272](https://github.com/linkedin/css-blocks/commit/97c3272))
* Typo in scripts (script -> scripts directory). ([d43f7bc](https://github.com/linkedin/css-blocks/commit/d43f7bc))
* Update global states to use simplified parser utils. ([b953602](https://github.com/linkedin/css-blocks/commit/b953602))
* Updated with Chris' feedback. ([b4f4b9f](https://github.com/linkedin/css-blocks/commit/b4f4b9f))
* Updated with Chris' feedback. ([5de751f](https://github.com/linkedin/css-blocks/commit/5de751f))
* **analyzer:** Seal the analysis before using it. ([bdf1580](https://github.com/linkedin/css-blocks/commit/bdf1580))
* **css-blocks:** Fix BlockPath parser to correctly set default block and class values. Improve error message location reporting. Improve error messages for invalid identifiers. ([53c3a66](https://github.com/linkedin/css-blocks/commit/53c3a66))
* **css-blocks:** Fix BlockPath parser to correctly set default block and class values. Improve error message location reporting. Improve error messages for invalid identifiers. ([b427c0a](https://github.com/linkedin/css-blocks/commit/b427c0a))
* **css-blocks:** Improve BlockPath parser switch statement ([eb039a8](https://github.com/linkedin/css-blocks/commit/eb039a8))
* **css-blocks:** Pull in new linting rules from master. ([258970e](https://github.com/linkedin/css-blocks/commit/258970e))
* **css-blocks:** Remove stray console.logs ([b7952d8](https://github.com/linkedin/css-blocks/commit/b7952d8))
* **css-blocks:** Remove stray console.logs ([f16d9f8](https://github.com/linkedin/css-blocks/commit/f16d9f8))
* **css-blocks:** Rename BlockTree node types, clea up exports. ([f8ee8c8](https://github.com/linkedin/css-blocks/commit/f8ee8c8))
* Use TemplateTypes in Analyzer of broccoli-css-blocks. ([a31a6d3](https://github.com/linkedin/css-blocks/commit/a31a6d3))
* **css-blocks:** Updated with more of Chris' comments and use the renamed MultiMap methods ([60c2f43](https://github.com/linkedin/css-blocks/commit/60c2f43))
* **css-blocks:** Updated with more of Chris' comments and use the renamed MultiMap methods ([2f04eb1](https://github.com/linkedin/css-blocks/commit/2f04eb1))
* **jsx:** Protect against already removed nodes in babel transformer ([0bb137d](https://github.com/linkedin/css-blocks/commit/0bb137d))
* **rewriter:** Don't remove nodes that are already removed. ([c3b8ce1](https://github.com/linkedin/css-blocks/commit/c3b8ce1))
* **rewriter:** Get rewriter via a callback instead of through options to avoid serialization. ([ecf623a](https://github.com/linkedin/css-blocks/commit/ecf623a))
* **rewriter:** glimmer requires that subexpressions be helper invocations. ([bae23cb](https://github.com/linkedin/css-blocks/commit/bae23cb))
* **runtime:** the expression must always be read. ([06e3667](https://github.com/linkedin/css-blocks/commit/06e3667))


### Features

* Rename ReadonlyOptions to ResolvedConfiguration. ([9cc7d55](https://github.com/linkedin/css-blocks/commit/9cc7d55))
* **analysis:** Support opticss enabled analysis of css-blocks. ([451b077](https://github.com/linkedin/css-blocks/commit/451b077))
* Add [@css-blocks](https://github.com/css-blocks)/ember-cli and [@css-blocks](https://github.com/css-blocks)/playground packages. ([cb43511](https://github.com/linkedin/css-blocks/commit/cb43511))
* Add footer to website. Improve website responsiveness. ([4e41ec6](https://github.com/linkedin/css-blocks/commit/4e41ec6))
* Add tests for keys in transport object in broccoli-css-blocks. ([bdd7b97](https://github.com/linkedin/css-blocks/commit/bdd7b97))
* Added css-blocks.com website package and custom docs theme. ([b5ad979](https://github.com/linkedin/css-blocks/commit/b5ad979))
* Allow css assets to be processed after concatenation. ([8d5ff5a](https://github.com/linkedin/css-blocks/commit/8d5ff5a))
* Allow styles to be set to className properties for dynamic change to the class attribute. ([5df7a7e](https://github.com/linkedin/css-blocks/commit/5df7a7e))
* Analyzer API updates and package re-naming. ([a60c1a1](https://github.com/linkedin/css-blocks/commit/a60c1a1))
* Analyzer API updates and package re-naming. ([ff8795a](https://github.com/linkedin/css-blocks/commit/ff8795a))
* Block Object asSource methods take optional Block scope. ([370dfd1](https://github.com/linkedin/css-blocks/commit/370dfd1))
* Broccoli plugin for css-blocks. ([6ba4a29](https://github.com/linkedin/css-blocks/commit/6ba4a29))
* Change '.root' selector to ':scope'. ([f19f559](https://github.com/linkedin/css-blocks/commit/f19f559))
* Enable root-level typedoc generation for the project. ([557fd49](https://github.com/linkedin/css-blocks/commit/557fd49))
* Enable root-level typedoc generation for the project. ([59c85a3](https://github.com/linkedin/css-blocks/commit/59c85a3))
* Flesh out broccoli-css-blocks plugin. ([e4a2b4a](https://github.com/linkedin/css-blocks/commit/e4a2b4a))
* Generisize StateGroup and State to Attribute and AttrValue. ([ebfd315](https://github.com/linkedin/css-blocks/commit/ebfd315))
* Initialize tests for broccoli plugin. ([3b3e8f7](https://github.com/linkedin/css-blocks/commit/3b3e8f7))
* Only expose the Analysis interface, not the actual class. ([1b420b5](https://github.com/linkedin/css-blocks/commit/1b420b5))
* Only expose the Analysis interface, not the actual class. ([4be2b43](https://github.com/linkedin/css-blocks/commit/4be2b43))
* Pass CSS Blocks options through Broccoli/Ember-CLI. ([41401b9](https://github.com/linkedin/css-blocks/commit/41401b9))
* Rename normalizeOptions to resolveConfiguration. ([b422631](https://github.com/linkedin/css-blocks/commit/b422631))
* Rename option data to importerData. ([6dc6a36](https://github.com/linkedin/css-blocks/commit/6dc6a36))
* **css-blocks:** Track all declarations of the same type and validate that they have the same values, in the same order, before clearing two Styles as not-in-conflict. ([29d2316](https://github.com/linkedin/css-blocks/commit/29d2316))
* Rename Options to Configuration. ([23acac0](https://github.com/linkedin/css-blocks/commit/23acac0))
* **css-blocks:** Conflict Resolution Validator ([4eb8766](https://github.com/linkedin/css-blocks/commit/4eb8766))
* Rename SparseOptions to Options. ([0a17f60](https://github.com/linkedin/css-blocks/commit/0a17f60))
* Require Analyzers to provide optimizationOptions hash. ([eeaebd3](https://github.com/linkedin/css-blocks/commit/eeaebd3))
* Require Analyzers to provide optimizationOptions hash. ([2e10800](https://github.com/linkedin/css-blocks/commit/2e10800))
* Require the :scope pseudo for root states. ([1e48882](https://github.com/linkedin/css-blocks/commit/1e48882))
* **css-blocks:** Track all declarations of the same type and validate that they have the same values, in the same order, before clearing two Styles as not-in-conflict. ([3404c17](https://github.com/linkedin/css-blocks/commit/3404c17))
* Simplify options. ([137f292](https://github.com/linkedin/css-blocks/commit/137f292))
* **css-blocks:** Conflict Resolution Validator ([7528458](https://github.com/linkedin/css-blocks/commit/7528458))
* The JSX and Webpack plugins use updated Analyzer APIs. ([b8151ce](https://github.com/linkedin/css-blocks/commit/b8151ce))
* The JSX and Webpack plugins use updated Analyzer APIs. ([921ae25](https://github.com/linkedin/css-blocks/commit/921ae25))
* **css-blocks:** Added BlockPath parser ([e3191c8](https://github.com/linkedin/css-blocks/commit/e3191c8))
* **css-blocks:** Added BlockPath parser ([0c1fb73](https://github.com/linkedin/css-blocks/commit/0c1fb73))
* **css-blocks:** Broke up Block.ts, refactored foundational BlockObject constructs, added StateGroup concept. ([6824fa8](https://github.com/linkedin/css-blocks/commit/6824fa8))
* **css-blocks:** Casting through object is sufficient. ([461dbe8](https://github.com/linkedin/css-blocks/commit/461dbe8))
* **css-blocks:** Don't expose generic base class methods as public. ([03dba9b](https://github.com/linkedin/css-blocks/commit/03dba9b))
* **css-blocks:** Full type safety for all BlockTree objects. ([63e4a45](https://github.com/linkedin/css-blocks/commit/63e4a45))
* **css-blocks:** Remove BlockTree abstraction. ([752b89f](https://github.com/linkedin/css-blocks/commit/752b89f))
* **rewriter:** More functional rewriting and with static class support. ([38eb4e9](https://github.com/linkedin/css-blocks/commit/38eb4e9))
* **rewriter:** Raise an error if there's any stray references to a block variable. ([53b0cea](https://github.com/linkedin/css-blocks/commit/53b0cea))
* **webpack-plugin:** Extract webpack rewriting to its own plugin so that a single analysis can be used in other builds -- eg for SSR builds. ([77d6398](https://github.com/linkedin/css-blocks/commit/77d6398))


### BREAKING CHANGES

* To bring naming inline with the new ResolvedConfiguration type, the
normalizeOptions function is now named resolveConfiguration.  The module
named normalizeOptions has been renamed to resolver in the configuration
module folder.
* Now that all the other options types are named after Configuration, we
can rename SparseOptions to just Options.
* ReadonlyOptions is really the configuration after having been fully
resolved and populated by defaults.  So the name ResolvedConfiguration
makes more sense. This is the second of several commits to rename
the types for our options.
* Options are things that you *can* pass in and in this project they derive
from the project configuration. So this is the first of a few commits
that will result in SparseOptions being named just Options.
* Some types related to options are removed/renamed.

The options code was some of the first I wrote for this project and it
was awkward to use. A lot of APIs expected a concrete options reader
instead of just the options interface in a read-only state.

The options reader is no longer exported, the new normalizeOptions
function should be used to get a read-only options object populated
with default values where necessary.

Where user-supplied options are accepted, the SparseOptions type is
accepted and then normalized.
* The data option was too general of a name to describe its intent for
passing data to the importer.





<a name="0.17.0"></a>
# [0.17.0](https://github.com/linkedin/css-blocks/compare/0.15.1...0.17.0) (2017-12-08)


### Bug Fixes

* add missing files into npm package. ([c40f020](https://github.com/linkedin/css-blocks/commit/c40f020))
* call seal() on element analyses before using them. ([51d7a09](https://github.com/linkedin/css-blocks/commit/51d7a09))
* Disable buggy stray reference errors for now. ([44a830b](https://github.com/linkedin/css-blocks/commit/44a830b))
* handle inheritance in runtime class expressions. ([953b734](https://github.com/linkedin/css-blocks/commit/953b734))
* handle inheritance in runtime class expressions. ([dc501f0](https://github.com/linkedin/css-blocks/commit/dc501f0))
* Make remaining skipped tests pass with optimization. ([26acdc8](https://github.com/linkedin/css-blocks/commit/26acdc8))
* **analyzer:** Seal the analysis before using it. ([bdf1580](https://github.com/linkedin/css-blocks/commit/bdf1580))
* **rewriter:** Don't remove nodes that are already removed. ([c3b8ce1](https://github.com/linkedin/css-blocks/commit/c3b8ce1))
* **rewriter:** Get rewriter via a callback instead of through options to avoid serialization. ([ecf623a](https://github.com/linkedin/css-blocks/commit/ecf623a))
* **rewriter:** glimmer requires that subexpressions be helper invocations. ([bae23cb](https://github.com/linkedin/css-blocks/commit/bae23cb))
* Only enforce a value's presence in a dynamic switch condition if the condition is not disabled due to a missing style dependency. ([13cbd58](https://github.com/linkedin/css-blocks/commit/13cbd58))
* The analysis array gets added to while processing it so we have to monitor the array until its length doesn't change. ([eaf068f](https://github.com/linkedin/css-blocks/commit/eaf068f))
* **runtime:** the expression must always be read. ([06e3667](https://github.com/linkedin/css-blocks/commit/06e3667))


### Features

* **analysis:** Support opticss enabled analysis of css-blocks. ([451b077](https://github.com/linkedin/css-blocks/commit/451b077))
* **rewriter:** More functional rewriting and with static class support. ([38eb4e9](https://github.com/linkedin/css-blocks/commit/38eb4e9))
* **rewriter:** Raise an error if there's any stray references to a block variable. ([53b0cea](https://github.com/linkedin/css-blocks/commit/53b0cea))
* Allow css assets to be processed after concatenation. ([8d5ff5a](https://github.com/linkedin/css-blocks/commit/8d5ff5a))
* Allow styles to be set to className properties for dynamic change to the class attribute. ([5df7a7e](https://github.com/linkedin/css-blocks/commit/5df7a7e))
* **webpack:** Extract webpack rewriting to its own plugin so that a single analysis can be used in other builds -- eg for SSR builds. ([77d6398](https://github.com/linkedin/css-blocks/commit/77d6398))

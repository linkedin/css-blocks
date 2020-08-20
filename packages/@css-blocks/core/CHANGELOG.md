# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.3.2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v1.3.1...v1.3.2) (2020-08-20)


### Bug Fixes

* Make location writeable so ember-cli-htmlbars doesn't choke. ([8d513ba](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/8d513bae48eb5c4c061e99840e85faa389bf7e52))





# [1.3.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v1.2.4...v1.3.0) (2020-08-11)


### Bug Fixes

* Don't use the css-blocks installation location for guid gen. ([f21e652](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/f21e652d4707f55b669ff222cf6028b17466b35a))





# [1.2.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v1.1.2...v1.2.0) (2020-08-05)


### Bug Fixes

* Addl. block-interface-index error case. ([dc5ba19](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/dc5ba19693accfbcd4295358f78db458d913f386))
* Address PR feedback. ([6f04b6a](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/6f04b6a2d5879f8180e0f6339f78cdf94212d71b))
* Address PR feedback. ([68271ad](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/68271ad94fdb1ee1df295433aee273d03649339c))
* Allow quotes surrounding block-name. ([9617fc5](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/9617fc5e0cecc4c9b14048ff0e8d99dc11abc699))
* Allow the term classname as a single word. ([5201155](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/5201155de2660cf8cd62e92c07372492aa1bebb3))
* Analysis serialization had incorrect source locations. ([9969614](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/99696142b622f7bf4898e5d6b9fa26e6b9972e42))
* Apply CR suggestions ([b1068f3](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/b1068f3914f3de3c4d99731e7e8708a68f6a0b4c))
* Attribute intersections interpreted incorrectly during compilation. ([63b06e8](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/63b06e8349bad58de9623bdfef94ecde5a5fd046))
* Clarify error message. ([b16f3dc](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/b16f3dcbe30fcd58996871e13137f21655906c3c))
* Cleanup the deserialization code for analysis. ([2615eb9](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/2615eb9c05849ed567bc3064fa1e889ea4edf841))
* Comment should say Style not BlockClass. ([006cc0f](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/006cc0f77a34b52b3c8f5727ebda17a462a58452))
* Create a 'Source Analysis' for the new rewrite strategy. ([deefcdd](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/deefcddaaa4d3a0474a2ab0172c12a46314d3414))
* Don't hard error on name/guid issues. ([18f7364](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/18f7364db184ac09d2b8cdfdec2987a780a172c7))
* Emit block style composition declarations in a def file. ([d1185db](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/d1185dbf1d10f0c8b3533c41cbd1205aa475b33c))
* Failing tests and linting issues for core. ([afc157b](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/afc157be099dc285c244eb4edef0c1fbb84f26b1))
* Implement inline definitions in compiled blocks. ([e8541a0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/e8541a09a681ab8c9834244e0b34ab68bb44783f))
* Lint error. ([436d09a](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/436d09a4a1eef61808691da14c0e1a5dba5098a2))
* Lint errors. ([6eda525](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/6eda52517baf58b356730c8271767b755f93e31f))
* PR feedback regarding errors. ([a7384c8](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/a7384c85238d2dc6a234b138097522c2ea7a4ac9))
* Re-use precomiled css if available. Give compiled css to optimizer. ([5027298](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/502729859c7768daecceaab276d4cdfa80b24e63))
* Remove superflous property check. ([31bcb9e](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/31bcb9eeb0e479f55618ef669685760450e68783))
* Remove unnecessary try/catch. ([492c1e7](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/492c1e79049d7b5ab2b8b6f8ad564f91e821cdaf))
* Remove unnecessary type guard named isBooleanAttr. ([ebcb555](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/ebcb5556b931d2bd1a3f80670541b3c7d888aa16))
* Removed stray reference to obsolete isBooleanAttr function. ([a825a16](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/a825a16a014846c96076ad6518f7e9aee6c97aab))
* Revert last commit. ([69494a4](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/69494a49e3123a18c950b3cff158d8410a95274c))
* Serialized analysis block paths were missing/wrong. ([e680ef6](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/e680ef60512848b08c26101ebbe692bdc395b868))
* Several inheritance and composition bugs. ([4f23cc3](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/4f23cc30774f954938af23821174f112bc9475a6))
* Throw in BlockFactory if compiled css file. ([3d901e6](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/3d901e65cd90382869bb3245513b0676821a5d7d))
* Trim newlines from end of compiled comments. ([62eb34e](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/62eb34ee321069fdd2381d2600d0ce8aad3ded5a))
* Update comment per CR. ([7e3fe64](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/7e3fe64ddbce94b1538c54b0a38bd876da7973c3))
* Updates per CR feedback. ([717a205](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/717a20565c1f64b54ce521cd04bca74bd83248a2))
* Use debug idents for errors in BlockFactory. ([294f0be](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/294f0bee600876ea9ded23b692f12882b9f93e06))
* Use null in getUniqueBlockName. ([8118d49](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/8118d49f544883566e423442f1b90ae17e2c37a9))


### Features

* Add BlockCompiler method for compiling a definition file. ([183dc2f](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/183dc2fa457c1fa18c8b20f65e8e41919237fd2d))
* Basic block definition generation. ([8a3cade](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/8a3cadef0b40c1b2ba0fc809c71411cfd8d14962))
* Basic runtime data generation with optimizer disabled. ([cabd495](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/cabd4957881662c1b7d383c8e173c168c4887f0c))
* Compiled CSS importing in NodeJSImporter. ([983e7c6](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/983e7c6fbb49885169c9d6b83fbcb1567365d2fb))
* Data schema for Aggregate Rewriting. ([ca10a16](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/ca10a16f1b5b5395414a227d7b1e028d4fa117f7))
* Definition ingestion and parsing into block. ([0d6e76a](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/0d6e76a0147a10747cfcc63736235e6c7d92da80))
* Deserializing block definition files & analysis in the ember-app. ([ec338bf](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/ec338bf95ff214fcdaa52b619005d6cf36451801))
* Generate an index for each style in a block. ([94d1ded](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/94d1deda900164ea70e6a0575d4557178d9b60f1))
* Infrastructure for single pass analyzer & rewriter. ([466b933](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/466b9336f28c19afb45ba51e39121fed409c3986))
* Merge rulesets from Compiled CSS into block. ([e6c1ca7](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/e6c1ca7519e60d7784e931913de34ad09778f530))
* Parse and set block-interface-index ([7a0150d](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/7a0150dfe7d1e8fd588db9306c35b2e20467c931))
* Process block-class declarations. ([fa35c3d](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/fa35c3d0d567eea0e258e571814216f69b663fbf))
* Show the identifier of the other block if a name collision occurs. ([140d3cd](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/140d3cd56f47310c01282b20b5cd0c39d5c4838c))
* Use incoming GUIDs. Ensure uniqueness. ([3912811](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/39128110e47a5828f83a6d07e22a4b92fead12ac))
* Utilities for compiled CSS parsing. ([bec10d2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/bec10d2a9ea844b9d7072acb415b492804dc801e))
* Validate block-syntax-version. ([179d3db](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/179d3db3992d874653c4f8e28ee2f944ff5de8c0))
* Validate each interface-index is unique. ([92a5b25](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/92a5b253c5ec1145412fb22a7ef88425ece3408c))





## [1.1.2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v1.1.1...v1.1.2) (2020-07-20)


### Bug Fixes

* Switches in the rewrite didn't work with inheritance. ([360a28f](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/360a28f3e00c3def95bd38c4e3d19a5404f12ec6))





## [1.1.1](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v1.1.0...v1.1.1) (2020-06-30)


### Bug Fixes

* Attribute intersections interpreted incorrectly during compilation. ([41f9816](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/41f9816f63fd7ce8a9284697987b8b31920f7f8f))





# [1.0.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/compare/v1.0.0-alpha.7...v1.0.0) (2020-04-04)


### chore

* Drop support for node 6, 8, and 11. ([3806e82](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/3806e82124814fbea99aa47353cd2c171b1f55ec))


### Features

* Optional Preprocessors & library/application API contract. ([80aba33](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/core/commit/80aba33c818c1285e35840929bf1fbbb80698c36))


### BREAKING CHANGES

* Node 8 is now out of maintainence so we have dropped support for node 6
and 8. Node 11 is no longer needed because node 12 was released.





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

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.3.2](https://github.com/linkedin/css-blocks/compare/v1.3.1...v1.3.2) (2020-08-20)


### Bug Fixes

* Make location writeable so ember-cli-htmlbars doesn't choke. ([8d513ba](https://github.com/linkedin/css-blocks/commit/8d513bae48eb5c4c061e99840e85faa389bf7e52))





## [1.3.1](https://github.com/linkedin/css-blocks/compare/v1.3.0...v1.3.1) (2020-08-12)


### Bug Fixes

* Add missing concat helper. ([aad0431](https://github.com/linkedin/css-blocks/commit/aad043189dca8c7ca85bba6ee675a3fcf4a75c19))





# [1.3.0](https://github.com/linkedin/css-blocks/compare/v1.2.4...v1.3.0) (2020-08-11)


### Bug Fixes

* Don't use the css-blocks installation location for guid gen. ([f21e652](https://github.com/linkedin/css-blocks/commit/f21e652d4707f55b669ff222cf6028b17466b35a))
* Extract StyleEvaluator, StyleResolver classes from runtime service. ([282f90d](https://github.com/linkedin/css-blocks/commit/282f90de9714b36e1b5fdbbdff422005d5ccd257))
* Sometimes there's no css blocks output. ([1adbd1b](https://github.com/linkedin/css-blocks/commit/1adbd1b42c4bb916d6ea8a2c719acd7a99f2d9eb))


### Features

* Emit attribute groups in the runtime aggregate rewrite data. ([901032b](https://github.com/linkedin/css-blocks/commit/901032b940ce4c8ce9ec5af578359bf94e7ae616))
* Simplify rewrite for dynamic attribute values. ([0717e93](https://github.com/linkedin/css-blocks/commit/0717e9365095e49f34857aaa373e8bc0fb69a492))





## [1.2.4](https://github.com/linkedin/css-blocks/compare/v1.2.3...v1.2.4) (2020-08-05)

**Note:** Version bump only for package css-blocks-monorepo





## [1.2.3](https://github.com/linkedin/css-blocks/compare/v1.2.2...v1.2.3) (2020-08-05)


### Bug Fixes

* Build the runtimes when building all packages. ([748f77e](https://github.com/linkedin/css-blocks/commit/748f77edcbe316f9ce83e2a2118a0c35544854db))
* Prepare the new ember packages before publishing them. ([c5dc8bc](https://github.com/linkedin/css-blocks/commit/c5dc8bc1e2fc5be413fcdf3fcfff67919a2620f6))





## [1.2.2](https://github.com/linkedin/css-blocks/compare/v1.2.1...v1.2.2) (2020-08-05)


### Bug Fixes

* Clean up the dependencies on [@glimmer](https://github.com/glimmer) packages. ([0bc7964](https://github.com/linkedin/css-blocks/commit/0bc796470412f32bf6afd9cc5b889557b45364bd))
* Create the application services directory if it's not there. ([85c3560](https://github.com/linkedin/css-blocks/commit/85c3560d843fc3e58160a03be5e592aaf9fb5ee4))





## [1.2.1](https://github.com/linkedin/css-blocks/compare/v1.2.0...v1.2.1) (2020-08-05)


### Bug Fixes

* Add files that were missing from the new ember npm packages. ([b018382](https://github.com/linkedin/css-blocks/commit/b0183828bcbf5e0389d05dcdfca2db0e6a320bb8))





# [1.2.0](https://github.com/linkedin/css-blocks/compare/v1.1.2...v1.2.0) (2020-08-05)


### Bug Fixes

* A cleaner approach to getting access to css-blocks build output. ([318e79a](https://github.com/linkedin/css-blocks/commit/318e79a000dde66f3642ba27bb3c879d49cfb7e0))
* Add /DEBUG to ignore file, remove existing. ([92364fe](https://github.com/linkedin/css-blocks/commit/92364fe2447b381caf070e56daaad5d394242be2))
* Add details on current style evaluation for the runtime. ([dfbd4fe](https://github.com/linkedin/css-blocks/commit/dfbd4fe3387b80751b2775eb03228ab7786c6338))
* Add omitIdents analysis to the spec. ([d89481c](https://github.com/linkedin/css-blocks/commit/d89481cdde6b541bcf40813a819509e4177dc694))
* Addl. block-interface-index error case. ([dc5ba19](https://github.com/linkedin/css-blocks/commit/dc5ba19693accfbcd4295358f78db458d913f386))
* Address code review. Don't merge if an output file is specified. ([c145c9a](https://github.com/linkedin/css-blocks/commit/c145c9a1bf0cf1e62a8b14748d5d5a6f16ac2e38))
* Address PR feedback. ([6f04b6a](https://github.com/linkedin/css-blocks/commit/6f04b6a2d5879f8180e0f6339f78cdf94212d71b))
* Address PR feedback. ([68271ad](https://github.com/linkedin/css-blocks/commit/68271ad94fdb1ee1df295433aee273d03649339c))
* Allow null in typeguards. ([f69c457](https://github.com/linkedin/css-blocks/commit/f69c45789e2f5e9b9f0eb8879b39193fc3654c48))
* Allow quotes surrounding block-name. ([9617fc5](https://github.com/linkedin/css-blocks/commit/9617fc5e0cecc4c9b14048ff0e8d99dc11abc699))
* Allow the term classname as a single word. ([5201155](https://github.com/linkedin/css-blocks/commit/5201155de2660cf8cd62e92c07372492aa1bebb3))
* Analysis serialization had incorrect source locations. ([9969614](https://github.com/linkedin/css-blocks/commit/99696142b622f7bf4898e5d6b9fa26e6b9972e42))
* Apply CR suggestions ([b1068f3](https://github.com/linkedin/css-blocks/commit/b1068f3914f3de3c4d99731e7e8708a68f6a0b4c))
* Attribute intersections interpreted incorrectly during compilation. ([63b06e8](https://github.com/linkedin/css-blocks/commit/63b06e8349bad58de9623bdfef94ecde5a5fd046))
* Broken test case. ([59a37fd](https://github.com/linkedin/css-blocks/commit/59a37fdc0156b09cd882adc0cb11f93081317eff))
* Bugs in ember addon now that htmlbars is released. ([624cb38](https://github.com/linkedin/css-blocks/commit/624cb38dc52318558e26a2fcba41cb47c9b9e4a2))
* Cache invalidation when block files change. ([ea27173](https://github.com/linkedin/css-blocks/commit/ea271734eb558918a8fe8309486dbe206488cf2f))
* Change the magic comment to be more clearly css-blocks related. ([ed4066d](https://github.com/linkedin/css-blocks/commit/ed4066d3b74117f1806dd7157743b77a16d2dd64))
* Clarify error message. ([b16f3dc](https://github.com/linkedin/css-blocks/commit/b16f3dcbe30fcd58996871e13137f21655906c3c))
* Cleanup the deserialization code for analysis. ([2615eb9](https://github.com/linkedin/css-blocks/commit/2615eb9c05849ed567bc3064fa1e889ea4edf841))
* Comment should say Style not BlockClass. ([006cc0f](https://github.com/linkedin/css-blocks/commit/006cc0f77a34b52b3c8f5727ebda17a462a58452))
* Create a 'Source Analysis' for the new rewrite strategy. ([deefcdd](https://github.com/linkedin/css-blocks/commit/deefcddaaa4d3a0474a2ab0172c12a46314d3414))
* Declaration merging is now correctly rewritten by the new runtime. ([860c823](https://github.com/linkedin/css-blocks/commit/860c823bd09e0eedd5a6aecad22caae27704550c))
* Don't hard error on name/guid issues. ([18f7364](https://github.com/linkedin/css-blocks/commit/18f7364db184ac09d2b8cdfdec2987a780a172c7))
* Egregious hack to make lazy engines work. ([5da2dda](https://github.com/linkedin/css-blocks/commit/5da2dda124499ff1b543ca79dd44a2b03eede0ba))
* Ember fixture app and addons for testing @css-blocks/ember. ([92dd4c8](https://github.com/linkedin/css-blocks/commit/92dd4c8fdf5b3b7ac3fa8d8051136b929070277a))
* Emit block style composition declarations in a def file. ([d1185db](https://github.com/linkedin/css-blocks/commit/d1185dbf1d10f0c8b3533c41cbd1205aa475b33c))
* Ensure compiled css is not in vendor.css. ([4e4eebd](https://github.com/linkedin/css-blocks/commit/4e4eebdd2e952ce374ed844b8d45bb22bc4bcb68))
* Ensure the style requirements are satisfied. ([1869167](https://github.com/linkedin/css-blocks/commit/18691678c6e5a71140b97bc3d3aaface92796f29))
* Failing tests and linting issues for core. ([afc157b](https://github.com/linkedin/css-blocks/commit/afc157be099dc285c244eb4edef0c1fbb84f26b1))
* Failing tests. ([87bcc84](https://github.com/linkedin/css-blocks/commit/87bcc840bebc102245f7ca4d62e7052010a943db))
* Failing tests. ([7e199dd](https://github.com/linkedin/css-blocks/commit/7e199ddd601e5de94a6aa47bbf2fd0bc0309fa89))
* Formatting issue. ([be74160](https://github.com/linkedin/css-blocks/commit/be74160d4330c1361918ed318b894fa521e08e97))
* Implement inline definitions in compiled blocks. ([e8541a0](https://github.com/linkedin/css-blocks/commit/e8541a09a681ab8c9834244e0b34ab68bb44783f))
* Instead of addon use a vanilla module for testing node integration. ([9aafacd](https://github.com/linkedin/css-blocks/commit/9aafacd4dd20f87db2c2bb522f87adb1b4496e09))
* Lint error. ([46a5758](https://github.com/linkedin/css-blocks/commit/46a5758b2e4f584b93de6501518d11f601968af4))
* Lint error. ([436d09a](https://github.com/linkedin/css-blocks/commit/436d09a4a1eef61808691da14c0e1a5dba5098a2))
* Lint errors. ([6eda525](https://github.com/linkedin/css-blocks/commit/6eda52517baf58b356730c8271767b755f93e31f))
* Linting errors. ([f320818](https://github.com/linkedin/css-blocks/commit/f320818491d4abcde8aa227ee032738db817e18a))
* Look for broccoli tree paths in additional scopes. ([cebbc59](https://github.com/linkedin/css-blocks/commit/cebbc59a8e5e0b8eb0c969755e8278934997063f))
* Namespace blocks within each app/addon/engine. ([994239b](https://github.com/linkedin/css-blocks/commit/994239bafb514d4f24eb365cdb65f015918306a2))
* No need to use a custom recursive mkdir, it's part of the stdlib. ([bb55671](https://github.com/linkedin/css-blocks/commit/bb556711727de60f37cc46ed5d0ab472361e2b8f))
* Only add an analysis for block:scope if it's not explicitly there. ([8ee7d51](https://github.com/linkedin/css-blocks/commit/8ee7d51949040d1198b0b5306f1556e85b911570))
* Only consider output styles that can possibly apply. ([35a2c5a](https://github.com/linkedin/css-blocks/commit/35a2c5a6316ec026bb3114fec0f9500b2bb19e2f))
* Only merge with app.css if it exists. ([a2572ed](https://github.com/linkedin/css-blocks/commit/a2572ed3944a8cd6ea9ee3a55aa7114a3eedb84b))
* PR feedback regarding errors. ([a7384c8](https://github.com/linkedin/css-blocks/commit/a7384c85238d2dc6a234b138097522c2ea7a4ac9))
* Re-use precomiled css if available. Give compiled css to optimizer. ([5027298](https://github.com/linkedin/css-blocks/commit/502729859c7768daecceaab276d4cdfa80b24e63))
* Remove superflous property check. ([31bcb9e](https://github.com/linkedin/css-blocks/commit/31bcb9eeb0e479f55618ef669685760450e68783))
* Remove unnecessary try/catch. ([492c1e7](https://github.com/linkedin/css-blocks/commit/492c1e79049d7b5ab2b8b6f8ad564f91e821cdaf))
* Remove unnecessary type guard named isBooleanAttr. ([ebcb555](https://github.com/linkedin/css-blocks/commit/ebcb5556b931d2bd1a3f80670541b3c7d888aa16))
* Removed stray reference to obsolete isBooleanAttr function. ([a825a16](https://github.com/linkedin/css-blocks/commit/a825a16a014846c96076ad6518f7e9aee6c97aab))
* Revert last commit. ([69494a4](https://github.com/linkedin/css-blocks/commit/69494a49e3123a18c950b3cff158d8410a95274c))
* Serialized analysis block paths were missing/wrong. ([e680ef6](https://github.com/linkedin/css-blocks/commit/e680ef60512848b08c26101ebbe692bdc395b868))
* Several inheritance and composition bugs. ([4f23cc3](https://github.com/linkedin/css-blocks/commit/4f23cc30774f954938af23821174f112bc9475a6))
* Slightly less hacky approach to working with lazy engines. ([c3aec23](https://github.com/linkedin/css-blocks/commit/c3aec232bd42a58f3811310a71630264598ca865))
* Small updates to goals and open questions. ([59620ef](https://github.com/linkedin/css-blocks/commit/59620ef5a349266f4b2f987e3a8bdc384047263b))
* Style link-to helper in other states. ([3dfd350](https://github.com/linkedin/css-blocks/commit/3dfd35069848f02a8796d90d917dc4ca377f8ffd))
* Throw in BlockFactory if compiled css file. ([3d901e6](https://github.com/linkedin/css-blocks/commit/3d901e65cd90382869bb3245513b0676821a5d7d))
* Trim newlines from end of compiled comments. ([62eb34e](https://github.com/linkedin/css-blocks/commit/62eb34ee321069fdd2381d2600d0ce8aad3ded5a))
* Types lookup for the template-compiler-plugin of htmlbars. ([43f83c5](https://github.com/linkedin/css-blocks/commit/43f83c547e6d6bc291c24bd53bfeb9ab629ee079))
* Update comment per CR. ([7e3fe64](https://github.com/linkedin/css-blocks/commit/7e3fe64ddbce94b1538c54b0a38bd876da7973c3))
* Update debug message to output the correct value. ([4304fc5](https://github.com/linkedin/css-blocks/commit/4304fc509eecbc4d99da62f834cb8f27bee4e27d))
* Update goals for project. ([9f3c1c8](https://github.com/linkedin/css-blocks/commit/9f3c1c82260a0e109ed394d5769533349d87a129))
* Update tests to use the new helper name. ([0c20d7d](https://github.com/linkedin/css-blocks/commit/0c20d7d5043a22f9683a71996979d373e04504d6))
* Update type on BroccoliTreeImporter.import(). ([2236f4f](https://github.com/linkedin/css-blocks/commit/2236f4f36fecd7082f7686a98eb50f87cce19ee9))
* Update types for the fs-merger. ([62232f7](https://github.com/linkedin/css-blocks/commit/62232f7d4b5787bad4febda09c71ec0643232715))
* Updates per CR feedback. ([717a205](https://github.com/linkedin/css-blocks/commit/717a20565c1f64b54ce521cd04bca74bd83248a2))
* Updates per PR feedback. ([df501f7](https://github.com/linkedin/css-blocks/commit/df501f76a20afe0b0e5b1d9c69877060f257239c))
* Upgrade fs-merger. ([188591d](https://github.com/linkedin/css-blocks/commit/188591d0f1c76713da982e923127d5bfede1a952))
* Use debug idents for errors in BlockFactory. ([294f0be](https://github.com/linkedin/css-blocks/commit/294f0bee600876ea9ded23b692f12882b9f93e06))
* Use null in getUniqueBlockName. ([8118d49](https://github.com/linkedin/css-blocks/commit/8118d49f544883566e423442f1b90ae17e2c37a9))
* Whitespace to use tabs in code-workspace file. ([38e1e11](https://github.com/linkedin/css-blocks/commit/38e1e1146ef7b88dd5e7f7dbf0011d411625aeb6))


### Features

* Add BlockCompiler method for compiling a definition file. ([183dc2f](https://github.com/linkedin/css-blocks/commit/183dc2fa457c1fa18c8b20f65e8e41919237fd2d))
* Basic block definition generation. ([8a3cade](https://github.com/linkedin/css-blocks/commit/8a3cadef0b40c1b2ba0fc809c71411cfd8d14962))
* Basic runtime data generation with optimizer disabled. ([cabd495](https://github.com/linkedin/css-blocks/commit/cabd4957881662c1b7d383c8e173c168c4887f0c))
* Basic runtime helper build infrastructure and scaffolding. ([81d8853](https://github.com/linkedin/css-blocks/commit/81d885340087a627c5b31e20682c37f5d17aed06))
* Basic runtime style calculations working. ([50e84d1](https://github.com/linkedin/css-blocks/commit/50e84d118e8e4a413869589fd85bd78db582c06a))
* Centralize ember config and use it in ember & ember-app. ([85be93b](https://github.com/linkedin/css-blocks/commit/85be93bec7ce0cea26d12eadbf9822ebeab79a6c))
* Compiled CSS importing in NodeJSImporter. ([983e7c6](https://github.com/linkedin/css-blocks/commit/983e7c6fbb49885169c9d6b83fbcb1567365d2fb))
* Data schema for Aggregate Rewriting. ([ca10a16](https://github.com/linkedin/css-blocks/commit/ca10a16f1b5b5395414a227d7b1e028d4fa117f7))
* Definition ingestion and parsing into block. ([0d6e76a](https://github.com/linkedin/css-blocks/commit/0d6e76a0147a10747cfcc63736235e6c7d92da80))
* Deserializing block definition files & analysis in the ember-app. ([ec338bf](https://github.com/linkedin/css-blocks/commit/ec338bf95ff214fcdaa52b619005d6cf36451801))
* Ember wip integration with dfn compiler. ([2356846](https://github.com/linkedin/css-blocks/commit/2356846fe9eae6df22a20752b21d72b499386ead))
* Enable optimizer and runtime rewriting of optimized styles. ([af9efaa](https://github.com/linkedin/css-blocks/commit/af9efaaefec64fee3f3643d7acdaad3b756dc8ac))
* Establish ember-app addon. ([63f7e7e](https://github.com/linkedin/css-blocks/commit/63f7e7ef9ae47e3e51570dbf53f5625deb045ed7))
* Generate an index for each style in a block. ([94d1ded](https://github.com/linkedin/css-blocks/commit/94d1deda900164ea70e6a0575d4557178d9b60f1))
* Implement caching for additional files during template processing. ([6ae05b1](https://github.com/linkedin/css-blocks/commit/6ae05b1f61d4ddb2ab11392faf37b442ec386e54))
* Implied style runtime support. ([79f9141](https://github.com/linkedin/css-blocks/commit/79f9141aacddf954b6607e54b5724b7aeb82e5df))
* Infrastructure for single pass analyzer & rewriter. ([466b933](https://github.com/linkedin/css-blocks/commit/466b9336f28c19afb45ba51e39121fed409c3986))
* Make configuration loading synchronous with async wrapper. ([7105d10](https://github.com/linkedin/css-blocks/commit/7105d10d4ed002009ad793e449318b52d7e3cb9b)), closes [#365](https://github.com/linkedin/css-blocks/issues/365)
* Merge rulesets from Compiled CSS into block. ([e6c1ca7](https://github.com/linkedin/css-blocks/commit/e6c1ca7519e60d7784e931913de34ad09778f530))
* Optimized css in ember-app build output. ([c6ac1fd](https://github.com/linkedin/css-blocks/commit/c6ac1fd93829ef20f2176665405c1c8ead90349a))
* Option handling. Integration with ember-cli-htmlbars. ([a7a3e8f](https://github.com/linkedin/css-blocks/commit/a7a3e8f6c86aabc1466ece3389479d5a87bea023))
* Parse and set block-interface-index ([7a0150d](https://github.com/linkedin/css-blocks/commit/7a0150dfe7d1e8fd588db9306c35b2e20467c931))
* Process block-class declarations. ([fa35c3d](https://github.com/linkedin/css-blocks/commit/fa35c3d0d567eea0e258e571814216f69b663fbf))
* Project scaffolding for @css-blocks/ember. ([9d2d965](https://github.com/linkedin/css-blocks/commit/9d2d9658a4bc2a1b4c70ffaa972ccd375c25b191))
* Show the identifier of the other block if a name collision occurs. ([140d3cd](https://github.com/linkedin/css-blocks/commit/140d3cd56f47310c01282b20b5cd0c39d5c4838c))
* Use incoming GUIDs. Ensure uniqueness. ([3912811](https://github.com/linkedin/css-blocks/commit/39128110e47a5828f83a6d07e22a4b92fead12ac))
* Utilities for compiled CSS parsing. ([bec10d2](https://github.com/linkedin/css-blocks/commit/bec10d2a9ea844b9d7072acb415b492804dc801e))
* Validate block-syntax-version. ([179d3db](https://github.com/linkedin/css-blocks/commit/179d3db3992d874653c4f8e28ee2f944ff5de8c0))
* Validate each interface-index is unique. ([92a5b25](https://github.com/linkedin/css-blocks/commit/92a5b253c5ec1145412fb22a7ef88425ece3408c))





## [1.1.2](https://github.com/linkedin/css-blocks/compare/v1.1.1...v1.1.2) (2020-07-20)


### Bug Fixes

* Linter error. ([dfcb62e](https://github.com/linkedin/css-blocks/commit/dfcb62ef8ee900e43a01280f43752e1852f5a46b))
* Switches in the rewrite didn't work with inheritance. ([360a28f](https://github.com/linkedin/css-blocks/commit/360a28f3e00c3def95bd38c4e3d19a5404f12ec6))





## [1.1.1](https://github.com/linkedin/css-blocks/compare/v1.1.0...v1.1.1) (2020-06-30)


### Bug Fixes

* Attribute intersections interpreted incorrectly during compilation. ([41f9816](https://github.com/linkedin/css-blocks/commit/41f9816f63fd7ce8a9284697987b8b31920f7f8f))





# [1.1.0](https://github.com/linkedin/css-blocks/compare/v1.0.0...v1.1.0) (2020-05-23)


### Bug Fixes

* A css-blocks config file should take precendence over package.json. ([314a09e](https://github.com/linkedin/css-blocks/commit/314a09e67fbc531461e175e2b7890e6b00c1c0e9))
* Use sync interface for config in ember-cli. ([b16d433](https://github.com/linkedin/css-blocks/commit/b16d4333ede5fd5872fd61674310a5af69dae880))


### Features

* Make configuration loading synchronous with async wrapper. ([5c88e24](https://github.com/linkedin/css-blocks/commit/5c88e24bfb0815df8a323ff0e076b5332bdde5b1)), closes [#365](https://github.com/linkedin/css-blocks/issues/365)





# [1.0.0](https://github.com/linkedin/css-blocks/compare/v1.0.0-alpha.7...v1.0.0) (2020-04-04)


### Bug Fixes

* Glimmer apps have a different naming system. ([9b8f73c](https://github.com/linkedin/css-blocks/commit/9b8f73cd30b4d0dbd77401caa7488f1f81f4608d))
* Some packages were erroneously marked as MIT license. ([6ba8462](https://github.com/linkedin/css-blocks/commit/6ba84624ac5908e4454b4db9e821f12d04d6ab29))
* Work around for husky regression. ([1783a7e](https://github.com/linkedin/css-blocks/commit/1783a7e93c4fa615a51bfc245265de9a7a3df418))


### chore

* Drop support for node 6, 8, and 11. ([3806e82](https://github.com/linkedin/css-blocks/commit/3806e82124814fbea99aa47353cd2c171b1f55ec))


### Features

* Optional Preprocessors & library/application API contract. ([80aba33](https://github.com/linkedin/css-blocks/commit/80aba33c818c1285e35840929bf1fbbb80698c36))
* **eyeglass:** Adds new package that enables simple Eyeglass support. ([6f92d19](https://github.com/linkedin/css-blocks/commit/6f92d19c4362ca5e0b3971977d645eda5682c928))
* **style-of:** Allows positional arguements to be passed. ([2eb25a8](https://github.com/linkedin/css-blocks/commit/2eb25a81a32d1d7cfceac7d05bc57fd04001dc15))
* **style-of:** Errors if unsupported params have been passed. ([cbee078](https://github.com/linkedin/css-blocks/commit/cbee078b08008bceef4fe45f09d32eed9d7b4a15))


### BREAKING CHANGES

* Node 8 is now out of maintainence so we have dropped support for node 6
and 8. Node 11 is no longer needed because node 12 was released.





# [1.0.0-alpha.7](https://github.com/linkedin/css-blocks/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2020-02-23)


### Bug Fixes

* Don't cache the template entry points. ([df0a536](https://github.com/linkedin/css-blocks/commit/df0a536dd646084ef3e8b5daa17247df93cc5e91))





# [1.0.0-alpha.6](https://github.com/linkedin/css-blocks/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2020-02-19)


### Bug Fixes

* Avoid Promise.all() because of possible race conditions. ([61d0e54](https://github.com/linkedin/css-blocks/commit/61d0e548dd13086421c01f7969d82cac0e65cad8))
* More robust importing. ([37dcdfb](https://github.com/linkedin/css-blocks/commit/37dcdfb77c1882743a6f8d50ca716b75c97c7950))
* Only raise MultipleCssBlockErrors if there's more than one. ([96fdd29](https://github.com/linkedin/css-blocks/commit/96fdd29662a233abeb4df57c09b46a5633618f1f))
* Properly parse and rewrite style-of subexpressions. ([7c42b2a](https://github.com/linkedin/css-blocks/commit/7c42b2ae8522661a9d82bf29cc8baac1a9c1128e))
* Some tests were disabled during development. ([1ea91ee](https://github.com/linkedin/css-blocks/commit/1ea91ee45c84712a945c8473d0fad0585af0e42f))
* There were crashes when running with some debugging enabled. ([80dca43](https://github.com/linkedin/css-blocks/commit/80dca430ea07faf590477c6dc48b21965dd030d4))





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

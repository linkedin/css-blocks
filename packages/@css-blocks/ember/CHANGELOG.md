# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.2.2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/compare/v1.2.1...v1.2.2) (2020-08-05)


### Bug Fixes

* Clean up the dependencies on [@glimmer](https://github.com/glimmer) packages. ([0bc7964](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/0bc796470412f32bf6afd9cc5b889557b45364bd))





## [1.2.1](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/compare/v1.2.0...v1.2.1) (2020-08-05)


### Bug Fixes

* Add files that were missing from the new ember npm packages. ([b018382](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/b0183828bcbf5e0389d05dcdfca2db0e6a320bb8))





# [1.2.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/compare/v1.1.2...v1.2.0) (2020-08-05)


### Bug Fixes

* Broken test case. ([59a37fd](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/59a37fdc0156b09cd882adc0cb11f93081317eff))
* Bugs in ember addon now that htmlbars is released. ([624cb38](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/624cb38dc52318558e26a2fcba41cb47c9b9e4a2))
* Cache invalidation when block files change. ([ea27173](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/ea271734eb558918a8fe8309486dbe206488cf2f))
* Create a 'Source Analysis' for the new rewrite strategy. ([deefcdd](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/deefcddaaa4d3a0474a2ab0172c12a46314d3414))
* Ember fixture app and addons for testing @css-blocks/ember. ([92dd4c8](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/92dd4c8fdf5b3b7ac3fa8d8051136b929070277a))
* Ensure compiled css is not in vendor.css. ([4e4eebd](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/4e4eebdd2e952ce374ed844b8d45bb22bc4bcb68))
* Failing tests. ([87bcc84](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/87bcc840bebc102245f7ca4d62e7052010a943db))
* Look for broccoli tree paths in additional scopes. ([cebbc59](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/cebbc59a8e5e0b8eb0c969755e8278934997063f))
* Namespace blocks within each app/addon/engine. ([994239b](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/994239bafb514d4f24eb365cdb65f015918306a2))
* No need to use a custom recursive mkdir, it's part of the stdlib. ([bb55671](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/bb556711727de60f37cc46ed5d0ab472361e2b8f))
* Serialized analysis block paths were missing/wrong. ([e680ef6](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/e680ef60512848b08c26101ebbe692bdc395b868))
* Slightly less hacky approach to working with lazy engines. ([c3aec23](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/c3aec232bd42a58f3811310a71630264598ca865))
* Style link-to helper in other states. ([3dfd350](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/3dfd35069848f02a8796d90d917dc4ca377f8ffd))
* Types lookup for the template-compiler-plugin of htmlbars. ([43f83c5](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/43f83c547e6d6bc291c24bd53bfeb9ab629ee079))
* Update tests to use the new helper name. ([0c20d7d](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/0c20d7d5043a22f9683a71996979d373e04504d6))
* Update type on BroccoliTreeImporter.import(). ([2236f4f](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/2236f4f36fecd7082f7686a98eb50f87cce19ee9))
* Update types for the fs-merger. ([62232f7](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/62232f7d4b5787bad4febda09c71ec0643232715))


### Features

* Basic runtime helper build infrastructure and scaffolding. ([81d8853](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/81d885340087a627c5b31e20682c37f5d17aed06))
* Basic runtime style calculations working. ([50e84d1](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/50e84d118e8e4a413869589fd85bd78db582c06a))
* Centralize ember config and use it in ember & ember-app. ([85be93b](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/85be93bec7ce0cea26d12eadbf9822ebeab79a6c))
* Deserializing block definition files & analysis in the ember-app. ([ec338bf](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/ec338bf95ff214fcdaa52b619005d6cf36451801))
* Ember wip integration with dfn compiler. ([2356846](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/2356846fe9eae6df22a20752b21d72b499386ead))
* Implement caching for additional files during template processing. ([6ae05b1](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/6ae05b1f61d4ddb2ab11392faf37b442ec386e54))
* Infrastructure for single pass analyzer & rewriter. ([466b933](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/466b9336f28c19afb45ba51e39121fed409c3986))
* Option handling. Integration with ember-cli-htmlbars. ([a7a3e8f](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/a7a3e8f6c86aabc1466ece3389479d5a87bea023))
* Project scaffolding for @css-blocks/ember. ([9d2d965](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember/commit/9d2d9658a4bc2a1b4c70ffaa972ccd375c25b191))

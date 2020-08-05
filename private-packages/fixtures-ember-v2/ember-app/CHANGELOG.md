# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.2.3](https://github.com/linkedin/css-blocks/compare/v1.2.2...v1.2.3) (2020-08-05)

**Note:** Version bump only for package @css-blocks-fixtures-v2/ember-app





## [1.2.2](https://github.com/linkedin/css-blocks/compare/v1.2.1...v1.2.2) (2020-08-05)

**Note:** Version bump only for package @css-blocks-fixtures-v2/ember-app





## [1.2.1](https://github.com/linkedin/css-blocks/compare/v1.2.0...v1.2.1) (2020-08-05)

**Note:** Version bump only for package @css-blocks-fixtures-v2/ember-app





# [1.2.0](https://github.com/linkedin/css-blocks/compare/v1.1.2...v1.2.0) (2020-08-05)


### Bug Fixes

* Add /DEBUG to ignore file, remove existing. ([92364fe](https://github.com/linkedin/css-blocks/commit/92364fe2447b381caf070e56daaad5d394242be2))
* Bugs in ember addon now that htmlbars is released. ([624cb38](https://github.com/linkedin/css-blocks/commit/624cb38dc52318558e26a2fcba41cb47c9b9e4a2))
* Cache invalidation when block files change. ([ea27173](https://github.com/linkedin/css-blocks/commit/ea271734eb558918a8fe8309486dbe206488cf2f))
* Declaration merging is now correctly rewritten by the new runtime. ([860c823](https://github.com/linkedin/css-blocks/commit/860c823bd09e0eedd5a6aecad22caae27704550c))
* Ember fixture app and addons for testing @css-blocks/ember. ([92dd4c8](https://github.com/linkedin/css-blocks/commit/92dd4c8fdf5b3b7ac3fa8d8051136b929070277a))
* Failing tests. ([7e199dd](https://github.com/linkedin/css-blocks/commit/7e199ddd601e5de94a6aa47bbf2fd0bc0309fa89))
* Instead of addon use a vanilla module for testing node integration. ([9aafacd](https://github.com/linkedin/css-blocks/commit/9aafacd4dd20f87db2c2bb522f87adb1b4496e09))
* Re-use precomiled css if available. Give compiled css to optimizer. ([5027298](https://github.com/linkedin/css-blocks/commit/502729859c7768daecceaab276d4cdfa80b24e63))
* Several inheritance and composition bugs. ([4f23cc3](https://github.com/linkedin/css-blocks/commit/4f23cc30774f954938af23821174f112bc9475a6))
* Style link-to helper in other states. ([3dfd350](https://github.com/linkedin/css-blocks/commit/3dfd35069848f02a8796d90d917dc4ca377f8ffd))


### Features

* Basic runtime helper build infrastructure and scaffolding. ([81d8853](https://github.com/linkedin/css-blocks/commit/81d885340087a627c5b31e20682c37f5d17aed06))
* Deserializing block definition files & analysis in the ember-app. ([ec338bf](https://github.com/linkedin/css-blocks/commit/ec338bf95ff214fcdaa52b619005d6cf36451801))
* Ember wip integration with dfn compiler. ([2356846](https://github.com/linkedin/css-blocks/commit/2356846fe9eae6df22a20752b21d72b499386ead))
* Establish ember-app addon. ([63f7e7e](https://github.com/linkedin/css-blocks/commit/63f7e7ef9ae47e3e51570dbf53f5625deb045ed7))
* Implied style runtime support. ([79f9141](https://github.com/linkedin/css-blocks/commit/79f9141aacddf954b6607e54b5724b7aeb82e5df))





# [1.0.0](https://github.com/linkedin/css-blocks/compare/v1.0.0-alpha.7...v1.0.0) (2020-04-04)


### chore

* Drop support for node 6, 8, and 11. ([3806e82](https://github.com/linkedin/css-blocks/commit/3806e82124814fbea99aa47353cd2c171b1f55ec))


### BREAKING CHANGES

* Node 8 is now out of maintainence so we have dropped support for node 6
and 8. Node 11 is no longer needed because node 12 was released.

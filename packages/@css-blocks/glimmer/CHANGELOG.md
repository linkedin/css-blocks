# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.1.2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v1.1.1...v1.1.2) (2020-07-20)


### Bug Fixes

* Linter error. ([dfcb62e](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/dfcb62ef8ee900e43a01280f43752e1852f5a46b))
* Switches in the rewrite didn't work with inheritance. ([360a28f](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/360a28f3e00c3def95bd38c4e3d19a5404f12ec6))





## [1.1.1](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v1.1.0...v1.1.1) (2020-06-30)

**Note:** Version bump only for package @css-blocks/glimmer





# [1.0.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v1.0.0-alpha.7...v1.0.0) (2020-04-04)


### Bug Fixes

* Some packages were erroneously marked as MIT license. ([6ba8462](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/6ba84624ac5908e4454b4db9e821f12d04d6ab29))


### chore

* Drop support for node 6, 8, and 11. ([3806e82](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/3806e82124814fbea99aa47353cd2c171b1f55ec))


### Features

* **style-of:** Allows positional arguements to be passed. ([2eb25a8](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/2eb25a81a32d1d7cfceac7d05bc57fd04001dc15))
* **style-of:** Errors if unsupported params have been passed. ([cbee078](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/cbee078b08008bceef4fe45f09d32eed9d7b4a15))


### BREAKING CHANGES

* Node 8 is now out of maintainence so we have dropped support for node 6
and 8. Node 11 is no longer needed because node 12 was released.





# [1.0.0-alpha.6](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2020-02-19)


### Bug Fixes

* Avoid Promise.all() because of possible race conditions. ([61d0e54](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/61d0e548dd13086421c01f7969d82cac0e65cad8))
* Properly parse and rewrite style-of subexpressions. ([7c42b2a](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/7c42b2ae8522661a9d82bf29cc8baac1a9c1128e))
* There were crashes when running with some debugging enabled. ([80dca43](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/80dca430ea07faf590477c6dc48b21965dd030d4))





# [1.0.0-alpha.5](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2020-02-14)


### Features

* Add style-of helper for glimmer. ([afcc846](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/afcc8464f3afc67fa2a2bd39f5d129c040f2170b)), closes [#383](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/issues/383)





# [1.0.0-alpha.4](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2019-12-18)


### Bug Fixes

* Dynamic scope attributes were not being analyzed or rewritten. ([488e23e](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/488e23eee2746a962bec27d9356657aa489b2686)), closes [#371](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/issues/371) [#373](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/issues/373)





# [1.0.0-alpha.3](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2019-12-11)


### Bug Fixes

* Use the AST builders provided by to the plugin. ([f0d6387](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/f0d6387643d16a59003e43026ba7c0f622665407))





# [1.0.0-alpha.2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2019-12-10)


### Bug Fixes

* A block compilation error would cause the template to be skipped. ([9f6c57d](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/9f6c57d5d775cfce99b7e58fea3554cbc6ee4890))
* Handle missing block files in glimmer apps. ([4e984d4](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/4e984d4f924906676aac807b9767ad3c2b0a6d35))





# [1.0.0-alpha.1](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v1.0.0-alpha.0...v1.0.0-alpha.1) (2019-12-10)


### Bug Fixes

* Discover new glimmer components when they are added while watching. ([f3386ac](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/f3386ac1ca2ce13142310f2ad7f7f1b81b3fee4c))
* Fix dev build performance issue. ([bf9bd06](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/bf9bd069e96bc47fbc6229f60625fe5ebbe82d28)), closes [#357](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/issues/357)





# [1.0.0-alpha.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v0.24.0...v1.0.0-alpha.0) (2019-11-22)


### Bug Fixes

* Fix bugs introduced by per-block namespaces. ([180b416](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/180b416))
* Fixing a few lint errors after a rebase. ([4a05b40](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/4a05b40))
* Fixing tests. ([7d368cc](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/7d368cc))
* For when the block-alias is the same name as a generated className. ([bd36033](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/bd36033))
* Small tweaks around parameter passing. ([5d91c56](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/5d91c56))
* Using the export syntax for blocks in tests. ([bc86451](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/bc86451))


### Features

* Introducing the block-alias. ([5517d72](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/5517d72))
* Passing all block aliases as reserved classNames for compilation. ([aea5fcc](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/aea5fcc))
* Per block namespaces. ([053ed47](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/053ed47))
* Respect explicit exports for a block interface. ([d37e704](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/d37e704))





# [0.24.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v0.23.2...v0.24.0) (2019-09-16)


### Features

* Invalidate handlebar template caches when dependent blocks change. ([e3fd6f2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/e3fd6f2))
* Track ranges instead of only the start position for errors. ([f7f2dfb](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/f7f2dfb))





<a name="0.23.2"></a>
## [0.23.2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v0.23.1...v0.23.2) (2019-06-13)

**Note:** Version bump only for package @css-blocks/glimmer





<a name="0.23.0"></a>
# [0.23.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v0.22.0...v0.23.0) (2019-05-08)

**Note:** Version bump only for package @css-blocks/glimmer





<a name="0.22.0"></a>
# [0.22.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v0.21.0...v0.22.0) (2019-05-02)

**Note:** Version bump only for package @css-blocks/glimmer





<a name="0.21.0"></a>
# [0.21.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v0.20.0...v0.21.0) (2019-04-07)


### Features

* In-Stylesheet Block Composition ([#229](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/issues/229)) ([da10830](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/da10830))





<a name="0.20.0"></a>
# [0.20.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v0.20.0-beta.8...v0.20.0) (2019-03-11)


### Features

* **glimmer:** {{link-to}} integration ([#233](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/issues/233)). ([dc19029](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/dc19029))





<a name="0.20.0-beta.7"></a>
# [0.20.0-beta.7](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v0.20.0-beta.5...v0.20.0-beta.7) (2019-02-01)


### Bug Fixes

* Build AMD glimmer helpers in ES5 for IE11 support. ([213aad8](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/213aad8))





<a name="0.20.0-beta.6"></a>
# [0.20.0-beta.6](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v0.20.0-beta.5...v0.20.0-beta.6) (2019-02-01)


### Bug Fixes

* Build AMD glimmer helpers in ES5 for IE11 support. ([213aad8](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/213aad8))





<a name="0.20.0-beta.5"></a>
# [0.20.0-beta.5](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/compare/v0.20.0-beta.4...v0.20.0-beta.5) (2019-01-08)


### Bug Fixes

* Deliver both 'visitor' and 'visitors' for Glimmer AST Plugins. ([e7d6fad](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/e7d6fad))


### Features

* Extended [@block](https://github.com/block) syntax. Issue [#192](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/issues/192). ([9cbb4ea](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/glimmer/commit/9cbb4ea))





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

* **broccoli:** Add naive caching strategy for Broccoli. ([#190](https://github.com/linkedin/css-blocks/issues/190)) ([d63626f](https://github.com/linkedin/css-blocks/commit/d63626f))
* **ember-cli:** Ember cli classic ([#185](https://github.com/linkedin/css-blocks/issues/185)). ([865267c](https://github.com/linkedin/css-blocks/commit/865267c))





<a name="0.19.0"></a>
# [0.19.0](https://github.com/linkedin/css-blocks/compare/v0.18.0...v0.19.0) (2018-04-25)

**Note:** Version bump only for package @css-blocks/glimmer





<a name="0.18.0"></a>
# [0.18.0](https://github.com/linkedin/css-blocks/compare/0.15.1...0.18.0) (2018-04-24)


### Bug Fixes

* Update global states to use simplified parser utils. ([b953602](https://github.com/linkedin/css-blocks/commit/b953602))


### Features

* Enable root-level typedoc generation for the project. ([557fd49](https://github.com/linkedin/css-blocks/commit/557fd49))
* Enable root-level typedoc generation for the project. ([59c85a3](https://github.com/linkedin/css-blocks/commit/59c85a3))





<a name="0.17.0"></a>
# [0.17.0](https://github.com/linkedin/css-blocks/compare/0.15.1...0.17.0) (2017-12-08)


### Bug Fixes

* **rewriter:** glimmer requires that subexpressions be helper invocations. ([bae23cb](https://github.com/linkedin/css-blocks/commit/bae23cb))
* **runtime:** the expression must always be read. ([06e3667](https://github.com/linkedin/css-blocks/commit/06e3667))
* call seal() on element analyses before using them. ([51d7a09](https://github.com/linkedin/css-blocks/commit/51d7a09))
* handle inheritance in runtime class expressions. ([953b734](https://github.com/linkedin/css-blocks/commit/953b734))
* Only enforce a value's presence in a dynamic switch condition if the condition is not disabled due to a missing style dependency. ([13cbd58](https://github.com/linkedin/css-blocks/commit/13cbd58))

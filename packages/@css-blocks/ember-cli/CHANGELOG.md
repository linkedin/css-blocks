# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.2.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.1.2...v1.2.0) (2020-08-05)

**Note:** Version bump only for package @css-blocks/ember-cli





## [1.1.2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.1.1...v1.1.2) (2020-07-20)

**Note:** Version bump only for package @css-blocks/ember-cli





## [1.1.1](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.1.0...v1.1.1) (2020-06-30)

**Note:** Version bump only for package @css-blocks/ember-cli





# [1.1.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.0.0...v1.1.0) (2020-05-23)


### Bug Fixes

* Use sync interface for config in ember-cli. ([b16d433](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/b16d4333ede5fd5872fd61674310a5af69dae880))





# [1.0.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.0.0-alpha.7...v1.0.0) (2020-04-04)


### chore

* Drop support for node 6, 8, and 11. ([3806e82](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/3806e82124814fbea99aa47353cd2c171b1f55ec))


### BREAKING CHANGES

* Node 8 is now out of maintainence so we have dropped support for node 6
and 8. Node 11 is no longer needed because node 12 was released.





# [1.0.0-alpha.7](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2020-02-23)

**Note:** Version bump only for package @css-blocks/ember-cli





# [1.0.0-alpha.6](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2020-02-19)

**Note:** Version bump only for package @css-blocks/ember-cli





# [1.0.0-alpha.5](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2020-02-14)


### Bug Fixes

* Removing invalid paths from the package.json. ([#381](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/issues/381)) ([e600514](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/e600514c93cd4c35092862f0461f374779155e60))





# [1.0.0-alpha.4](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2019-12-18)


### Features

* Enable optimization for production builds by default. ([8b2d595](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/8b2d59509cb80b5d107a27eba90b96b81a75ed4c))





# [1.0.0-alpha.3](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2019-12-11)

**Note:** Version bump only for package @css-blocks/ember-cli





# [1.0.0-alpha.2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2019-12-10)


### Bug Fixes

* Add missing dependency. ([c4dc125](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/c4dc125792ce1fe382005d520276f8b5d355d7c0))





# [1.0.0-alpha.1](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v1.0.0-alpha.0...v1.0.0-alpha.1) (2019-12-10)


### Bug Fixes

* Fix dev build performance issue. ([bf9bd06](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/bf9bd069e96bc47fbc6229f60625fe5ebbe82d28)), closes [#357](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/issues/357)
* Must invalidate the handlebars template cache across processes. ([2afd213](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/2afd21332d0d0cb30a5203ec1c5a08fd3d746c2f))
* Properly prune unprocessed CSS Block files from build output. ([076973d](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/076973dc8ae1f25dbd94163d03ab1bdd021932c3))


### Features

* Load the css-blocks configuration file. ([6dc7397](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/6dc7397102b95a1570015f32424940e27c208d16))





# [1.0.0-alpha.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.24.0...v1.0.0-alpha.0) (2019-11-22)


### Bug Fixes

* Fix bugs introduced by per-block namespaces. ([180b416](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/180b416))





# [0.24.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.23.2...v0.24.0) (2019-09-16)


### Bug Fixes

* Respect custom Ember module names. ([#303](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/issues/303)) ([8732070](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/8732070))


### Features

* Invalidate handlebar template caches when dependent blocks change. ([e3fd6f2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/e3fd6f2))





<a name="0.23.2"></a>
## [0.23.2](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.23.1...v0.23.2) (2019-06-13)


### Bug Fixes

* **ember-cli:** Detect ember by presece of ember-source. ([28e8811](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/28e8811))





<a name="0.23.0"></a>
# [0.23.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.22.0...v0.23.0) (2019-05-08)

**Note:** Version bump only for package @css-blocks/ember-cli





<a name="0.22.0"></a>
# [0.22.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.21.0...v0.22.0) (2019-05-02)


### Bug Fixes

* Over-zealous conflicts from inherited in-stylesheet compositions. ([c70ed03](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/c70ed03))





<a name="0.21.0"></a>
# [0.21.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.20.0...v0.21.0) (2019-04-07)


### Features

* In-Stylesheet Block Composition ([#229](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/issues/229)) ([da10830](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/da10830))





<a name="0.20.0"></a>
# [0.20.0](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.20.0-beta.8...v0.20.0) (2019-03-11)


### Features

* **glimmer:** {{link-to}} integration ([#233](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/issues/233)). ([dc19029](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/dc19029))





<a name="0.20.0-beta.8"></a>
# [0.20.0-beta.8](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.20.0-beta.7...v0.20.0-beta.8) (2019-02-26)


### Bug Fixes

* **ember-cli:** Use separate file for CSS staging, merge app.css at end. ([#230](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/issues/230)) ([40a0022](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/40a0022))





<a name="0.20.0-beta.7"></a>
# [0.20.0-beta.7](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.20.0-beta.5...v0.20.0-beta.7) (2019-02-01)

**Note:** Version bump only for package @css-blocks/ember-cli





<a name="0.20.0-beta.6"></a>
# [0.20.0-beta.6](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.20.0-beta.5...v0.20.0-beta.6) (2019-02-01)

**Note:** Version bump only for package @css-blocks/ember-cli





<a name="0.20.0-beta.5"></a>
# [0.20.0-beta.5](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/compare/v0.20.0-beta.4...v0.20.0-beta.5) (2019-01-08)


### Bug Fixes

* Comment out failing node_modules test case breaking build in CI. ([7548289](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/7548289))
* Deliver both 'visitor' and 'visitors' for Glimmer AST Plugins. ([e7d6fad](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/e7d6fad))
* Use local versions of packages in ember-cli. ([6228eaa](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/6228eaa))


### Features

* Extended [@block](https://github.com/block) syntax. Issue [#192](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/issues/192). ([9cbb4ea](https://github.com/linkedin/css-blocks/tree/master/packages/%40css-blocks/ember-cli/commit/9cbb4ea))





<a name="0.20.0-beta.4"></a>
# [0.20.0-beta.4](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.3...v0.20.0-beta.4) (2018-10-19)


### Features

* Manually throw error for Node 6 in Analyzer. ([5788fcc](https://github.com/linkedin/css-blocks/commit/5788fcc))





<a name="0.20.0-beta.3"></a>
# [0.20.0-beta.3](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.2...v0.20.0-beta.3) (2018-10-01)


### Features

* Ember CLI addon Preprocessor support. ([574483d](https://github.com/linkedin/css-blocks/commit/574483d))





<a name="0.20.0-beta.2"></a>
# [0.20.0-beta.2](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.1...v0.20.0-beta.2) (2018-09-25)

**Note:** Version bump only for package @css-blocks/ember-cli





<a name="0.20.0-beta.1"></a>
# [0.20.0-beta.1](https://github.com/linkedin/css-blocks/compare/v0.20.0-beta.0...v0.20.0-beta.1) (2018-09-13)


### Bug Fixes

* Comment out failing node_modules test case breaking build in CI. ([09f1a17](https://github.com/linkedin/css-blocks/commit/09f1a17))
* Use local versions of packages in ember-cli. ([4c75501](https://github.com/linkedin/css-blocks/commit/4c75501))





<a name="0.20.0-beta.0"></a>
# [0.20.0-beta.0](https://github.com/linkedin/css-blocks/compare/v0.19.0...v0.20.0-beta.0) (2018-08-20)


### Features

* **broccoli:** Add naive caching strategy for Broccoli. ([#190](https://github.com/linkedin/css-blocks/issues/190)) ([d63626f](https://github.com/linkedin/css-blocks/commit/d63626f))
* **ember-cli:** Ember cli classic ([#185](https://github.com/linkedin/css-blocks/issues/185)). ([865267c](https://github.com/linkedin/css-blocks/commit/865267c))





<a name="0.19.0"></a>
# [0.19.0](https://github.com/linkedin/css-blocks/compare/v0.18.0...v0.19.0) (2018-04-25)

**Note:** Version bump only for package @css-blocks/ember-cli





<a name="0.18.0"></a>
# [0.18.0](https://github.com/linkedin/css-blocks/compare/0.15.1...0.18.0) (2018-04-24)


### Features

* Add [@css-blocks](https://github.com/css-blocks)/ember-cli and [@css-blocks](https://github.com/css-blocks)/playground packages. ([cb43511](https://github.com/linkedin/css-blocks/commit/cb43511))
* Pass CSS Blocks options through Broccoli/Ember-CLI. ([41401b9](https://github.com/linkedin/css-blocks/commit/41401b9))

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

<a name="0.17.0"></a>
# [0.17.0](https://github.com/css-blocks/css-blocks/compare/0.15.1...0.17.0) (2017-12-08)


### Bug Fixes

* add missing files into npm package. ([c40f020](https://github.com/css-blocks/css-blocks/commit/c40f020))
* call seal() on element analyses before using them. ([51d7a09](https://github.com/css-blocks/css-blocks/commit/51d7a09))
* Disable buggy stray reference errors for now. ([44a830b](https://github.com/css-blocks/css-blocks/commit/44a830b))
* handle inheritance in runtime class expressions. ([953b734](https://github.com/css-blocks/css-blocks/commit/953b734))
* handle inheritance in runtime class expressions. ([dc501f0](https://github.com/css-blocks/css-blocks/commit/dc501f0))
* Make remaining skipped tests pass with optimization. ([26acdc8](https://github.com/css-blocks/css-blocks/commit/26acdc8))
* **analyzer:** Seal the analysis before using it. ([bdf1580](https://github.com/css-blocks/css-blocks/commit/bdf1580))
* **rewriter:** Don't remove nodes that are already removed. ([c3b8ce1](https://github.com/css-blocks/css-blocks/commit/c3b8ce1))
* **rewriter:** Get rewriter via a callback instead of through options to avoid serialization. ([ecf623a](https://github.com/css-blocks/css-blocks/commit/ecf623a))
* **rewriter:** glimmer requires that subexpressions be helper invocations. ([bae23cb](https://github.com/css-blocks/css-blocks/commit/bae23cb))
* Only enforce a value's presence in a dynamic switch condition if the condition is not disabled due to a missing style dependency. ([13cbd58](https://github.com/css-blocks/css-blocks/commit/13cbd58))
* The analysis array gets added to while processing it so we have to monitor the array until its length doesn't change. ([eaf068f](https://github.com/css-blocks/css-blocks/commit/eaf068f))
* **runtime:** the expression must always be read. ([06e3667](https://github.com/css-blocks/css-blocks/commit/06e3667))


### Features

* **analysis:** Support opticss enabled analysis of css-blocks. ([451b077](https://github.com/css-blocks/css-blocks/commit/451b077))
* **rewriter:** More functional rewriting and with static class support. ([38eb4e9](https://github.com/css-blocks/css-blocks/commit/38eb4e9))
* **rewriter:** Raise an error if there's any stray references to a block variable. ([53b0cea](https://github.com/css-blocks/css-blocks/commit/53b0cea))
* Allow css assets to be processed after concatenation. ([8d5ff5a](https://github.com/css-blocks/css-blocks/commit/8d5ff5a))
* Allow styles to be set to className properties for dynamic change to the class attribute. ([5df7a7e](https://github.com/css-blocks/css-blocks/commit/5df7a7e))
* **webpack-plugin:** Extract webpack rewriting to its own plugin so that a single analysis can be used in other builds -- eg for SSR builds. ([77d6398](https://github.com/css-blocks/css-blocks/commit/77d6398))

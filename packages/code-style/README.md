Code Style for `css-blocks`
===========================

This project adheres to the following conventions for code and its style.
These conventions govern the code that runs during build-time. There are
separate conventions for code intended to run in the browser.

Node Support Policy
-------------------

Starting with Node 8, CSS Blocks and related projects will support all
[Active LTS releases of Node][node-releases]. Once a node version moves into
"Maintenance LTS" we reserve the right to drop support for it with the next
*minor* release. Our projects are configured to set the node `engine` version
in their `package.json`, so such releases will not regress for projects using
older versions of node &mdash; but bug fixes and new features may not be
released.

The exception to this is that critical security patches will be released for
versions of our software to support projects using Node that remains in the
Maintenance LTS mode.

Code Style
----------

Specific Lint rules ran are not covered here. The source of truth is
found in the [configuration files below](#shared-configuration-files).
Not all code style can be linted, here's what else you need to know:

1. Code is written in TypeScript and transpiled to the newest version of ES
   Modules that are supported by our Node Support Policy ([see above](#node-support-policy)).
2. All TypeScript code will use this project's configuration
   files where possible.
3. Linting must be performed as part of `yarn test` for every node package.
4. All code is compiled with TypeScript's strictest settings enabled and
   any new strictness options are enabled with each TypeScript release.
5. We prefer `for ... of` loops for iteration.
  * `forEach` should only be used to apply an existing function to values
    in an array. Never use a local function with `forEach`.
  * If an object needs to provide a way to iterate over values,
    we prefer using a [generator][generators] to taking a callback. This
    works better with `for ... of` loops.
6. Avoid `any`. There are very few times it's necessary. We use
   the type `whatever` from `@opticss/util` to express very generic
   values without introducing the infectious semantics of `any`.
   Exceptions:
     * Using a value from library that has a very complex type for which
       types are not available or are not good enough. If possible, declare
       a local interface for the aspects of the library that we use. If any
       is needed, declare a type alias to any for that library and disable the
       lint rule for that line.
     * In very rare cases, casting through any is required to convince
       the type checker that a value will have the type you say it will have.
       More often than not, if the type checker says you can't cast to a value,
       it's right.

Test Code Style
---------------

Test code is linted like source code. Exceptions and Additions to those rules
are listed here:

1. Testing is done with [`ts-mocha`][ts-mocha], [`chai`][chai] for assertions.
2. Do not use "bdd-style" assertions (e.g. expect/should) for tests.
3. Tests that use randomization or fuzzing to test a feature must
   include information in the output or error that makes it easy to reproduce
   the error either by seeding the random number generator or by including
   the actual values used in the error message.
4. Integration testing is preferred to unit tests so that tests are robust
   against internal refactors.
5. When unit testing, there is a preference for adding internal APIs to real
   objects over using mocks/stubs or other tools to inspect that a test had the
   expected outcomes to its unit and to the units it interacts with.

Editor/IDE
----------

This project recommends the use of Visual Studio Code and includes
configuration for integration with it to enhance the IDE experience
with the tooling choices of the project and makes things like
interactive debugging work easily while running the tests.

Shared Configuration Files
--------------------------

* [`configs/tslint.interactive.json`][interactive-lint-config] - These
  lints affect the way code is written and usually can't be fixed
  automatically. They are well-suited to be ran interactively while you
  develop. If you use VSCode, our provided configuration files will
  automatically be set up to run only these lints while you're writing code.
* [`configs/tslint.cli.json`][cli-lint-config] - Lints that are best to run
  from the CLI after tests pass or before commit. Usually these can be fixed
  automatically by running `lerna run lintfix`. Automated fixers aren't
  perfect, so we recommend running the code after staging a commit so you can
  see what it did by running a `git diff` or with `git add -p`. When you run
  `yarn test` on a package or `lerna run test` on the repo, these lints will
  be used. This lint configuration file inherits from `tslint.interactive.json`.
* [`configs/tslint.release.json`][release-lint-config] - These lints perform
  sanity checks against code that is about to be released or checked in.
  These lints would be annoying under normal development workflows and so
  they're not included. This lint configuration file inherits from `tslint.interactive.json`.
  and rule customization for test code. This configuration does not extend
  any other configuration files. It is meant to be combined with the others
  for tests.

[node-releases]: https://github.com/nodejs/Release
[type-guards]: https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types
[ts-mocha]: https://www.npmjs.com/package/ts-mocha
[chai]: http://chaijs.com/api/assert/
[generators]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators
[interactive-lint-config]: https://github.com/css-blocks/css-blocks/tree/master/packages/code-style/configs/tslint.interactive.json
[cli-lint-config]: https://github.com/css-blocks/css-blocks/tree/master/packages/code-style/configs/tslint.cli.json
[release-lint-config]: https://github.com/css-blocks/css-blocks/tree/master/packages/code-style/configs/tslint.release.json
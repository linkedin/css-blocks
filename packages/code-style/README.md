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

1. Code is written in TypeScript and transpiled to the newest version of ES
   Modules that are supported by our Node Support Policy (see above).
2. All TypeScript code will use this project's configuration
   files where possible.
3. Linting must be performed as part of `yarn test` for every node package.
4. All code is compiled with TypeScript's strictest settings enabled and
   any new strictness options are enabled with each TypeScript release.
5. Specific Lint rules ran are not covered here. The source of truth is
   the [`tslint.json`][tsconfig-file] file.
6. Avoid `any`. There are very few times it's necessary. We use
   the type `something` from `@opticss/util` to express very generic
   values without introducing the infectious semantics of `any`.
   Exceptions:
   a. [Type guards][type-guards] can accept an argument of type `any`.
   b. Callbacks whose return value is not consumed can have a declared
      return value of `any`.

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


[node-releases]: https://github.com/nodejs/Release
[tsconfig-file]: https://github.com/css-blocks/css-blocks/tree/master/packages/code-style/configs/tslint.json
[type-guards]: https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types
[ts-mocha]: https://www.npmjs.com/package/ts-mocha
[chai]: http://chaijs.com/api/assert/
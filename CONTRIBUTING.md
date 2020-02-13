Contribution Agreement
======================

As a contributor, you represent that the code you submit is your
original work or that of your employer (in which case you represent you
have the right to bind your employer).  By submitting code, you (and, if
applicable, your employer) are licensing the submitted code to LinkedIn
and the open source community subject to the BSD 2-Clause license. 

Getting Started
===============

Make sure you have `yarn` installed, if you don't then you can simply install it like so:

```
$ npm install -g yarn
```
Optionally you may install `lerna` the same way. Lerna is a tool that uses Yarn workspaces under the hood to manage monorepos like CSS Blocks uses.

Check out the code:

```
$ git clone https://github.com/linkedin/css-blocks.git
```

Go into the css-blocks directory and install any dependancies:

```
$ cd css-blocks
$ yarn
```
Running `yarn` in the root is all that is required to install the dependancies for _all_ of the sub-packages in the repo (and they are deduplicated and/or linked as required.

Optionally you can run the _compile_ script across all packages, this will
transpile the TypeScript files within each repo to JavaScript in their respective output locations.

You can do this with `lerna run compile` or `yarn workspaces run compile`. Either is fine.

The code for individual packages of the monorepo are in `packages/*`.
Within any of the packages in this monorepo you'll generally use the
package scripts to manage the project. Most, not all, packages have some common scripts:

```
yarn run start    // starts a test webapp in those packages that have one
yarn run test     // runs the tests for a projectscripts or
yarn run lint     // runs a linter on the code (usually eslint and tslint)
yarn run compile // compiles (if required) the package from TypeScript to JS
``` 

Run `yarn run` for a list of available commands in each project.

Running Existing Integrations
==================================================
How to play with CSS Blocks
---------------------------
The monorepo includes two projects that dog-food the Glimmer/Broccoli and JSX/Webpack integrations. To see CSS Blocks in action, see sample integrations, and get a feel for the developer experience, you can spin up these projects and take a peek under the hood.

### [@css-blocks/website][WEBSITE] (JSX/Webpack)
The public-facing website and hosted Typedoc API documentation hosted at [www.css-blocks.com][CSS_BLOCKS_WEBSITE]. Built as a React app and dog-foods our JSX/Webpack integrations. For instruction on how to start the developer server, please check out the [@css-blocks/website README][WEBSITE]. For details on the [JSX][JSX] and [Webpack][WEBPACK] integrations, please read their respective package READMEs.

### [@css-blocks/playground][PLAYGROUND] (Glimmer/Broccoli/Ember-CLI)
This demo application will allow users to play with CSS Blocks syntax and OptiCSS in-browser. Built as a Glimmer application and dog-foods our Glimmer, Ember CLI and Broccoli integrations. For instruction on how to start the developer server, please check out the [@css-blocks/playground README][PLAYGROUND]. For details on the [Glimmer][GLIMMER], [Broccoli][BROCCOLI] and [Ember-CLI][EMBER-CLI] integrations, please read their respective package READMEs.

Responsible Disclosure of Security Vulnerabilities
==================================================

**Do not file an issue on Github for security issues.**  Please review
the [guidelines for disclosure][disclosure_guidelines].  Reports should
be encrypted using PGP ([public key][pubkey]) and sent to
[security@linkedin.com][disclosure_email] preferably with the title
"Vulnerability in Github LinkedIn/css-blocks - &lt;short summary&gt;".

Tips for Getting Your Pull Request Accepted
===========================================

1. Make sure all new features are tested and the tests pass.
2. Bug fixes must include a test case demonstrating the error that it fixes.
3. Open an issue first and seek advice for your change before submitting
   a pull request. Large features which have never been discussed are
   unlikely to be accepted. **You have been warned.**

[disclosure_guidelines]: https://www.linkedin.com/help/linkedin/answer/62924
[pubkey]: https://www.linkedin.com/help/linkedin/answer/79676
[disclosure_email]: mailto:security@linkedin.com?subject=Vulnerability%20in%20Github%20LinkedIn/css-blocks%20-%20%3Csummary%3E
[WEBSITE]: ./packages/@css-blocks/website
[PLAYGROUND]: ./packages/@css-blocks/playground
[JSX]: ./packages/@css-blocks/jsx
[GLIMMER]: ./packages/@css-blocks/glimmer
[EMBER_CLI]: ./packages/@css-blocks/ember-cli
[WEBPACK]: ./packages/@css-blocks/webpack
[BROCCOLI]: ./packages/@css-blocks/broccoli
[CSS_BLOCKS_WEBSITE]: http://css-blocks.com

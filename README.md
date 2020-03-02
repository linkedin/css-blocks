<p align="center">
  <img alt="CSS Blocks" width="480px" src="http://css-blocks.com/static/media/wordmark-animated.012177e4.svg" />
</p>
<h2 align="center">Blazing fast CSS for your Design Systems and App Components </h2>

[![Build Status](https://travis-ci.org/linkedin/css-blocks.svg?branch=master)](https://travis-ci.com/linkedin/css-blocks) [![Greenkeeper badge](https://badges.greenkeeper.io/linkedin/css-blocks.svg)](https://greenkeeper.io/)

---

CSS Blocks is an ergonomic, component-oriented, style system that compiles to high-performance stylesheets.

It takes the technologies and best practices that developers already know and love and combines them with...

* Making CSS statically analyzable.
* Build-time analysis & rewriting of templates.
* A new type of CSS optimizer.

...all while building on concepts introduced in [CSS Modules](https://github.com/css-modules/css-modules), [BEM](http://getbem.com/), and [Atomic CSS](https://acss.io/) as an opinionated authoring system.

CSS Blocks is an ergonomic, component-oriented, CSS authoring system that is compiled to high-performance stylesheets.

> Looking to learn how to use CSS Blocks in your application? Check out our [Getting Started](#getting-started).

> Interested in contributing? Head over to our [Contributing Guide](./CONTRIBUTING.md) to learn how!

> For a deep-dive of CSS Blocks architecture, review the [CSS Blocks Architecture README](./documentation/architecture.md)!

# Why CSS Blocks?

With CSS Blocks added to your project, you receive:

- 💎 One CSS File Per Component
- 📦 Scoped Styles
- 🔎 Nearly Non-Existent Runtime (~500b)
- 🔥 Blazing Fast Stylesheets
- 🚀 Project-Wide Optimization
- 🚨 Build Time CSS Errors
- 🧟 Dead Code Elimination
- ✨ Object Oriented Inheritance

Possibly most importantly, CSS Blocks is **[Statically Analyzable](./documentation/static-analysis.md)**. This allows a level of optimization and instant feedback that is not been possible with normal CSS.

# Example

![CSS Blocks Example](https://user-images.githubusercontent.com/7856443/39090683-78ca1966-459a-11e8-8128-f50a9b2a1810.jpg)

# Getting Started

How to get started with CSS Blocks? The first step is working out what integration you need. We have several [Template & Build System integrations][INTEGRATIONS], each one will have more detailed documentation about it's particular process and requirements in its project folder.

In CSS Blocks each "block" is contained within its own file, e.g. `mycomponent.block.css`. Using [CSS Block Syntax][SYNTAX]--which is mostly just a strict subset of CSS--you then can style each template component by describing its states, themes, etc.

CSS Blocks then looks at your component's template and the Block File, parsing each, and it can then output the final CSS (or any errors it sees).

Again, more information is available within [each integration module][INTEGRATIONS] and to understand how to write a Block File please check out [What Is A Block File](./documentation/what-is-a-block.md) and our [syntax guide][SYNTAX].


# About this Repository

This repository is a mono-repo. While CSS Blocks composes many different published packages, all live here (learn more about mono-repos at the [lernajs.io](LERNA_WEBSITE) website).

We have 4 types of packages living within the repo:  

## Core Packages

All the key concerns of CSS Blocks – file parsing, logic, data structures, etc.  

* [@css-blocks/core][CORE]  
* [@css-blocks/runtime][RUNTIME]  
* [@css-blocks/code-style][RUNTIME]

## Template Integrations

These packages are responsible for understanding a templating syntax (Glimmer, JSX, etc). They allow you to work with CSS Blocks inside your templates.

* [@css-blocks/glimmer][GLIMMER]  
* [@css-blocks/jsx][JSX] (_very_ pre-release)  

## Build System Integrations

These are the modules that allow CSS Blocks to work anywhere! Every one exports a plugin in the form required for each system.

* [@css-blocks/ember-cli][EMBER_CLI]  
* [@css-blocks/broccoli][BROCCOLI]  
* [@css-blocks/webpack][WEBPACK] (_very_ pre-release)  

## Public Websites

Our public-facing website and a "playground" application & demo. The Playground allows you to experiment with CSS Blocks in the browser.

* [@css-blocks/website][WEBSITE]  
* [@css-blocks/playground][PLAYGROUND]


[CORE]: ./packages/@css-blocks/core
[RUNTIME]: ./packages/@css-blocks/runtime
[JSX]: ./packages/@css-blocks/jsx
[GLIMMER]: ./packages/@css-blocks/glimmer
[EMBER_CLI]: ./packages/@css-blocks/ember-cli
[WEBPACK]: ./packages/@css-blocks/webpack
[BROCCOLI]: ./packages/@css-blocks/broccoli
[WEBSITE]: ./packages/@css-blocks/website
[PLAYGROUND]: ./packages/@css-blocks/playground
[SYNTAX]: ./documentation/syntax.md
[INTEGRATIONS]: ./documentation/integrations.md

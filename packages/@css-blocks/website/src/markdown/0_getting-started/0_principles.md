---
name: Framework Principles
title: What is CSS Blocks?
---

CSS Blocks analyzes both your stylesheets, and your application templates, to rewrite your human-readable styles to
machine optimized Atomic CSS in production.

When added to your project, you also receive a slew of developer ergonomics benefits:

 - 💎 One CSS File Per Component
 - 📦 Fully Scoped Styles
 - 🔎 Nearly Non-Existent Runtime (~320 bytes)
 - 🔥 Blazing Fast Stylesheets
 - 🚀 Project-Wide Optimization
 - 🚨 Build Time CSS Errors
 - 🧟 Dead Code Elimination
 - ✨ Object Oriented Inheritance

So lets talk about what makes this all possible. Unlike other CSS frameworks, CSS Blocks is **⚡️Statically Analyzable**.

## The ⚡️ of Static Analysis
Static analysis means CSS Blocks can look at your project and know with *certainty* that any given CSS declaration _will_, _will not_, or _might_ under certain conditions, be used on any given element in your templates.

Most stylesheet architectures have to walk a fine line between performance and
maintainability. Tilt too far in either direction and either your users or the developers
will end up paying the cost. With CSS Blocks, you can focus on making sure your
stylesheets are easy to maintain as your application changes, and with our
CSS optimizer, [OptiCSS](https://github.com/linkedin/opticss), the small size of your
app's production stylesheets after compression will amaze you.

It is because of Static Analysis that CSS Blocks is able to discover a subtle typo that caused a selector to not match: CSS Blocks will give you a build error and suggest possible fixes. Static analysis enables IDE integration: projects using CSS Blocks will be able to quickly navigate to selector definitions that match your current template element and find which template elements match your current selector, autocomplete class names. And because of Static Analysis CSS Blocks' new resolution system, potential cascade conflicts will be caught for you before you even know they exist: you will never have to fight a selector specificity war in your application ever again.

<!-- ![CSS Blocks Example](https://user-images.githubusercontent.com/7856443/39090683-78ca1966-459a-11e8-8128-f50a9b2a1810.jpg) -->

> CSS Blocks is inspired by [CSS Modules](https://github.com/css-modules/css-modules), [BEM](http://getbem.com/) and [Atomic CSS](https://acss.io/)
>
> For a full deep-dive of the project architecture, I heavily recommend you review the [CSS Blocks Architecture README](./ARCHITECTURE.md)!
